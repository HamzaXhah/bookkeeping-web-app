import { NextResponse } from 'next/server'
import { checkProviderHealth } from '@/lib/ai/providers'

export async function GET() {
  const statuses = await checkProviderHealth()
  return NextResponse.json({ providers: statuses })
}
