export function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

export function findMemoryMatch(
  normalizedDesc: string,
  memoryEntries: Array<{ normalizedDesc: string; categoryId: string }>
): string | null {
  // 1. Exact match
  const exact = memoryEntries.find((e) => e.normalizedDesc === normalizedDesc)
  if (exact) return exact.categoryId

  // 2. Levenshtein fallback — accept best if ratio >= 0.85
  let bestRatio = 0
  let bestCategoryId: string | null = null
  for (const entry of memoryEntries) {
    const ratio = similarityRatio(normalizedDesc, entry.normalizedDesc)
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestCategoryId = entry.categoryId
    }
  }
  return bestRatio >= 0.85 ? bestCategoryId : null
}
