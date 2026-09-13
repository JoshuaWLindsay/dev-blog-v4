import { weatherHtml } from '@/lib/weather/page'

export const dynamic = 'force-static'

export function GET() {
  return new Response(weatherHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
