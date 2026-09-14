import { normalizeRapidWind, windDevice, readRapidWind, RapidWindService } from '../../src/lib/weather/rapid-wind'

const epoch = 1700000000
const sample = { observed_at: epoch, wind_mph: 2.1, wind_direction: 'SE' }

test('rapid wind selects the current sample, converts mph and uses its own direction', () => {
  expect(normalizeRapidWind({ type: 'rapid_wind', device_id: 9, ob: [epoch, 1, 135] }, 9, epoch)).toEqual({ observed_at: epoch, wind_mph: 2.24, wind_direction: 'SE' })
  expect(normalizeRapidWind({ type: 'rapid_wind', device_id: 9, ob: [epoch, 0, 360] }, 9, epoch)?.wind_direction).toBe('N')
  expect(normalizeRapidWind({ type: 'rapid_wind', device_id: 9, ob: [epoch, 0, null] }, 9, epoch)?.wind_mph).toBe(0)
})

test('invalid, stale, future and other-device samples cannot become live wind', () => {
  for (const ob of [[epoch - 16, 1, 135], [epoch + 6, 1, 135], [epoch, -1, 135], [epoch, NaN, 135], [epoch, '2', 135]]) {
    expect(normalizeRapidWind({ type: 'rapid_wind', device_id: 9, ob }, 9, epoch)).toBeNull()
  }
  expect(normalizeRapidWind({ type: 'rapid_wind', device_id: 10, ob: [epoch, 1, 135] }, 9, epoch)).toBeNull()
  expect(normalizeRapidWind({ type: 'ack' }, 9, epoch)).toBeNull()
})

test('discovery selects only the active wind device on the configured station', () => {
  const devices = [
    {device_id: 1, device_type: 'HB', serial_number: 'hub'},
    {device_id: 2, device_type: 'ST', serial_number: ''},
    {device_id: 3, device_type: 'ST', serial_number: 'active'},
    {device_id: 4, device_type: 'SK', serial_number: 'sky'},
  ]
  const station = {station_id: 7, devices, station_items: [{item: 'wind', device_id: 3}]}
  const payload = {status: {status_code: 0}, stations: [station]}
  expect(windDevice(payload, 7)).toBe(3)
  expect(() => windDevice(payload, 8)).toThrow('Wind unavailable')
  expect(() => windDevice({...payload, status: {status_code: 1}}, 7)).toThrow()
  expect(() => windDevice({...payload, stations: [{...station, station_items: []}]}, 7)).toThrow()
  expect(windDevice({...payload, stations: [{...station, devices: devices.slice(0, 3), station_items: []}]}, 7)).toBe(3)
})

function fakeSocket() {
  const socket = {send: jest.fn(), close: jest.fn(), onopen: null, onmessage: null, onerror: null, onclose: null} as unknown as WebSocket
  return socket
}

afterEach(() => jest.useRealTimers())

test('bounded socket subscribes, ignores unrelated frames, closes after a sample and exposes no credentials', async () => {
  jest.useFakeTimers().setSystemTime(epoch * 1000)
  const socket = fakeSocket()
  const result = readRapidWind('secret-token', 9, () => socket)
  socket.onopen!({} as Event)
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({type: 'listen_rapid_start', device_id: 9, id: 'weather-rapid'}))
  socket.onmessage!({data: '{malformed'} as MessageEvent)
  socket.onmessage!({data: JSON.stringify({type: 'ack'})} as MessageEvent)
  socket.onmessage!({data: JSON.stringify({type: 'rapid_wind', device_id: 9, ob: [epoch, 1, 135]})} as MessageEvent)
  const data = await result
  expect(data.wind_mph).toBe(2.24)
  expect(JSON.stringify(data)).not.toMatch(/token|device_id/)
  expect(socket.close).toHaveBeenCalledTimes(1)
  expect(jest.getTimerCount()).toBe(0)
})

test('socket timeout and transport errors close connections and return generic failures', async () => {
  jest.useFakeTimers()
  const socket = fakeSocket()
  const failure = expect(readRapidWind('secret', 9, () => socket)).rejects.toThrow('Wind unavailable')
  jest.advanceTimersByTime(8000)
  await failure
  expect(socket.close).toHaveBeenCalledTimes(1)
  const broken = fakeSocket()
  const error = expect(readRapidWind('secret', 9, () => broken)).rejects.toThrow('Wind unavailable')
  broken.onerror!({} as Event)
  await error
  expect(broken.close).toHaveBeenCalledTimes(1)
  expect(jest.getTimerCount()).toBe(0)
})

test('simultaneous clients share a request; failures are throttled and recover', async () => {
  let now = epoch
  const fetcher = jest.fn().mockResolvedValue(sample)
  const service = new RapidWindService(fetcher, () => now)
  const results = await Promise.all([service.get(), service.get()])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(results[0]).toEqual({status: 200, data: sample})
  now += 4
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(1)
  now += 1
  fetcher.mockRejectedValueOnce(new Error('secret-token'))
  expect(await service.get()).toEqual({status: 503, data: {error: 'Live wind unavailable. Retrying automatically.'}})
  await service.get()
  expect(fetcher).toHaveBeenCalledTimes(2)
  now += 5
  expect((await service.get()).status).toBe(200)
  now += 20
  expect((await service.get()).status).toBe(503)
})
