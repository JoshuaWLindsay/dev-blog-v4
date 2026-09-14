import { rapidWindService } from '@/lib/weather/rapid-wind'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const { data, status } = await rapidWindService.get()
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
