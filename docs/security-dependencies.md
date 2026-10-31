# Dependency security review — October 31, 2026

## Applied fixes

- Updated `next` and `eslint-config-next` from 15.5.9 to 15.5.28.
- Updated Sharp to 0.35.5 through Next.js and refreshed compatible vulnerable
  transitive dependencies in `package-lock.json`.
- Raised the direct PostCSS minimum to 8.5.32 and added a Next.js-only override
  referencing that dependency. Next.js 15.5.28 otherwise pins PostCSS 8.4.31.
  Keep the override until Next.js requires a patched PostCSS version itself.

The [Next.js October security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026)
identifies 15.5.28 as the patched maintenance release, including image optimization
fixes. [PostCSS versions through 8.5.22 remain affected by source-map file disclosure](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).

## Audit result

After the changes, `npm audit --omit=dev` reports **zero vulnerabilities**.
The full audit reports **35 affected package entries: 31 moderate and 4 low,
with zero high or critical**. These are package/dependency-chain counts, not
35 distinct CVEs; the remaining entries stem from two advisories:

| Advisory | Dependency path | Follow-up |
| --- | --- | --- |
| [CVE-2026-118764 / GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) — moderate glob-pattern amplification | ESLint, TypeScript ESLint, and Jest tooling → minimatch 3.1.5 / 9.0.9 | Track upstream tooling upgrades compatible with minimatch 11.0.1 or a backported fix. A blanket major-version override can break older minimatch consumers. |
| [CVE-2026-93753 / GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) — low prototype poisoning | Jest → jest-config → deepmerge 4.3.1 | No patched version is listed. Recheck when upstream publishes a fix or Jest replaces this dependency. |

These packages are marked development-only in the lockfile, and application
source does not import them. This does not establish that tooling is immune to
malicious inputs. The advisories remain visible; no audit suppression was added.
Do not apply `npm audit fix --force` blindly: its current proposals include
downgrading Jest to 25.1.0 and ESLint to 4.0.0.

## Verification

Checked with Node.js 24.22.1:

- Clean `npm ci --ignore-scripts` in a temporary directory; verified Next.js
  resolves PostCSS 8.5.32.
- `npm run test:weather`: 39 Jest tests and 35 browser-client tests passed.
- `npm run build`: compilation, linting, and type validation passed.
- Eight existing HTTP tests passed against the local production server,
  covering regular pages, weather routes, host rewrites, assets, and headers.
  Weather APIs exercised their unconfigured 503 fallback; live upstream data
  was not tested.
- `npm ls --omit=dev --all` and `git diff --check` passed.

Recheck using Node 24:

```sh
npm ci
npm audit --omit=dev
npm audit
npm run test:weather
npm run build
```

This review covers npm dependencies in this checkout. The deployed site has
not been updated or audited; deployment is required to apply these fixes there.
