// Seven daily columns: today first, then the next six days.
const forecastColumns = [0, 1, 2, 3, 4, 5, 6]
  .map(
    (index) =>
      `      <div class="forecast-day">` +
      `<div class="forecast-weekday" id="fc-w${index}">&nbsp;</div>` +
      `<div class="forecast-low" id="fc-l${index}">--</div>` +
      `<div class="forecast-high" id="fc-h${index}">--</div>` +
      `<div class="forecast-precip" id="fc-p${index}">--</div>` +
      `</div>`
  )
  .join('\n')

// Standalone document, adapted from weather-app/templates/index.html.
export const weatherHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Weather">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="A simple, large-print weather station display.">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Weather Tablet</title>
  <link rel="icon" href="/weather/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/weather/assets/tablet.css">
  <script src="/weather/assets/rapid-wind.js" defer></script>
  <script src="/weather/assets/forecast.js" defer></script>
  <script src="/weather/assets/tablet.js" defer></script>
</head>
<body>
  <main class="tablet" aria-label="Weather dashboard">
    <div class="temperature" id="temperature" aria-label="Temperature in Fahrenheit">--.-</div>
    <section class="conditions" aria-label="Current conditions">
      <div class="condition" role="group" aria-label="Rain"><span id="rain">--</span></div>
      <div class="condition" role="group" aria-label="Wind"><span id="wind">--</span></div>
    </section>
    <section class="forecast" id="forecast" aria-label="Seven day forecast: low, high and chance of rain">
${forecastColumns}
    </section>
    <footer class="clock-block" aria-label="Current time and date, Central Time">
      <div class="clock" id="clock">--:--</div>
      <div class="day" id="day">Loading day</div>
      <div class="date" id="date">Loading date</div>
    </footer>
  </main>
  <p class="status" id="status" role="status">Connecting to weather station...</p>
  <noscript><p class="status">Enable JavaScript to show live weather and the clock.</p></noscript>
</body>
</html>
`
