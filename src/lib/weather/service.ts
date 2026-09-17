import 'server-only'
import { fullWeatherGroups, FullObservation } from './full-schema'

// Port of weather-app/src/tablet_weather.py. All provider access stays here.
type Observation = {
  observed_at: number
  temperature_f: number | null
  wind_mph: number | null
  wind_direction: string | null
  raining: boolean | null
  rain_today_in: number | null
  rain_yesterday_in: number | null
  lightning_last_epoch: number | null
  lightning_distance_miles: number | null
  lightning_count_3hr: number | null
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function convert(value: unknown, multiplier: number, offset = 0) {
  const numeric = number(value)
  return numeric === null
    ? null
    : Math.round((numeric * multiplier + offset) * 100) / 100
}

export function normalize(payload: unknown): Observation {
  if (!record(payload)) throw new Error('Invalid observation')
  const status = payload.status ?? {}
  if (!record(status) || (status.status_code ?? 0) !== 0) {
    throw new Error('Weather provider unavailable')
  }
  const obs = Array.isArray(payload.obs) ? payload.obs[0] : null
  if (!record(obs) || !number(obs.timestamp))
    throw new Error('Invalid observation')
  const direction = number(obs.wind_direction)
  const compass = 'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split(
    ' '
  )
  const rain = number(obs.precip)
  const lastStrike = number(obs.lightning_strike_last_epoch)
  return {
    observed_at: obs.timestamp as number,
    temperature_f: convert(obs.air_temperature, 1.8, 32),
    wind_mph: convert(obs.wind_avg, 2.2369362921),
    wind_direction:
      direction === null
        ? null
        : compass[
            Math.floor(((((direction % 360) + 360) % 360) + 11.25) / 22.5) % 16
          ],
    raining: rain === null ? null : rain > 0,
    // Daily accumulations, additive to the original contract: the tablet ignores
    // them and the landscape page shows yesterday alongside today.
    rain_today_in: convert(obs.precip_accum_local_day, 1 / 25.4),
    rain_yesterday_in: convert(obs.precip_accum_local_yesterday, 1 / 25.4),
    lightning_last_epoch: lastStrike,
    lightning_distance_miles:
      lastStrike !== null && lastStrike > 0
        ? convert(obs.lightning_strike_last_distance, 0.6213711922)
        : null,
    lightning_count_3hr: number(obs.lightning_strike_count_last_3hr),
  }
}

export function normalizeFull(payload: unknown): FullObservation {
  const summary = normalize(payload)
  const obs = (payload as { obs: Record<string, unknown>[] }).obs[0]
  return {
    observed_at: summary.observed_at,
    groups: fullWeatherGroups.map((group) => ({
      id: group.id,
      metrics: group.metrics.map((spec) => {
        const raw = obs[spec.key]
        let value: number | string | null = number(raw)
        if (spec.format === 'trend') {
          value =
            raw === 'rising'
              ? 'Rising'
              : raw === 'falling'
                ? 'Falling'
                : raw === 'steady'
                  ? 'Steady'
                  : null
        } else if (typeof value === 'number') {
          value = value * (spec.multiplier ?? 1) + (spec.offset ?? 0)
          if (!Number.isFinite(value)) value = null
        }
        if (
          spec.key === 'lightning_strike_last_distance' &&
          (!summary.lightning_last_epoch || summary.lightning_last_epoch <= 0)
        )
          value = null
        return { key: spec.key, value }
      }),
    })),
  }
}

export function stationUrl(
  env: Record<string, string | undefined> = process.env
): URL {
  const token = env.WEATHERFLOW_TOKEN
  const stationId = env.WEATHERFLOW_STATION_ID
  if (!token || !stationId || !/^\d+$/.test(stationId)) {
    throw new Error('Weather station is not configured')
  }
  const url = new URL(
    // The latest-station endpoint returns named fields and lightning summaries.
    // /observations/stn/ returns indexed time-series arrays instead.
    'https://swd.weatherflow.com/swd/rest/observations/station/' + stationId
  )
  url.search = new URLSearchParams({
    token,
    units_temp: 'c',
    units_wind: 'mps',
    units_pressure: 'mb',
    units_precip: 'mm',
    units_distance: 'km',
  }).toString()
  return url
}

export async function fetchObservation(): Promise<unknown> {
  const controller = new AbortController()
  // Bounds the whole request, including reading/parsing the response body.
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(stationUrl(), {
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

export class WeatherService {
  private cached: Observation | null = null
  private cachedFull: FullObservation | null = null
  private lastAttempt: number | null = null
  private failed = false
  private pending: Promise<void> | null = null

  constructor(
    private fetcher: () => Promise<unknown> = fetchObservation,
    private clock: () => number = () => Date.now() / 1000
  ) {}

  async get() {
    const now = this.clock()
    if (
      !this.pending &&
      (this.lastAttempt === null || now - this.lastAttempt >= 5)
    ) {
      this.lastAttempt = now
      this.pending = Promise.resolve().then(() => this.update())
    }
    // Share a single upstream request across simultaneous tablet polls.
    if (this.pending) await this.pending
    if (this.cached === null) {
      return {
        data: { error: 'Weather unavailable. Retrying automatically.' },
        status: 503,
      }
    }
    return {
      data: {
        ...this.cached,
        stale: this.failed || this.clock() - this.cached.observed_at > 300,
      },
      status: 200,
    }
  }

  async getFull() {
    await this.get()
    if (this.cachedFull === null) {
      return {
        data: { error: 'Weather unavailable. Retrying automatically.' },
        status: 503,
      }
    }
    return {
      data: {
        ...this.cachedFull,
        stale: this.failed || this.clock() - this.cachedFull.observed_at > 300,
      },
      status: 200,
    }
  }

  private async update() {
    try {
      const payload = await this.fetcher()
      const summary = normalize(payload)
      const full = normalizeFull(payload)
      this.cached = summary
      this.cachedFull = full
      this.failed = false
    } catch {
      // Do not return or log exceptions: provider URLs can contain credentials.
      this.failed = true
    } finally {
      this.pending = null
    }
  }
}

// Per warm Node/serverless instance, matching the original process-local cache.
export const weatherService = new WeatherService()
