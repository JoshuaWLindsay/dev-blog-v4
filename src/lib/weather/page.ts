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
  <script src="/weather/assets/tablet.js" defer></script>
</head>
<body>
  <main class="tablet" aria-label="Weather dashboard">
    <div class="temperature" id="temperature" aria-label="Temperature in Fahrenheit">--.-</div>
    <section class="conditions" aria-label="Current conditions">
      <div class="condition" role="group" aria-label="Rain"><span id="rain">--</span></div>
      <div class="condition" role="group" aria-label="Wind"><span id="wind">--</span></div>
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
