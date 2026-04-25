'use client'

type Props = { amount: number }

export function AmountCell({ amount }: Props) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Math.abs(amount))

  return (
    <span className={amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
      {amount >= 0 ? '+' : '-'}
      {formatted}
    </span>
  )
}
