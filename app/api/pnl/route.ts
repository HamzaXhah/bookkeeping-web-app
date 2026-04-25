import { NextResponse } from 'next/server'
import { aggregatePnL } from '@/lib/pnl/aggregate'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!businessId || !from || !to) {
    return NextResponse.json({ error: 'businessId, from, and to are required' }, { status: 400 })
  }

  const report = await aggregatePnL(businessId, from, to)
  return NextResponse.json(report)
}
