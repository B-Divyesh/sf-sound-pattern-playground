# Independent verification — Sound Pattern Playground

**Verdict: FAIL**

- Work order: `sound-pattern-playground-verify-1`
- Candidate: `1eaf5a290cf6d6fd6c2825c97a9d548860c36baf`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Verified: 2026-08-28 UTC
- Artifact: static offline PWA

The live deployment exactly matches the candidate, and the implemented recording flow is substantially functional. The release nevertheless fails two explicit acceptance gates: the required claims manifest/tests do not exist, and the required one-click sample-data demo does not exist. A malformed import can also persist corrupt data before reporting failure.

## Mandatory gates

### 1. Claims gate — FAIL (release blocker)

The first repository check at the candidate commit returned:

```text
$ git rev-parse HEAD
1eaf5a290cf6d6fd6c2825c97a9d548860c36baf
$ sed -n '1,240p' .factory/claims.json
sed: can't read .factory/claims.json: No such file or directory
```

`.factory/claims.json` is missing, so there were no claim tests to run from the demo entry point. `.factory/demo.md` is also missing. The claims contract states that either condition blocks release.

The live UI and README nevertheless make many claim-like statements with no claims inventory or dedicated `@claim:<id>` tests. Examples include “Local only,” “Works offline,” “without sending a recording anywhere,” “Audio stays in this browser,” four-second recording, IndexedDB persistence, JSON/CSV export, no tracking, and no cloud inference.

### 2. Cold first-read and demo gate — FAIL (release blocker)

Cold desktop and 390 × 844 mobile loads showed this first screen:

- What it does: collect three sounds, show visible fingerprints, and challenge a nearest-neighbor classifier.
- For whom: not stated. The researched audience—students and hobbyists experimenting with a microphone—does not appear on the first screen.
- What to click first: “Open the field kit.”
- Required sample action: absent. There is no “Try it with sample data” action.

Fresh `/demo` evidence:

```text
URL: https://sound-pattern-playground.sociobot.in/demo
Title: Sound Pattern Playground — See what a tiny classifier hears
Sample-data actions: 0
Demo banners: 0
```

`/demo` is only the production SPA fallback. Editing Sound A to `Demo leak` at `/demo`, then visiting `/`, restored `Demo leak` from the same `sound-pattern-playground` IndexedDB. There is no seeded sample, demo banner, Reset demo, Start for real, or isolated `demo:` namespace. `/?demo=1` behaves the same way.

## Clean checkout and automated gates

The checkout was clean and pointed at the requested candidate before installation.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 58 packages installed; 0 vulnerabilities |
| `npm test` | PASS | 4 Vitest tests and 4 Playwright tests passed |
| Type check | PASS | `tsc --noEmit` runs inside the build |
| Lint | N/A | no lint script or lint configuration exists |
| `npm run build` | PASS | Vite 7.3.6 emitted `dist/` |

Production bundle output:

```text
dist/index.html      15.67 kB │ gzip: 4.63 kB
dist/assets/app.css  21.23 kB │ gzip: 5.51 kB
dist/assets/app.js   24.88 kB │ gzip: 9.35 kB
```

The static product has no library/CLI package, backend, API endpoint, sign-in, or product-unlock request. Consumer-package, backend concurrency/health, API rate-limit, and Entra authority checks are therefore not applicable.

## End-to-end product checks

### Normal and boundary behavior — PASS

Tested on the live URL with Chromium 140 and a fake microphone:

- Starting without consent produced “Check the consent box…” and moved focus to the checkbox.
- A simulated `NotAllowedError` produced the specific browser-site-controls recovery instruction.
- A clip stopped at about 100 ms was rejected with a specific recovery message.
- One clip for each of Tap, Hum, and Clap made the classifier ready.
- A test clip produced a guess, a plain explanation, and exactly three neighbor rows.
- The four-second boundary auto-stopped at `00:04.0` and saved a `4.0 seconds` specimen.
- CSV export produced one header plus four data rows; JSON export contained four recordings and all three labels.
- Four recordings survived reload in IndexedDB.
- Invalid JSON text was rejected with a useful message.
- The erase dialog focused “Keep my data,” Escape returned focus to “Erase all local data,” and confirmation reduced the collection to zero.

### Invalid import recovery — FAIL (major)

An incomplete but superficially matching payload was accepted far enough to write a broken record:

```json
{"schemaVersion":1,"labels":["A","B","C"],"samples":[{"id":"broken","audioData":"data:audio/webm;base64,","vector":[]}]}
```

Observed sequence:

1. Import reported “That file is not a valid Sound Pattern Playground dataset.”
2. The UI nevertheless showed `1 recording on this device`.
3. Reload emitted `RangeError: Invalid time value` and left the corrupt record stored.

The validator checks only `id`, `audioData`, and whether `vector` is an array. It does not validate required dates, metrics, feature dimensions, or audio data before committing the batch. Import must validate completely and atomically before writing.

## Accessibility and responsive behavior

- Live axe 4.13.0: zero serious/critical findings on `/`, `/privacy/`, `/terms/`, `/demo`, and an unknown route.
- Root semantics: `lang=en`, descriptive title, one `h1`, one `main`, header, footer, and skip link.
- Keyboard smoke test: skip link was first; native links, inputs, and buttons followed in logical order. Focus rendered as a visible 3 px cyan outline.
- Dialog focus placement and return worked.
- Reduced-motion emulation matched and reduced transitions/animations to `0.01 ms`; smooth scrolling became `auto`.
- At 390 × 844 the primary action was visible and horizontal overflow was 0 px. The field kit stacked in the intended order.
- Remaining minor gaps: Privacy and Terms have no skip link; the mobile Terms link measures about 41 × 44 CSS px, below the strict 44 × 44 target.

## Privacy, requests, and response policy

### Privacy behavior — PASS

Across the full live record/classify/export/reload/offline flow, 21 browser requests were observed. Every request was same-origin; no API, analytics, CDN, font, inference, or third-party request appeared. There were no failed responses, console errors, or page errors in the valid flow. Microphone use required the explicit checkbox. Local persistence and full erasure worked.

### Security headers — FAIL

The live root returns HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does not return a `Content-Security-Policy` header, contrary to the site-structure acceptance contract. It also has no `Permissions-Policy` restricting microphone/camera access.

### Routing and metadata — FAIL

- `/does-not-exist` returns HTTP 200 and the complete home app, not a designed 404.
- `/demo` returns the same home app and home title, not a demo route.
- Root and legal pages omit canonical metadata, Open Graph metadata, Twitter card metadata, and the required product social image.
- Privacy and Terms otherwise return 200 with route-specific titles, one `h1`, and one `main`.

## PWA and offline behavior

- Manifest parsed through Chromium with zero errors; 192, 512, and 512 maskable icons have the declared dimensions.
- Service worker activated and controlled the live page using cache `sound-field-kit-v2`.
- After first load, a fully offline reload restored the field kit and all four saved recordings; the status changed to `OFFLINE · LOCAL`.
- A production-build update simulation changed the worker bytes, activated the new worker, and displayed “A fresh field kit is ready. Reload.”
- All deployed assets, including `sw.js`, use `Cache-Control: public, must-revalidate, max-age=30`. App JS/CSS filenames are stable rather than content-hashed, so the required long-lived immutable asset caching policy is not implemented.

## Performance

Fresh mobile Lighthouse 13.4.1 against the live URL:

| Measure | Result |
| --- | ---: |
| Performance | 92 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 1.1 s |
| LCP | 1.3 s |
| TBT | 340 ms |
| CLS | 0 |
| Total transfer | 93 KiB |

JavaScript, CSS, image, LCP, CLS, and category-score budgets pass. The page preloads the 44 KB WebP hero while the picture element selects the 22 KB AVIF, so both image variants download on a capable browser; this is avoidable transfer overhead. Lab Lighthouse does not provide field INP, so the `< 200 ms` INP target was not independently established.

## Deployment identity

Every one of the 20 files in the fresh `dist/` was fetched from the corresponding live path and compared by SHA-256. All 20 matched byte-for-byte, including `index.html`, app JS/CSS, all images/icons, legal pages, manifest, service worker, robots, and sitemap.

The live deployment therefore matches candidate `1eaf5a290cf6d6fd6c2825c97a9d548860c36baf`. The FAIL is not deployment-only.

## Defects by severity

### Release blockers

1. `.factory/claims.json` and all mandatory per-claim demo tests are missing; live and README claims are unlisted.
2. The cold first screen does not name its audience and has no one-click sample-data demo. `/demo` is not a sandbox and shares real IndexedDB state.

### Major

3. A malformed imported dataset can be persisted before the import fails, causing a runtime `RangeError` on reload.

### Moderate

4. The live response has no CSP (and no microphone-focused Permissions Policy).
5. Unknown paths return the home app with HTTP 200; there is no real 404.
6. Required canonical/social metadata is absent.
7. Static assets are unversioned and served with only a 30-second cache lifetime.

### Minor

8. Legal pages lack skip links, and one mobile footer link is narrower than 44 px.
9. The hero preload downloads a WebP that is unused when AVIF is selected.

## Release decision

**FAIL. Do not release this candidate.** Resolve both release blockers and the import corruption defect, add claim-tagged tests that run exclusively through an isolated sample demo, then repeat independent verification.
