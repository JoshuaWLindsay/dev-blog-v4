jest.mock('server-only', () => ({}), { virtual: true })

import {
  ForecastService,
  forecastUrl,
  normalizeForecast,
} from '../../src/lib/weather/forecast'

// 2026-09-14 00:00 local in US Central (UTC-5), the Monday in the design.
const monday = Date.parse('2026-09-14T05:00:00Z') / 1000
const day = 86400

function daily(index: number, changes: Record<string, unknown> = {}) {
  return {
    day_start_local: monday + index * day,
    air_temp_low: 23.3,
    air_temp_high: 39.4,
    precip_probability: 10,
    ...changes,
  }
}

function sample(changes: Record<string, unknown> = {}) {
  return {
    status: { status_code: 0 },
    timezone_offset_minutes: -300,
    forecast: {
      daily: [0, 1, 2, 3, 4, 5, 6].map((index) => daily(index)),
    },
    ...changes,
  }
}

test('converts to whole Fahrenheit and names each weekday from the station offset', () => {
  const { days } = normalizeForecast(sample(), monday)
  expect(days).toHaveLength(7)
  expect(days.map((d) => d.weekday)).toEqual([
    'M',
    'T',
    'W',
    'Th',
    'F',
    'S',
    'S',
  ])
  expect(days[0]).toEqual({
    day_start_local: monday,
    weekday: 'M',
    low_f: 74,
    high_f: 103,
    precip_percent: 10,
  })
})

test('keeps at most seven days and clamps the chance of rain', () => {
  const payload = sample({
    forecast: { daily: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => daily(i)) },
  })
  expect(normalizeForecast(payload, monday).days).toHaveLength(7)
  const clamped = normalizeForecast(
    sample({
      forecast: {
        daily: [
          daily(0, { precip_probability: 140 }),
          daily(1, { precip_probability: -5 }),
        ],
      },
    }),
    monday
  ).days
  expect(clamped.map((d) => d.precip_percent)).toEqual([100, 0])
})

test('missing values stay null rather than becoming zeroes', () => {
  const { days } = normalizeForecast(
    sample({
      forecast: {
        daily: [{ day_start_local: monday }, daily(1, { air_temp_low: null })],
      },
    }),
    monday
  )
  expect(days[0]).toMatchObject({
    low_f: null,
    high_f: null,
    precip_percent: null,
  })
  expect(days[1]).toMatchObject({ low_f: null, high_f: 103 })
})

test('rejects provider errors and forecasts with no usable day', () => {
  expect(() => normalizeForecast({ status: { status_code: 1 } })).toThrow()
  expect(() => normalizeForecast(sample({ forecast: { daily: [] } }))).toThrow()
  expect(() => normalizeForecast(sample({ forecast: {} }))).toThrow()
  expect(() => normalizeForecast('not an object')).toThrow()
})

test('requests better_forecast with the station credentials and refuses partial configuration', () => {
  const url = forecastUrl({
    WEATHERFLOW_TOKEN: 'secret',
    WEATHERFLOW_STATION_ID: '42',
  })
  expect(url.origin + url.pathname).toBe(
    'https://swd.weatherflow.com/swd/rest/better_forecast'
  )
  expect(url.searchParams.get('station_id')).toBe('42')
  expect(url.searchParams.get('token')).toBe('secret')
  expect(url.searchParams.get('units_temp')).toBe('c')
  expect(() => forecastUrl({ WEATHERFLOW_TOKEN: 'secret' })).toThrow()
  expect(() =>
    forecastUrl({ WEATHERFLOW_TOKEN: 'secret', WEATHERFLOW_STATION_ID: 'abc' })
  ).toThrow()
})

test('refreshes every ten minutes and shares one request across polls', async () => {
  let now = 1000
  const fetcher = jest.fn().mockResolvedValue(sample())
  const service = new ForecastService(fetcher, () => now)
  await Promise.all([service.get(), service.get(), service.get()])
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 599
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 1
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(2)
})

test('a failed refresh keeps the previous forecast and a cold start reports 503', async () => {
  let now = 1000
  const fetcher = jest.fn().mockResolvedValue(sample())
  const service = new ForecastService(fetcher, () => now)
  expect((await service.get()).status).toBe(200)
  fetcher.mockRejectedValue(new Error('provider down'))
  now += 600
  const kept = await service.get()
  expect(kept.status).toBe(200)
  expect(kept.data).toMatchObject({ stale: true })
  const cold = new ForecastService(
    () => Promise.reject(new Error('provider down')),
    () => now
  )
  const empty = await cold.get()
  expect(empty.status).toBe(503)
  expect(JSON.stringify(empty.data)).not.toMatch(/weatherflow|token/i)
})

test('exposes only forecast fields, never station metadata or credentials', async () => {
  const payload = sample({
    latitude: 30.1,
    longitude: -97.8,
    station_units: { units_temp: 'f' },
    current_conditions: { air_temperature: 39 },
  })
  const service = new ForecastService(
    () => Promise.resolve(payload),
    () => 1000
  )
  const { data } = await service.get()
  expect(Object.keys(data).sort()).toEqual(['days', 'issued_at', 'stale'])
  const keys = new Set(
    (data as { days: object[] }).days.flatMap((d) => Object.keys(d))
  )
  expect([...keys].sort()).toEqual([
    'day_start_local',
    'high_f',
    'low_f',
    'precip_percent',
    'weekday',
  ])
  expect(JSON.stringify(data)).not.toMatch(/latitude|longitude|station_units/)
})
