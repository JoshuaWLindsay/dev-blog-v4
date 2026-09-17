# Unlisted weather tablet

`/weather` returns plain HTML through a Next.js Route Handler, bypassing the root
layout, navigation, React runtime, and hydration. The original weather-app project
is unchanged and is not needed at runtime.

- `/weather`: dashboard with a `noindex` meta tag.
- `/weather/assets/tablet.css`, `tablet.js`, `rapid-wind.js`, `favicon.svg`: isolated assets.
- `/weather/api`: the original normalized JSON contract (200), or a generic error
  (503) when no cached observation is available.

Weather responses have `X-Robots-Tag: noindex, nofollow, noarchive`, `no-store`, and
namespace-scoped security headers. This is public and unlisted, with no login and
no navigation or sitemap entry.

The display shows temperature, rain, wind, the seven-day forecast strip, and the
Central Time clock. The weekday and month/day share one line directly above the
clock. Rain and wind readings are centered without visible labels. Temperature
and time stay as large as the forecast strip allows, with width fitting for
longer readings; the single date line is fitted as one unit so pairs such as
Wednesday September 30 do not overflow. Lightning is no longer displayed; its API
fields remain available for compatibility.

## Weather subdomain

The same deployment also serves the dashboard at `https://weather.joshuawlindsay.dev/`.
A hostname-specific rewrite runs before the normal homepage route; `/weather`
continues working on the main domain and preview deployments. The subdomain root
gets the same noindex and security headers. Assets and the API stay under
`/weather/*` on whichever origin the tablet uses, so no CORS configuration is needed.

To activate it, add `weather.joshuawlindsay.dev` to this project's Vercel
**Settings → Domains**, then add the `weather` CNAME record with the exact target
Vercel displays at your DNS provider (or follow Vercel's automatic DNS setup).
Use the existing project's environment variables; no separate Vercel project is
needed. DNS and domain configuration are not changed by this code update.
See [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain).

With Cloudflare DNS, open `joshuawlindsay.dev` → **DNS → Records → Add record**:
choose `CNAME`, name `weather`, target the exact hostname Vercel displays, proxy
status **DNS only** (gray cloud), and TTL **Auto**. Save, then wait for Vercel to
report Valid Configuration and provision HTTPS. Leave the existing apex and
`www` records as they are. See [Cloudflare subdomain records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-subdomain/).

## Configure the existing Next.js host

Set these **server-side** environment variables in the hosting project's production
environment, then redeploy:

```text
WEATHERFLOW_TOKEN=<private Tempest access token>
WEATHERFLOW_STATION_ID=<numeric station ID>
```

On Vercel, use **Settings → Environment Variables** and enable Production (and
Preview if desired), then redeploy. The token is private; the station ID is not a
password but is also kept server-side. No other personal information is required.
See [Vercel environment variables](https://vercel.com/docs/environment-variables).

Locally, use Git-ignored `.env.local` or exported environment variables. Never
prefix them with `NEXT_PUBLIC_`. The server does not read the original project's
secrets file. Credentials, station metadata, and upstream URLs are never sent to
the browser. No additional runtime dependency or Python service is required.
Use the existing Node.js Next.js host or its serverless adapter; static export
alone cannot serve the API.

The API requests Celsius, metres/second, millimetres and kilometres, then converts
to Fahrenheit, mph and miles. Rain is the latest observation's accumulation, not
a daily total. Missing sensors remain `null`.

The provider URL uses `/observations/station/{station_id}`, matching the original
app's configured endpoint and returning named fields plus lightning summaries.
The similarly named `/observations/stn/{station_id}` returns indexed time-series
arrays and is not interchangeable with this contract. The station ID is the number
after `/observations/station/` in the original `station_endpoint`; the separate
device ID and `device_endpoint` are not needed.

Provider requests have a 15-second total timeout. A warm server instance shares
in-flight requests and caches readings and failed attempts for five seconds. Failed
refreshes return the previous observation with `stale: true`; readings older than
five minutes are also stale. Like the Python source, the cache is process-local:
serverless cold starts and separate instances do not share it. The tablet retains
its last reading across API failures, including a cold instance's 503.

The client polls five seconds after each completed request, with a 20-second timeout,
and refreshes on visibility, page restore and connectivity events. A wall-clock
check cancels requests suspended during sleep; late responses cannot overwrite
newer readings. The Central Time clock runs independently using US DST rules,
without `Intl`. The client remains ES5/XHR with Safari 12-compatible
CSS and portrait/landscape layout. The provider may publish new observations less
frequently than the five-second polling interval.

## Verification

Use Node.js 24 LTS (matching Vercel and `.nvmrc`):

```sh
npm run test:weather
npm run build
npm run start
# With the server running:
node --test tests/weather/http.test.cjs
```

The focused Jest configuration leaves the pre-existing configuration unchanged.
Checks cover conversions, missing data, cache timing/concurrency, stale fallback,
timeouts, secret isolation, Central Time/DST, ES5 syntax, five-second polling, sleep
recovery and raw HTML. HTTP checks inspect built routes and regular site pages.
Set `WEATHER_TEST_BASE_URL` for another origin and `WEATHER_TEST_LIVE=1` to require
a fresh live observation instead of allowing an unconfigured 503.

Check at 768×1024 and 1024×768: values and long dates should fit without scrolling.
Browser emulation does not replace final testing on a physical iOS 12 iPad. Rotate
the device, add the page to the Home Screen, sleep/wake during a request, and
disconnect/reconnect Wi-Fi. Confirm the production host's HTTPS certificate works
on the device.

Verified locally on September 13, 2026: production build and TypeScript checks;
17 backend/client behavior checks; 3 production HTTP checks with fresh live station
readings, isolated assets, noindex headers, normal site pages, and subdomain Host
routing. WebKit 26.6 passed at 768×1024 and 1024×768 without overflow, including
long dates, offline recovery and timed refresh. Network inspection confirmed the
page loads only the tablet script and namespaced assets/API, with no framework
runtime. Physical iOS 12 hardware and the public DNS/deployment remain unverified.

References: [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route),
[Tempest API](https://weatherflow.github.io/Tempest/api/).

## Full observation dashboard

`https://weather.joshuawlindsay.dev/full` is the desktop dashboard. It is also
available at `/weather/full` on the main site and preview deployments. Its plain
HTML route bypasses the site layout and framework runtime, just like the tablet
page. The `/full` rewrite applies only to the weather subdomain.

Six panels cover all 36 measurements returned by the station's latest-observation
endpoint; the observation timestamp is shown in the header (37 observation fields
in total). They include temperature and comfort, wind, rainfall and corrected
accumulations/durations, pressure/humidity/density, sun/UV, and lightning. Values
that the provider omits appear as dashes. No forecasts, historical extrema, or
measurements from other endpoints are invented. The rain analysis code is shown
as the provider's code, without guessing its meaning.

`/weather/api/full` exposes an explicit weather-only allowlist, with no station
metadata, location, credentials or arbitrary provider fields. Both API routes
share the same five-second cache and in-flight request per server instance. The
original tablet JSON contract and layout remain intact. Full readings convert
Celsius to Fahrenheit, m/s to mph, mm to inches, km to miles and mb to inHg. Delta T
is a temperature difference (multiply by 1.8, without adding 32). Air density stays
in kg/m³; solar radiation in W/m²; illuminance in lux. Actual new-observation timing
is controlled by the weather provider.

The clock uses Central Time. Stale and offline readings stay visible with a
warning, and sleeping requests cannot overwrite newer observations after waking.
Desktop and landscape iPad use three columns; portrait iPad uses two columns.
Phones and unusually short windows can scroll to retain readable text. The Full
screen button appears only when the browser supports it and requires a click/tap;
Home Screen launch remains available on older iPads. No external assets or
framework scripts are needed by the full page.

`npm run test:weather` includes full-dashboard normalization, cache, rendering,
timeout/recovery, fullscreen fallback, and ES5 checks. With a production server
running, check both HTTP suites:

```sh
node --test tests/weather/http.test.cjs tests/weather/full-http.test.cjs
```

The design targets 1366×768 and larger desktop screens, plus 1024×768 and 768×1024
iPads. Browser emulation cannot verify a physical iOS 12 device or its TLS support.

Full-dashboard verification (September 13, 2026): production build, lint and types
passed; 27 backend/client checks and 6 production HTTP checks passed, including
fresh live station data and the subdomain rewrite. Inspected live readings in
Brave on desktop and at a 768×892 portrait viewport with all measurements and the
footer visible. Physical iOS 12 hardware remains unverified.

## Rapid wind on the main tablet page

The main page displays a current `rapid_wind` sample instead of `wind_avg`.
The average, gust and lull remain on `/full`. Temperature and rain still use
the station observation endpoint, which normally publishes once per minute.

The browser requests `/weather/api/wind` on a five-second start-to-start cadence
using ES5/XHR. It never contacts Tempest directly. Node 24 opens a bounded outbound
WebSocket, subscribes to the configured station's active wind device, receives
one current sample, closes the socket, and returns only its timestamp, mph and
compass direction. Metadata discovery takes at most five seconds; the socket
times out after eight seconds. No persistent relay or new environment variables
are required: the existing station ID/token also discover the active device.
Device metadata is cached for an hour; simultaneous requests within one warm
server instance share a sample request and attempts are limited to every five
seconds. Nothing depends on a socket running after the HTTP response finishes.

A sample expires after 15 seconds. If live wind is unavailable, the tablet
explicitly labels its fallback to the one-minute average in the status line.
The feed retries automatically, pauses when hidden and recovers after sleep.
Provider sampling (normally three seconds), network latency, and power-saving
modes determine when new values actually arrive; identical readings are valid.

Tests cover discovery, current-sample conversion, socket cleanup/timeouts, shared
requests, ES5, cadence, fallback, and hidden/sleep recovery. The HTTP wind check
requires `WEATHER_TEST_LIVE=1` to verify a fresh sample and a later timestamp on
the next poll. Deployment still needs a check on the physical iOS 12 iPad.

Reference: [Tempest WebSocket API](https://weatherflow.github.io/Tempest/api/ws.html).

Rapid-wind verification (September 13, 2026): production build, lint and types
passed; 38 backend/browser checks and eight production HTTP checks passed. The
live rapid feed returned a newer sample six seconds after the prior sample.
Brave rendered current wind and the updated NO RAIN label on the main page.
The main temperature and clock use a light system font (weight 300).

## Seven-day forecast on the main tablet page

The tablet shows a seven-column strip between the wind line and the clock block:
a weekday letter, the forecast low, the forecast high and the chance of rain.
Today is the first column and is labelled like every other column, so the header
row stays symmetric and today's letter sits directly above the weekday word on
the date line below. Saturday and Sunday share `S`; Thursday is `Th`. A column
the provider did not return is blank rather than shifted.

Forecasts come from Tempest's `better_forecast` endpoint, which is what the
Tempest app itself calls. The existing `WEATHERFLOW_TOKEN` and
`WEATHERFLOW_STATION_ID` cover it, so no new environment variable, provider or
credential is introduced. Temperatures are requested in Celsius and converted to
whole degrees Fahrenheit; the chance of rain is clamped to 0-100. Weekdays come
from `day_start_local` combined with the payload's `timezone_offset_minutes`, so
the station's own local day names the column. Days the provider omits render as
dashes. Hourly forecasts, conditions text and icons are available from the same
response but are not displayed.

`/weather/api/forecast` returns only `issued_at`, `stale` and the seven days'
`day_start_local`, `weekday`, `low_f`, `high_f` and `precip_percent`. Station
latitude/longitude, unit preferences, current conditions and credentials are
never exposed. The server caches the forecast for ten minutes per warm instance
and shares in-flight requests, because a daily forecast does not change at the
observation polling rate. A failed refresh keeps the previous forecast and marks
it `stale`; a cold instance with no forecast returns 503.

The browser polls `/weather/api/forecast` every 15 minutes in ES5/XHR, retries a
minute after a failure, and refreshes on visibility, page restore and
connectivity events. It is a separate asset (`forecast.js`) alongside
`rapid-wind.js`, so the five-second observation and wind cadences are unchanged.
An older forecast arriving late cannot replace a newer one. The status line
reports a missing forecast only when no forecast has ever loaded, and only when
the observation and wind lines have nothing more urgent to say.

Adding four lines of text to a full-height layout required height from elsewhere.
Collapsing the weekday and month/day onto one line paid most of it back. The
temperature and clock move from `0.381225` to `0.355` of the shorter portrait
dimension (`0.31395`/`0.2691` to `0.27`/`0.235` of viewport height in landscape),
and the combined date line sits at `0.075` (`0.062` in landscape) where the two
separate lines were `0.117` (`0.0975`). These constants live in both `tablet.css`
and `fitDisplay` in `tablet.js`, which sets inline sizes and wins; both were
changed together. The strip shrinks itself if seven columns of three digits
overflow, and so does the date line.

`npm run test:weather` covers normalization, weekday naming, clamping, missing
values, provider errors, URL construction, ten-minute caching, stale fallback,
field allowlisting, column rendering, the 15-minute cadence, out-of-order
responses, sleep recovery and ES5 syntax.

Forecast verification (September 16, 2026): production build, lint and types
passed; 53 backend/browser checks passed. The page renders the seven-column
strip and `/weather/api/forecast` returns a clean 503 with no credential leakage
when the station is unconfigured. Not yet verified: live `better_forecast`
readings (no local credentials) and the layout in a real browser at 768x1024 and
1024x768, including the reordered date line and the resized temperature and clock.

Reference: [Tempest Better Forecast](https://apidocs.tempestwx.com/reference/get_better-forecast-1).
