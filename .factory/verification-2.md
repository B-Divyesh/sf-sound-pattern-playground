# Independent verification 2 — Sound Pattern Playground

**Verdict: FAIL — do not release until the demo performance regression is corrected.**

- Work order: `sound-pattern-playground-verify-2`
- Candidate commit: `f5ac01d787edb73b76963dd7c798b8ea02977ef4`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: static offline PWA

This is an independent clean-checkout verification. The deployment is the candidate: all 23 deployable files in `dist/` (excluding host-consumed `staticwebapp.config.json`) matched their live URLs byte-for-byte. Functional, privacy, PWA, accessibility, and claims checks pass. A fresh mobile Lighthouse run of the required demo route does not meet the factory performance/CLS budget, which is release-blocking under the PWA contract.

## First-read result — PASS

Cold live root (`/`) clearly says:

- **What it does:** “Compare sounds with a tiny classifier.”
- **For whom:** “Students and hobbyists” comparing three sounds and their visible fingerprints.
- **What to click first:** **Try it with sample data**; adjacent copy promises “Four ready-made recordings open.”

The action opens `/demo`, immediately shows four realistic samples, and displays the persistent “Demo — sample data, nothing is saved” banner with **Reset demo** and **Start for real**. This meets the plain-words and one-click demo gates.

## Mandatory claims gate — PASS

`.factory/claims.json` exists and declares 15 claims. From the clean checkout, after `npm ci`, every exact `test` command in that file completed successfully against the Playwright demo entry point (one test per invocation):

| Claim IDs | Result |
| --- | --- |
| `demo-sandbox`, `local-processing`, `microphone-consent`, `recording-limit`, `offline-reload` | PASS |
| `storage-persistence`, `csv-export`, `json-roundtrip`, `transparent-classifier`, `local-delete` | PASS |
| `no-account`, `feature-views`, `editable-labels`, `misclassification-mark`, `installable-pwa` | PASS |

The claim suite verifies isolated `demo:sound-pattern-playground` storage, explicit consent, four-second automatic stopping, same-origin request capture, offline reload, persistence, CSV/JSON export, import recovery, three-neighbour evidence, deletion, three editable labels, persisted misclassification marks, and standalone manifest/worker behavior.

## Clean local checks — PASS

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 60 packages, 0 vulnerabilities |
| Unit + integration + browser suite | PASS | `npm test`: 10 Vitest assertions and 22 Playwright tests |
| Type check | PASS | `npm run typecheck` |
| Exact production build | PASS | `npm run build` produced `dist/` |
| Lint | N/A | no lint script/configuration is provided |

Built budgets pass: `index-EIyokojI.js` is 30,409 bytes raw / 11,127 bytes gzip; CSS is 22,294 bytes raw / 5,724 bytes gzip. Both are below the static/PWA 200 KB JS and 50 KB CSS budgets. The largest hero candidate is 89,296 bytes WebP (47,756 bytes AVIF), below the 300 KB mobile image budget.

## Live behavior, recovery, and privacy — PASS

Live Chromium checks used a fake microphone and a fresh browser context:

- Before consent, **Start listening** is blocked with the explicit checkbox recovery message.
- After consent, recorded one clip for each of the three labels, then a test clip; the classifier became ready, showed a guess and exactly three neighbours, and exported `sound-pattern-features-2026-08-28.csv`.
- Invalid dataset import displayed “That file is not a valid Sound Pattern Playground dataset.” and left the four demo recordings intact.
- A full demo request log contained only `https://sound-pattern-playground.sociobot.in` requests; recording, classification, and CSV export added no external request. There were no console or page errors.
- All live internal destination links (`/`, `/demo`, `/privacy/`, `/terms/`) returned 200. The unknown-route policy returns the designed 404.

No backend/API, account/sign-in, billing, library package, CLI, or server-side request allowance exists in this static product; backend concurrency, 429/`Retry-After`, consumer-install, and Entra checks are not applicable.

## Accessibility, browser policy, and PWA — PASS

- Live desktop and 390 × 844 mobile axe 4.13.0 scans: **0 serious/critical violations**. Mobile body width was exactly 390 px; no horizontal overflow.
- The document has `lang=en`, a route-specific title, one `h1`, one `main`, skip link, header/footer, and no browser console/page errors.
- Keyboard-only smoke: first Tab focuses the skip link; Enter moves focus to `#main`; the visible focus outline is `rgb(115, 230, 210) solid 3px`.
- Reduced-motion emulation reduces transition duration to `1e-05s`.
- Live headers include CSP (`default-src 'self'` with restrictive source directives), `Permissions-Policy: microphone=(self), camera=(), geolocation=()`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and HSTS. Hashed JS/CSS are `max-age=31536000, immutable`; `sw.js` is no-store.
- The live service worker is activated, controls the origin, and is scoped to `/`. After first visit, an offline `/demo` reload retained its four samples, banner, and `OFFLINE · LOCAL` state with no errors.
- A controlled local production-worker update changed only the test worker cache name on its second fetch; the new worker activated and the product showed its **A fresh field kit is ready** reload toast. This verifies the update path without modifying product code.
- Manifest has standalone display, versioned start URL, 192/512 icons, and a maskable icon.

## Deployment identity — PASS

Fresh SHA-256 byte comparison fetched all 23 public build files from the live host and compared them to the just-built candidate output. Result: `checked: 23, mismatches: []`. This includes the root and route HTML, hashed JS/CSS, service worker, manifest, images/icons, legal pages, sitemap, robots, and offline/404 assets.

## Release-blocking defect

### Major — `/demo` misses the mobile performance and CLS budgets

Fresh mobile Lighthouse 13.4.1 against the live demo produced:

| Metric | `/demo` result | Required budget |
| --- | ---: | ---: |
| Performance | 77 | >= 90 |
| Accessibility | 100 | >= 95 |
| Best practices | 100 | n/a |
| SEO | 100 | n/a |
| LCP | 1.1 s | < 2.5 s |
| Total blocking time | 740 ms | signals slow interactive work |
| CLS | **0.13** | **< 0.1** |
| Transfer | 53 KiB | within budget |

Lighthouse identifies one 0.13047 layout shift on `body.demo-mode > main#main > section.hero`. The app adds demo state/content after the initial render, moving the hero. This is reproducible on the one-click sandbox route that catalog visitors and the claims suite use. It violates the explicit PWA performance policy even though the normal landing route passes a separate fresh mobile run (Performance 95, Accessibility 100, Best Practices 100, SEO 100; FCP/LCP 1.0/1.1 s; TBT 260 ms; CLS 0; 53 KiB transfer).

**Required repair:** reserve the demo banner/seeded-content layout before first paint and reduce its initialization work, then repeat fresh mobile Lighthouse on both `/` and `/demo` until demo Performance is at least 90 and CLS is below 0.1.

## Decision

**FAIL.** The candidate is deployed correctly and all functional/claims/privacy/accessibility checks pass, but the required one-click demo breaches the factory's mobile Lighthouse and CLS acceptance budget. No other release blockers were found.
