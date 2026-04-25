import { anthropic } from './client'
import type { Category } from '@/lib/types'

type TransactionInput = {
  index: number
  date: string
  description: string
  amount: number
}

const CHUNK_SIZE = 50

export async function categorizeTransactions(
  transactions: TransactionInput[],
  categories: Category[]
): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  if (transactions.length === 0) return result

  const categoryNames = categories.map((c) => `${c.name} (${c.kind})`).join('\n')

  for (let i = 0; i < transactions.length; i += CHUNK_SIZE) {
    const chunk = transactions.slice(i, i + CHUNK_SIZE)
    const txList = chunk
      .map((t) => `${t.index}. [${t.date}] ${t.description} | amount: ${t.amount}`)
      .join('\n')

    let responseText = ''
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a bookkeeping assistant. Classify each transaction into exactly one category from the list below.
Return ONLY a JSON array with no extra text: [{"index": N, "category": "Name"}, ...]
Use only category names from the list. If uncertain, use "Uncategorized".

Categories:
${categoryNames}

Transactions:
${txList}`,
          },
        ],
      })
      const block = msg.content[0]
      if (block.type === 'text') responseText = block.text
    } catch {
      // On failure leave chunk entries unmapped — they become Uncategorized
      continue
    }

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) continue
      const parsed: { index: number; category: string }[] = JSON.parse(jsonMatch[0])
      const validNames = new Set(categories.map((c) => c.name))
      for (const item of parsed) {
        const cat = validNames.has(item.category) ? item.category : 'Uncategorized'
        result.set(item.index, cat)
      }
    } catch {
      continue
    }
  }

  return result
}
