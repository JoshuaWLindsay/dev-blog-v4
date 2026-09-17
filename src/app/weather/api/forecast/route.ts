import { forecastService } from '@/lib/weather/forecast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const { data, status } = await forecastService.get()
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}
