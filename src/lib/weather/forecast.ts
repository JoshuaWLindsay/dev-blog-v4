import 'server-only'

// Tempest's own app reads daily forecasts from better_forecast. The station's
// existing token and ID cover it; no second provider or credential is involved.
export type ForecastDay = {
  day_start_local: number
  weekday: string
  low_f: number | null
  high_f: number | null
  precip_percent: number | null
}

export type Forecast = {
  issued_at: number
  days: ForecastDay[]
}

// Saturday and Sunday deliberately share "S", as the original display did.
const weekdays = ['S', 'M', 'T', 'W', 'Th', 'F', 'S']

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function fahrenheit(value: unknown): number | null {
  const celsius = number(value)
  return celsius === null ? null : Math.round(celsius * 1.8 + 32)
}

function percent(value: unknown): number | null {
  const raw = number(value)
  return raw === null ? null : Math.min(100, Math.max(0, Math.round(raw)))
}

export function forecastUrl(
  env: Record<string, string | undefined> = process.env
): URL {
  const token = env.WEATHERFLOW_TOKEN
  const stationId = env.WEATHERFLOW_STATION_ID
  if (!token || !stationId || !/^\d+$/.test(stationId)) {
    throw new Error('Weather station is not configured')
  }
  const url = new URL('https://swd.weatherflow.com/swd/rest/better_forecast')
  url.search = new URLSearchParams({
    station_id: stationId,
    token,
    units_temp: 'c',
    units_wind: 'mps',
    units_pressure: 'mb',
    units_precip: 'mm',
    units_distance: 'km',
  }).toString()
  return url
}

export function normalizeForecast(
  payload: unknown,
  now = Date.now() / 1000
): Forecast {
  if (!record(payload)) throw new Error('Invalid forecast')
  const status = payload.status ?? {}
  if (!record(status) || (status.status_code ?? 0) !== 0) {
    throw new Error('Weather provider unavailable')
  }
  const forecast = record(payload.forecast) ? payload.forecast : null
  const daily = forecast && Array.isArray(forecast.daily) ? forecast.daily : []
  // day_start_local is local midnight, so the station's own offset names the day.
  const offset = number(payload.timezone_offset_minutes) ?? 0
  const days: ForecastDay[] = []
  for (const entry of daily) {
    if (days.length === 7) break
    if (!record(entry)) continue
    const start = number(entry.day_start_local)
    if (start === null) continue
    days.push({
      day_start_local: start,
      weekday:
        weekdays[new Date((start + offset * 60) * 1000).getUTCDay()] ?? '--',
      low_f: fahrenheit(entry.air_temp_low),
      high_f: fahrenheit(entry.air_temp_high),
      precip_percent: percent(entry.precip_probability),
    })
  }
  if (days.length === 0) throw new Error('Invalid forecast')
  return { issued_at: Math.floor(now), days }
}

export async function fetchForecast(): Promise<unknown> {
  const controller = new AbortController()
  // Bounds the whole request, including reading/parsing the response body.
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(forecastUrl(), {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    })
    if (!response.ok) throw new Error('Weather provider unavailable')
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export class ForecastService {
  private cached: Forecast | null = null
  private lastAttempt: number | null = null
  private failed = false
  private pending: Promise<void> | null = null

  constructor(
    private fetcher: () => Promise<unknown> = fetchForecast,
    private clock: () => number = () => Date.now() / 1000
  ) {}

  async get() {
    const now = this.clock()
    // A daily forecast does not change per tablet poll; refresh every 10 minutes.
    if (
      !this.pending &&
      (this.lastAttempt === null || now - this.lastAttempt >= 600)
    ) {
      this.lastAttempt = now
      this.pending = Promise.resolve().then(() => this.update())
    }
    if (this.pending) await this.pending
    if (this.cached === null) {
      return {
        data: { error: 'Forecast unavailable. Retrying automatically.' },
        status: 503,
      }
    }
    return {
      data: {
        ...this.cached,
        // A forecast stays useful far longer than an observation does.
        stale: this.failed || this.clock() - this.cached.issued_at > 7200,
      },
      status: 200,
    }
  }

  private async update() {
    try {
      this.cached = normalizeForecast(await this.fetcher(), this.clock())
      this.failed = false
    } catch {
      // Do not return or log exceptions: provider URLs can contain credentials.
      this.failed = true
    } finally {
      this.pending = null
    }
  }
}

// Per warm Node/serverless instance, matching the observation cache.
export const forecastService = new ForecastService()
