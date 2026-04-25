import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Category } from '@/lib/types'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

type TxInput = { index: number; date: string; description: string; amount: number }

// ─────────────────────────────────────────────────────────────────────────────
// Response parser — shared across all providers
// ─────────────────────────────────────────────────────────────────────────────

function parseResponse(text: string, categories: Category[]): Map<number, string> {
  const result = new Map<number, string>()
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return result
    const parsed: { index: number; category: string }[] = JSON.parse(jsonMatch[0])
    const validNames = new Set(categories.map((c) => c.name))
    for (const item of parsed) {
      result.set(item.index, validNames.has(item.category) ? item.category : 'Uncategorized')
    }
  } catch {
    /* leave empty — caller treats unmapped rows as Uncategorized */
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────────────────────

async function callAnthropic(
  chunk: TxInput[],
  categories: Category[]
): Promise<Map<number, string>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(chunk, categories) }],
  })
  const block = msg.content[0]
  return parseResponse(block.type === 'text' ? block.text : '', categories)
}

function makeOpenAIClient(baseURL?: string, apiKey?: string) {
  return new OpenAI({ apiKey: apiKey ?? 'placeholder', baseURL })
}

async function callOpenAICompat(
  chunk: TxInput[],
  categories: Category[],
  client: OpenAI,
  model: string
): Promise<Map<number, string>> {
  const msg = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(chunk, categories) },
    ],
  })
  return parseResponse(msg.choices[0]?.message?.content ?? '', categories)
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider chain — auto-built from available env keys
// Priority: Anthropic → OpenAI → Qwen → GLM → Minimax
// ─────────────────────────────────────────────────────────────────────────────

type ProviderDef = {
  name: string
  call: (chunk: TxInput[], categories: Category[]) => Promise<Map<number, string>>
}

function buildProviderChain(): ProviderDef[] {
  const chain: ProviderDef[] = []

  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({ name: 'Anthropic', call: callAnthropic })
  }
  if (process.env.OPENAI_API_KEY) {
    const client = makeOpenAIClient(undefined, process.env.OPENAI_API_KEY)
    chain.push({ name: 'OpenAI', call: (c, cats) => callOpenAICompat(c, cats, client, 'gpt-4o-mini') })
  }
  if (process.env.QWEN_API_KEY) {
    const client = makeOpenAIClient('https://dashscope.aliyuncs.com/compatible-mode/v1', process.env.QWEN_API_KEY)
    chain.push({ name: 'Qwen', call: (c, cats) => callOpenAICompat(c, cats, client, 'qwen-turbo') })
  }
  if (process.env.GLM_API_KEY) {
    const client = makeOpenAIClient('https://open.bigmodel.cn/api/paas/v4/', process.env.GLM_API_KEY)
    chain.push({ name: 'GLM', call: (c, cats) => callOpenAICompat(c, cats, client, 'glm-4-flash') })
  }
  if (process.env.MINIMAX_API_KEY) {
    const client = makeOpenAIClient('https://api.minimax.chat/v1', process.env.MINIMAX_API_KEY)
    chain.push({ name: 'Minimax', call: (c, cats) => callOpenAICompat(c, cats, client, 'MiniMax-Text-01') })
  }

  return chain
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — tries each provider in order, falls back on failure
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 50

export async function categorizeWithFallback(
  transactions: TxInput[],
  categories: Category[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  if (transactions.length === 0) return result

  const providers = buildProviderChain()
  if (providers.length === 0) {
    console.warn('[AI] No API keys configured — transactions will be Uncategorized')
    return result
  }

  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE)
    let chunkResult: Map<number, string> | null = null

    for (const provider of providers) {
      try {
        chunkResult = await provider.call(chunk, categories)
        break
      } catch (err) {
        console.error(`[AI] Provider ${provider.name} failed, trying next:`, (err as Error).message)
      }
    }

    if (chunkResult) {
      for (const [idx, cat] of chunkResult.entries()) {
        result.set(idx, cat)
      }
    }
  }

  return result
}
