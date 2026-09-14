import { fullWeatherHtml } from '@/lib/weather/full-page'

export const dynamic = 'force-static'

export function GET() {
  return new Response(fullWeatherHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
