import { forecastColumns } from './forecast-columns'

// Standalone landscape document. Shares rapid-wind.js and forecast.js with the
// tablet page by reusing their element ids; landscape.js replaces tablet.js.
export const landscapeHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Weather">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="A simple, large-print landscape weather station display.">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Weather Landscape</title>
  <link rel="icon" href="/weather/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/weather/assets/landscape.css">
  <script src="/weather/assets/rapid-wind.js" defer></script>
  <script src="/weather/assets/forecast.js" defer></script>
  <script src="/weather/assets/landscape.js" defer></script>
</head>
<body>
  <main class="landscape" aria-label="Weather dashboard">
    <header class="top" aria-label="Current time and date, Central Time">
      <div class="clock" id="clock">--:--</div>
      <div class="datetime" id="datetime"><span class="day" id="day">Loading day</span><span class="date" id="date">Loading date</span></div>
    </header>
    <section class="middle">
      <div class="temperature" id="temperature" aria-label="Temperature in Fahrenheit">--.-</div>
      <div class="forecast" id="forecast" aria-label="Seven day forecast: low, high and chance of rain">
      ${forecastColumns}
      </div>
    </section>
    <footer class="bottom">
      <div class="panel" role="group" aria-label="Rain">
        <div class="state" id="rain">--</div>
        <div class="detail">
          <div class="detail-item"><div class="detail-label">YESTERDAY</div><div class="detail-value" id="rain-yesterday">--</div></div>
          <div class="detail-item"><div class="detail-label">TODAY</div><div class="detail-value" id="rain-today">--</div></div>
        </div>
      </div>
      <div class="panel" role="group" aria-label="Wind">
        <div class="state" id="wind">--</div>
      </div>
      <div class="panel" role="group" aria-label="Lightning">
        <div class="state" id="lightning">--</div>
        <div class="detail">
          <div class="detail-item"><div class="detail-label">LAST</div><div class="detail-value" id="lightning-last">--</div></div>
          <div class="detail-item"><div class="detail-label">3 HRS</div><div class="detail-value" id="lightning-count">--</div></div>
          <div class="detail-item"><div class="detail-label">DIST</div><div class="detail-value" id="lightning-distance">--</div></div>
        </div>
      </div>
    </footer>
  </main>
  <p class="status" id="status" role="status">Connecting to weather station...</p>
  <noscript><p class="status">Enable JavaScript to show live weather and the clock.</p></noscript>
</body>
</html>
`
