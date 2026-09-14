import 'server-only'
import { stationUrl } from './service'

export type RapidWind = {
  observed_at: number
  wind_mph: number
  wind_direction: string | null
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function windDevice(payload: unknown, stationId: number): number {
  if (
    !record(payload) ||
    !record(payload.status) ||
    payload.status.status_code !== 0
  ) {
    throw new Error('Wind unavailable')
  }
  const stations = Array.isArray(payload.stations) ? payload.stations : []
  const station = stations.find((s) => record(s) && s.station_id === stationId)
  const devices: unknown[] =
    record(station) && Array.isArray(station.devices) ? station.devices : []
  const active = devices.filter(
    (d) =>
      record(d) &&
      (d.device_type === 'ST' || d.device_type === 'SK') &&
      typeof d.serial_number === 'string' &&
      d.serial_number.length > 0 &&
      Number.isSafeInteger(d.device_id) &&
      Number(d.device_id) > 0
  ) as Record<string, unknown>[]
  const items: unknown[] =
    record(station) && Array.isArray(station.station_items)
      ? station.station_items
      : []
  const wind = items.find((item) => record(item) && item.item === 'wind')
  const selected = record(wind)
    ? active.find((d) => d.device_id === wind.device_id)
    : active.length === 1
      ? active[0]
      : undefined
  if (!selected) throw new Error('Wind unavailable')
  return selected.device_id as number
}

export function normalizeRapidWind(
  payload: unknown,
  deviceId: number,
  now = Date.now() / 1000
): RapidWind | null {
  if (
    !record(payload) ||
    payload.type !== 'rapid_wind' ||
    payload.device_id !== deviceId ||
    !Array.isArray(payload.ob)
  )
    return null
  const [epoch, speed, direction] = payload.ob
  if (
    !finite(epoch) ||
    epoch <= 0 ||
    now - epoch > 15 ||
    epoch - now > 5 ||
    !finite(speed) ||
    speed < 0 ||
    speed > 150
  )
    return null
  const compass = 'N NNE NE ENE E ESE SE SSE S SSW SW WSW W WNW NW NNW'.split(
    ' '
  )
  return {
    observed_at: epoch,
    wind_mph: Math.round(speed * 2.2369362921 * 100) / 100,
    wind_direction:
      finite(direction) && direction >= 0 && direction <= 360
        ? compass[Math.floor((direction + 11.25) / 22.5) % 16]
        : null,
  }
}

let deviceCache: { key: string; id: number; expires: number } | undefined
async function configuredDevice(): Promise<{ token: string; id: number }> {
  const observationUrl = stationUrl()
  const token = observationUrl.searchParams.get('token')!
  const stationId = Number(process.env.WEATHERFLOW_STATION_ID)
  const key = stationId + ':' + token
  if (deviceCache?.key === key && deviceCache.expires > Date.now())
    return { token, id: deviceCache.id }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const url = new URL(
      'https://swd.weatherflow.com/swd/rest/stations/' + stationId
    )
    url.searchParams.set('token', token)
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    })
    if (!response.ok) throw new Error('Wind unavailable')
    const id = windDevice(await response.json(), stationId)
    deviceCache = { key, id, expires: Date.now() + 3600000 }
    return { token, id }
  } finally {
    clearTimeout(timer)
  }
}

// Each request owns a bounded outbound connection. No background socket is left
// running after a serverless response; credentials never reach the browser.
export function readRapidWind(
  token: string,
  deviceId: number,
  connect = (url: string) => new WebSocket(url)
): Promise<RapidWind> {
  return new Promise((resolve, reject) => {
    const url = new URL('wss://ws.weatherflow.com/swd/data')
    url.searchParams.set('token', token)
    let socket: WebSocket
    let finished = false
    function finish(value?: RapidWind) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try {
        socket?.close()
      } catch {
        /* Never log provider errors or token-bearing URLs. */
      }
      if (value) resolve(value)
      else reject(new Error('Wind unavailable'))
    }
    const timer = setTimeout(() => finish(), 8000)
    try {
      socket = connect(url.toString())
      socket.onopen = () => {
        if (finished) return
        try {
          socket.send(
            JSON.stringify({
              type: 'listen_rapid_start',
              device_id: deviceId,
              id: 'weather-rapid',
            })
          )
        } catch {
          finish()
        }
      }
      socket.onmessage = (event) => {
        if (finished) return
        try {
          const reading = normalizeRapidWind(
            JSON.parse(String(event.data)),
            deviceId
          )
          if (reading) finish(reading)
        } catch {
          /* Ignore acknowledgement, unrelated or malformed frames. */
        }
      }
      socket.onerror = socket.onclose = () => finish()
    } catch {
      finish()
    }
  })
}

async function fetchRapidWind() {
  const { token, id } = await configuredDevice()
  return readRapidWind(token, id)
}

export class RapidWindService {
  private pending: Promise<RapidWind | null> | null = null
  private cached: RapidWind | null = null
  private attemptedAt: number | null = null
  constructor(
    private fetcher = fetchRapidWind,
    private clock = () => Date.now() / 1000
  ) {}
  async get() {
    const now = this.clock()
    if (
      !this.pending &&
      (this.attemptedAt === null || now - this.attemptedAt >= 5)
    ) {
      this.attemptedAt = now
      this.pending = Promise.resolve()
        .then(this.fetcher)
        .then((value) => {
          this.cached = value
          return value
        })
        .catch(() => {
          this.cached = null
          return null
        })
        .finally(() => {
          this.pending = null
        })
    }
    if (this.pending) await this.pending
    const data = this.cached
    if (
      !data ||
      this.clock() - data.observed_at > 15 ||
      data.observed_at - this.clock() > 5
    ) {
      return {
        status: 503,
        data: { error: 'Live wind unavailable. Retrying automatically.' },
      }
    }
    return { status: 200, data }
  }
}
export const rapidWindService = new RapidWindService()
