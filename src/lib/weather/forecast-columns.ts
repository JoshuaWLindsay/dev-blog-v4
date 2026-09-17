// Shared by the tablet and landscape pages: forecast.js fills these ids on both.
// Seven daily columns: today first, then the next six days.
export const forecastColumns = [0, 1, 2, 3, 4, 5, 6]
  .map(
    (index) =>
      `<div class="forecast-day">` +
      `<div class="forecast-weekday" id="fc-w${index}">&nbsp;</div>` +
      `<div class="forecast-low" id="fc-l${index}">--</div>` +
      `<div class="forecast-high" id="fc-h${index}">--</div>` +
      `<div class="forecast-precip" id="fc-p${index}">--</div>` +
      `</div>`
  )
  .join('\n      ')
