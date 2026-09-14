# Unlisted weather tablet

`/weather` returns plain HTML through a Next.js Route Handler, bypassing the root
layout, navigation, React runtime, and hydration. The original weather-app project
is unchanged and is not needed at runtime.

- `/weather`: dashboard with a `noindex` meta tag.
- `/weather/assets/tablet.css`, `tablet.js`, `favicon.svg`: isolated assets.
- `/weather/api`: the original normalized JSON contract (200), or a generic error
  (503) when no cached observation is available.

Weather responses have `X-Robots-Tag: noindex, nofollow, noarchive`, `no-store`, and
namespace-scoped security headers. This is public and unlisted, with no login and
no navigation or sitemap entry.

The display shows temperature, rain, wind, and the Central Time clock, with the
weekday above the month/day. Rain and wind readings are centered without visible
labels. Temperature and time are another 15% larger than the previous dashboard
(49.5% larger than the original layout), with width fitting for longer readings.
The two date lines retain their existing size and automatic width fitting. Lightning
is no longer displayed; its API fields remain available for compatibility.

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
