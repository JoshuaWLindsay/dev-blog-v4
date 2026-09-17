import { landscapeHtml } from '@/lib/weather/landscape-page'

export const dynamic = 'force-static'

export function GET() {
  return new Response(landscapeHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
