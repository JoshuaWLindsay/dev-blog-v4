import { fullWeatherGroups, MetricSpec } from './full-schema'

function metric(spec: MetricSpec, hero = false) {
  return `<div class="metric${hero ? ' metric-hero' : ''}">
    <dt>${spec.label}</dt>
    <dd><span id="full-${spec.key}" data-digits="${spec.digits ?? 0}" data-format="${spec.format ?? 'number'}">—</span>${spec.unit ? `<span class="unit">${spec.unit}</span>` : ''}</dd>
  </div>`
}

export const fullWeatherHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="Weather Full">
  <meta name="theme-color" content="#080c10">
  <meta name="description" content="Every current weather station reading on one screen.">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Full Weather Station</title>
  <link rel="icon" href="/weather/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/weather/assets/full.css">
  <script src="/weather/assets/full.js" defer></script>
</head>
<body>
  <main class="dashboard">
    <header class="masthead">
      <div class="identity">
        <p class="eyebrow">WEATHER STATION <span class="separator">/</span> FULL OBSERVATIONS</p>
        <h1>Outside, right now.</h1>
        <p class="observation">Observed <span id="observed">—</span> <span class="separator">·</span> <span id="connection" role="status">Connecting…</span></p>
      </div>
      <div class="header-right">
        <div class="time" id="clock">—:—</div>
        <div class="calendar"><span id="date">—</span> <span class="timezone">CT</span></div>
        <div class="actions"><a href="/weather">Tablet view</a><button id="fullscreen" type="button" hidden>Full screen</button></div>
      </div>
    </header>
    <div class="panels">
      ${fullWeatherGroups
        .map(
          (
            group,
            index
          ) => `<section class="panel panel-${group.id}" aria-labelledby="heading-${group.id}">
        <header class="panel-header"><span class="panel-number">0${index + 1}</span><h2 id="heading-${group.id}">${group.title}</h2></header>
        <dl class="hero-reading">${metric(group.metrics[0], true)}</dl>
        <dl class="details">${group.metrics
          .slice(1)
          .map((spec) => metric(spec))
          .join('')}</dl>
      </section>`
        )
        .join('')}
    </div>
    <footer class="footnote"><span>Station observations · checks every 5 seconds</span><span id="status" role="status">Waiting for a reading</span></footer>
    <noscript><p class="noscript">Enable JavaScript to show live readings. This page supports Safari on iOS 12.</p></noscript>
  </main>
</body>
</html>`
