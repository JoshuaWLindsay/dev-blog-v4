jest.mock('server-only', () => ({}), { virtual: true })

import {
  fetchObservation,
  normalize,
  stationUrl,
  WeatherService,
} from '../../src/lib/weather/service'
import { GET as dashboard } from '../../src/app/weather/route'

function sample(changes: Record<string, unknown> = {}) {
  return {
    status: { status_code: 0 },
    obs: [
      {
        timestamp: 1700000000,
        air_temperature: 25,
        wind_avg: 10,
        wind_direction: 247.5,
        precip: 0,
        lightning_strike_last_epoch: 1699990000,
        lightning_strike_last_distance: 10,
        lightning_strike_count_last_3hr: 0,
        ...changes,
      },
    ],
  }
}

test('preserves the full JSON contract, SI conversions, rain and compass wrapping', () => {
  expect(normalize(sample())).toEqual({
    observed_at: 1700000000,
    temperature_f: 77,
    wind_mph: 22.37,
    wind_direction: 'WSW',
    raining: false,
    rain_today_in: null,
    rain_yesterday_in: null,
    lightning_last_epoch: 1699990000,
    lightning_distance_miles: 6.21,
    lightning_count_3hr: 0,
  })
  expect(normalize(sample({ precip: 0.1 })).raining).toBe(true)
  expect(normalize(sample({ wind_direction: 360 })).wind_direction).toBe('N')
  expect(normalize(sample({ wind_direction: -90 })).wind_direction).toBe('W')
  expect(normalize(sample({ air_temperature: -40 })).temperature_f).toBe(-40)
})

test('daily rain accumulations convert to inches and distinguish a dry day from no sensor', () => {
  const wet = normalize(
    sample({ precip_accum_local_day: 0, precip_accum_local_yesterday: 8.636 })
  )
  expect(wet.rain_today_in).toBe(0)
  expect(wet.rain_yesterday_in).toBe(0.34)
  expect(normalize(sample()).rain_today_in).toBeNull()
})

test('missing and invalid sensor values are not converted to zeroes', () => {
  const data = normalize({ obs: [{ timestamp: 1700000000 }] })
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'observed_at') expect(value).toBeNull()
  }
  for (const value of [NaN, Infinity, true, '25', null]) {
    expect(
      normalize(sample({ air_temperature: value })).temperature_f
    ).toBeNull()
  }
  expect(
    normalize(sample({ lightning_strike_last_epoch: 0 }))
      .lightning_distance_miles
  ).toBeNull()
})

test('rejects malformed observations and provider failures', () => {
  for (const payload of [
    null,
    {},
    { obs: [] },
    { obs: [null] },
    { obs: [{}] },
    { status: { status_code: 401 }, obs: [{}] },
    { obs: [{ timestamp: true }] },
  ]) {
    expect(() => normalize(payload)).toThrow()
  }
})

test('caches for five seconds, preserves stale readings on failure, and recovers', async () => {
  let now = 1700000000
  const fetcher = jest
    .fn()
    .mockResolvedValueOnce(sample())
    .mockRejectedValueOnce(new Error('secret-token'))
    .mockResolvedValueOnce(sample({ timestamp: 1700000010 }))
  const service = new WeatherService(fetcher, () => now)
  expect((await service.get()).data).toMatchObject({ stale: false })
  now += 4
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 1
  expect(await service.get()).toMatchObject({
    status: 200,
    data: { temperature_f: 77, stale: true },
  })
  expect(JSON.stringify(await service.get())).not.toContain('secret-token')
  now += 5
  expect((await service.get()).data).toMatchObject({ stale: false })
  expect(fetcher).toHaveBeenCalledTimes(3)
})

test('simultaneous cold requests share one fetch and wait for its result', async () => {
  let resolve!: (value: unknown) => void
  const fetcher = jest.fn(
    () =>
      new Promise<unknown>((done) => {
        resolve = done
      })
  )
  const service = new WeatherService(fetcher, () => 1700000000)
  const first = service.get()
  const second = service.get()
  await Promise.resolve()
  expect(fetcher).toHaveBeenCalledTimes(1)
  resolve(sample())
  expect(await first).toEqual(await second)
  expect((await first).status).toBe(200)
})

test('old provider observations are stale; cold errors are generic, throttled and recoverable', async () => {
  expect(
    (
      await new WeatherService(
        async () => sample(),
        () => 1700000301
      ).get()
    ).data
  ).toMatchObject({ stale: true })
  let now = 1700000000
  const fetcher = jest.fn(() => {
    throw new Error('https://example.com?token=secret')
  })
  const service = new WeatherService(fetcher, () => now)
  expect(await service.get()).toEqual({
    status: 503,
    data: { error: 'Weather unavailable. Retrying automatically.' },
  })
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 5
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(2)
})

test('only server environment variables configure the fixed provider with explicit SI units', () => {
  const url = stationUrl({
    WEATHERFLOW_TOKEN: 'private value',
    WEATHERFLOW_STATION_ID: '123',
  })
  expect(url.origin).toBe('https://swd.weatherflow.com')
  expect(url.pathname).toBe('/swd/rest/observations/station/123')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    token: 'private value',
    units_temp: 'c',
    units_wind: 'mps',
    units_pressure: 'mb',
    units_precip: 'mm',
    units_distance: 'km',
  })
  for (const id of ['', '../123', '123?token=other', 'https://example.com']) {
    expect(() =>
      stationUrl({ WEATHERFLOW_TOKEN: 'private', WEATHERFLOW_STATION_ID: id })
    ).toThrow()
  }
  expect(() => stationUrl({})).toThrow()
})

test('upstream timeout covers the response body and disables caching and redirects', async () => {
  jest.useFakeTimers()
  const originalEnv = process.env
  process.env = {
    ...originalEnv,
    WEATHERFLOW_TOKEN: 'private',
    WEATHERFLOW_STATION_ID: '123',
  }
  let signal!: AbortSignal
  const mock = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (_url, options) => {
      expect(options?.cache).toBe('no-store')
      expect(options?.redirect).toBe('error')
      signal = options?.signal as AbortSignal
      return {
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      } as Response
    })
  try {
    const result = expect(fetchObservation()).rejects.toThrow('aborted')
    await jest.advanceTimersByTimeAsync(15000)
    await result
    expect(signal.aborted).toBe(true)
    expect(jest.getTimerCount()).toBe(0)
  } finally {
    mock.mockRestore()
    process.env = originalEnv
    jest.useRealTimers()
  }
})

test('HTML bypasses React, is noindex, and uses only dedicated asset URLs', async () => {
  const response = dashboard()
  const html = await response.text()
  expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
  expect(html).toContain('name="robots" content="noindex, nofollow, noarchive"')
  expect(html.match(/<script\b/g)).toHaveLength(3)
  expect(html).toContain('src="/weather/assets/rapid-wind.js"')
  expect(html).toContain('src="/weather/assets/forecast.js"')
  expect(html).toContain('src="/weather/assets/tablet.js"')
  expect(html).toContain('href="/weather/assets/tablet.css"')
  expect(html).not.toMatch(/_next|__NEXT|<nav|WEATHERFLOW|\/static\//)
})
