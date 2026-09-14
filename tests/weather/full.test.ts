jest.mock('server-only', () => ({}), { virtual: true })

import { normalizeFull, WeatherService } from '../../src/lib/weather/service'
import { fullWeatherGroups } from '../../src/lib/weather/full-schema'
import { GET as fullPage } from '../../src/app/weather/full/route'

function sample() {
  const obs: Record<string, unknown> = { timestamp: 1700000000 }
  for (const group of fullWeatherGroups) {
    for (const metric of group.metrics) obs[metric.key] = 1
  }
  Object.assign(obs, {
    air_temperature: 25, delta_t: 10, wind_avg: 10,
    precip: 25.4, sea_level_pressure: 1013.25,
    lightning_strike_last_distance: 10, lightning_strike_last_epoch: 1699999990,
    pressure_trend: 'rising', air_density: 1.225,
  })
  return { obs: [obs] }
}

test('full observations cover all station measurements with correct units', () => {
  const data = normalizeFull(sample())
  const metrics = data.groups.flatMap(group => group.metrics)
  expect(metrics).toHaveLength(36)
  expect(new Set(metrics.map(metric => metric.key)).size).toBe(36)
  expect(data.observed_at).toBe(1700000000)
  const values = Object.fromEntries(metrics.map(metric => [metric.key, metric.value]))
  expect(values.air_temperature).toBe(77)
  expect(values.delta_t).toBe(18)
  expect(values.wind_avg).toBeCloseTo(22.36936)
  expect(values.precip).toBeCloseTo(1)
  expect(values.sea_level_pressure).toBeCloseTo(29.92126)
  expect(values.lightning_strike_last_distance).toBeCloseTo(6.21371)
  expect(values.pressure_trend).toBe('Rising')
  expect(values.air_density).toBe(1.225)
})

test('only known weather fields are exposed and unavailable values stay null', () => {
  const payload = {
    token: 'private-token', latitude: 30,
    obs: [{timestamp: 1700000000, longitude: 30, station_id: 123,
      air_temperature: Infinity, precip: null, wind_avg: '10',
      pressure_trend: '<script>private-token</script>', lightning_strike_last_epoch: 0,
      lightning_strike_last_distance: 10}],
  }
  const data = normalizeFull(payload)
  const values = Object.fromEntries(data.groups.flatMap(group => group.metrics).map(metric => [metric.key, metric.value]))
  expect(values.air_temperature).toBeNull()
  expect(values.precip).toBeNull()
  expect(values.wind_avg).toBeNull()
  expect(values.pressure_trend).toBeNull()
  expect(values.lightning_strike_last_distance).toBeNull()
  expect(JSON.stringify(data)).not.toMatch(/private-token|latitude|longitude|station_id|script/)
})

test('tablet and full endpoints share requests, cache, stale fallback and recovery', async () => {
  let now = 1700000000
  const fetcher = jest.fn().mockResolvedValueOnce(sample())
    .mockRejectedValueOnce(new Error('private-token'))
    .mockResolvedValueOnce(sample())
  const service = new WeatherService(fetcher, () => now)
  const [tablet, full] = await Promise.all([service.get(), service.getFull()])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(tablet.data).not.toHaveProperty('groups')
  expect(full.data).toMatchObject({observed_at: 1700000000, stale: false})
  now += 4
  await service.getFull()
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 1
  const stale = await service.getFull()
  expect(stale.status).toBe(200)
  expect(stale.data).toMatchObject({stale: true})
  expect(JSON.stringify(stale)).not.toContain('private-token')
  now += 5
  expect((await service.getFull()).data).toMatchObject({stale: false})
  expect(fetcher).toHaveBeenCalledTimes(3)
  now += 301
  expect((await service.getFull()).data).toMatchObject({stale: true})
})

test('full endpoint startup failures expose only a generic error', async () => {
  const service = new WeatherService(async () => { throw new Error('private-token') })
  expect(await service.getFull()).toEqual({
    status: 503, data: {error: 'Weather unavailable. Retrying automatically.'},
  })
})

test('full page has a visible slot for each reading and no site framework', async () => {
  const response = fullPage()
  const html = await response.text()
  expect(response.headers.get('content-type')).toContain('text/html')
  for (const group of fullWeatherGroups) {
    for (const metric of group.metrics) {
      expect(html).toContain(`id="full-${metric.key}"`)
    }
  }
  expect(html.match(/<section /g)).toHaveLength(6)
  expect(html.match(/<script /g)).toHaveLength(1)
  expect(html).toContain('/weather/assets/full.js')
  expect(html).toContain('noindex, nofollow, noarchive')
  expect(html).not.toMatch(/_next|__NEXT|WEATHERFLOW/)
})
