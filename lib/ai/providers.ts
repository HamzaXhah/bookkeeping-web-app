import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Category } from '@/lib/types'

type TxInput = { index: number; date: string; description: string; amount: number }

const PROMPT_SYSTEM = `You are a bookkeeping assistant. Classify each transaction into exactly one category from the list provided.
Return ONLY a JSON array with no extra text or markdown: [{"index": N, "category": "Name"}, ...]
Use only the exact category names from the list. If uncertain, use "Uncategorized".`

function buildUserMessage(transactions: TxInput[], categories: Category[]): string {
  const catList = categories.map((c) => `- ${c.name} (${c.kind})`).join('\n')
  const txList = transactions
    .map((t) => `${t.index}. [${t.date}] ${t.description} | ${t.amount > 0 ? '+' : ''}${t.amount}`)
    .join('\n')
  return `Categories:\n${catList}\n\nTransactions:\n${txList}`
}

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

async function callAnthropic(
  chunk: TxInput[],
  categories: Category[]
): Promise<Map<number, string>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: PROMPT_SYSTEM,
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
    max_tokens: 1024,
    messages: [
      { role: 'system', content: PROMPT_SYSTEM },
      { role: 'user', content: buildUserMessage(chunk, categories) },
    ],
  })
  return parseResponse(msg.choices[0]?.message?.content ?? '', categories)
}

type ProviderDef = {
  name: string
  envKey: string
  call: (chunk: TxInput[], categories: Category[]) => Promise<Map<number, string>>
}

function buildProviderChain(): ProviderDef[] {
  const chain: ProviderDef[] = []

  if (process.env.ANTHROPIC_API_KEY) {
    chain.push({ name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY', call: callAnthropic })
  }
  if (process.env.OPENAI_API_KEY) {
    const client = makeOpenAIClient(undefined, process.env.OPENAI_API_KEY)
    chain.push({
      name: 'OpenAI',
      envKey: 'OPENAI_API_KEY',
      call: (c, cats) => callOpenAICompat(c, cats, client, 'gpt-4o-mini'),
    })
  }
  if (process.env.QWEN_API_KEY) {
    const client = makeOpenAIClient(
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
      process.env.QWEN_API_KEY
    )
    chain.push({
      name: 'Qwen',
      envKey: 'QWEN_API_KEY',
      call: (c, cats) => callOpenAICompat(c, cats, client, 'qwen-turbo'),
    })
  }
  if (process.env.GLM_API_KEY) {
    const client = makeOpenAIClient(
      'https://open.bigmodel.cn/api/paas/v4/',
      process.env.GLM_API_KEY
    )
    chain.push({
      name: 'GLM',
      envKey: 'GLM_API_KEY',
      call: (c, cats) => callOpenAICompat(c, cats, client, 'glm-4-flash'),
    })
  }
  if (process.env.MINIMAX_API_KEY) {
    const client = makeOpenAIClient('https://api.minimax.chat/v1', process.env.MINIMAX_API_KEY)
    chain.push({
      name: 'Minimax',
      envKey: 'MINIMAX_API_KEY',
      call: (c, cats) => callOpenAICompat(c, cats, client, 'MiniMax-Text-01'),
    })
  }

  return chain
}

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
        break // success
      } catch (err) {
        console.error(`[AI] Provider ${provider.name} failed, trying next:`, (err as Error).message)
      }
    }

    if (chunkResult) {
      for (const [idx, cat] of chunkResult.entries()) {
        result.set(idx, cat)
      }
    }
    // If all providers failed, chunk rows stay unmapped → Uncategorized
  }

  return result
}
