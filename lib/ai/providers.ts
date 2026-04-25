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

// Heuristic: detect when a key looks like an OpenRouter key (sk-or-v1-...)
function looksLikeOpenRouter(key: string | undefined): boolean {
  return !!key && key.startsWith('sk-or-')
}

export function buildProviderChain(): ProviderDef[] {
  const chain: ProviderDef[] = []

  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({ name: 'Anthropic', call: callAnthropic })
  }
  if (process.env.OPENAI_API_KEY) {
    const client = makeOpenAIClient(undefined, process.env.OPENAI_API_KEY)
    chain.push({ name: 'OpenAI', call: (c, cats) => callOpenAICompat(c, cats, client, 'gpt-4o-mini') })
  }
  if (process.env.OPENROUTER_API_KEY) {
    const client = makeOpenAIClient('https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY)
    chain.push({
      name: 'OpenRouter',
      call: (c, cats) =>
        callOpenAICompat(
          c,
          cats,
          client,
          process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
        ),
    })
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
    // Auto-detect: a key with sk-or- prefix is an OpenRouter key, not Minimax.
    if (looksLikeOpenRouter(process.env.MINIMAX_API_KEY)) {
      const client = makeOpenAIClient('https://openrouter.ai/api/v1', process.env.MINIMAX_API_KEY)
      chain.push({
        name: 'OpenRouter (via MINIMAX_API_KEY)',
        call: (c, cats) =>
          callOpenAICompat(
            c,
            cats,
            client,
            process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
          ),
      })
    } else {
      const client = makeOpenAIClient('https://api.minimax.chat/v1', process.env.MINIMAX_API_KEY)
      chain.push({ name: 'Minimax', call: (c, cats) => callOpenAICompat(c, cats, client, 'MiniMax-Text-01') })
    }
  }

  return chain
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check — pings each configured provider with a tiny request
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderStatus = {
  name: string
  ok: boolean
  error?: string
  latencyMs?: number
}

export async function checkProviderHealth(): Promise<ProviderStatus[]> {
  const providers = buildProviderChain()
  if (providers.length === 0) return []

  // A trivial request to validate auth & connectivity. We use a 1-row
  // categorize call so the actual model + endpoint is exercised.
  const probeTx = [{ index: 0, date: '2026-01-01', description: 'TEST', amount: -1 }]
  const probeCats: Category[] = [
    { id: 'p', businessId: 'p', name: 'Software', kind: 'expense' },
  ]

  return Promise.all(
    providers.map(async (p) => {
      const t0 = Date.now()
      try {
        await p.call(probeTx, probeCats)
        return { name: p.name, ok: true, latencyMs: Date.now() - t0 }
      } catch (err) {
        return {
          name: p.name,
          ok: false,
          error: (err as Error).message?.slice(0, 200) ?? 'unknown error',
          latencyMs: Date.now() - t0,
        }
      }
    })
  )
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
