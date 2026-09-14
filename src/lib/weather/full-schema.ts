// Weather-only allowlist: all 36 measurements in the latest station observation.
// The 37th field, timestamp, is shown in the dashboard header.
export type MetricSpec = {
  key: string
  label: string
  unit?: string
  digits?: number
  multiplier?: number
  offset?: number
  format?: 'direction' | 'trend' | 'elapsed' | 'code'
}

const temperature = (key: string, label: string): MetricSpec => ({
  key,
  label,
  unit: '°F',
  digits: 1,
  multiplier: 1.8,
  offset: 32,
})
const wind = (key: string, label: string): MetricSpec => ({
  key,
  label,
  unit: 'mph',
  digits: 1,
  multiplier: 2.2369362921,
})
const rain = (key: string, label: string): MetricSpec => ({
  key,
  label,
  unit: 'in',
  digits: 3,
  multiplier: 1 / 25.4,
})
const pressure = (key: string, label: string): MetricSpec => ({
  key,
  label,
  unit: 'inHg',
  digits: 2,
  multiplier: 1 / 33.8638866667,
})

export const fullWeatherGroups: {
  id: string
  title: string
  metrics: MetricSpec[]
}[] = [
  {
    id: 'temperature',
    title: 'Temperature & comfort',
    metrics: [
      temperature('air_temperature', 'Air temperature'),
      temperature('feels_like', 'Feels like'),
      temperature('dew_point', 'Dew point'),
      temperature('heat_index', 'Heat index'),
      temperature('wind_chill', 'Wind chill'),
      temperature('wet_bulb_temperature', 'Wet bulb'),
      temperature('wet_bulb_globe_temperature', 'Wet bulb globe'),
      {
        key: 'delta_t',
        label: 'Delta T',
        unit: '°F',
        digits: 1,
        multiplier: 1.8,
      },
    ],
  },
  {
    id: 'wind',
    title: 'Wind',
    metrics: [
      wind('wind_avg', 'Average speed'),
      { key: 'wind_direction', label: 'Direction', format: 'direction' },
      wind('wind_gust', 'Gust'),
      wind('wind_lull', 'Lull'),
    ],
  },
  {
    id: 'rain',
    title: 'Rainfall',
    metrics: [
      rain('precip_accum_local_day', 'Today'),
      rain('precip', 'Latest interval'),
      rain('precip_accum_last_1hr', 'Last hour'),
      rain('precip_accum_local_day_final', 'Today, corrected'),
      rain('precip_accum_local_yesterday', 'Yesterday'),
      rain('precip_accum_local_yesterday_final', 'Yesterday, corrected'),
      {
        key: 'precip_minutes_local_day',
        label: 'Rain time today',
        unit: 'min',
      },
      {
        key: 'precip_minutes_local_yesterday',
        label: 'Rain time yesterday',
        unit: 'min',
      },
      {
        key: 'precip_minutes_local_yesterday_final',
        label: 'Yesterday time, corrected',
        unit: 'min',
      },
      {
        key: 'precip_analysis_type_yesterday',
        label: 'Yesterday analysis code',
        format: 'code',
      },
    ],
  },
  {
    id: 'atmosphere',
    title: 'Atmosphere',
    metrics: [
      pressure('sea_level_pressure', 'Sea-level pressure'),
      {
        key: 'relative_humidity',
        label: 'Relative humidity',
        unit: '%',
        digits: 0,
      },
      { key: 'pressure_trend', label: 'Pressure trend', format: 'trend' },
      pressure('station_pressure', 'Station pressure'),
      pressure('barometric_pressure', 'Barometric pressure'),
      { key: 'air_density', label: 'Air density', unit: 'kg/m³', digits: 3 },
    ],
  },
  {
    id: 'sun',
    title: 'Sun & light',
    metrics: [
      { key: 'uv', label: 'UV index', digits: 1 },
      {
        key: 'solar_radiation',
        label: 'Solar radiation',
        unit: 'W/m²',
        digits: 0,
      },
      { key: 'brightness', label: 'Illuminance', unit: 'lux', digits: 0 },
    ],
  },
  {
    id: 'lightning',
    title: 'Lightning',
    metrics: [
      {
        key: 'lightning_strike_count_last_3hr',
        label: 'Strikes · last 3 hours',
      },
      { key: 'lightning_strike_count_last_1hr', label: 'Last hour' },
      { key: 'lightning_strike_count', label: 'Latest interval' },
      {
        key: 'lightning_strike_last_epoch',
        label: 'Last detected',
        format: 'elapsed',
      },
      {
        key: 'lightning_strike_last_distance',
        label: 'Last distance',
        unit: 'mi',
        digits: 1,
        multiplier: 0.6213711922,
      },
    ],
  },
]

export type FullObservation = {
  observed_at: number
  groups: {
    id: string
    metrics: { key: string; value: number | string | null }[]
  }[]
}
