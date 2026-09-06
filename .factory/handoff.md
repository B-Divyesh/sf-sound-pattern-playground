# Handoff — Sound Pattern Playground

**Status: PASS**

- Work order: `sound-pattern-playground-repair-2`
- Implementation SHA: `23081d4190831adf6c25309c11238acf8a181113`
- Previous verification report SHA: `6e7c2cad30272fab6c79b449d5631334fdaa3c9b`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Artifact: static offline PWA
- Verified: 6 September 2026 UTC

## Job, audience, and first action

The product helps students and hobbyists compare three sounds, inspect the
features a small classifier uses, and check its nearest-neighbor guess. On the
first screen, choose **Try it with sample data**; four ready-made recordings
open in the isolated demo.

## Repair

The `/demo` banner previously appeared only after the application module ran.
On a throttled phone this inserted layout above the hero and caused the
reported 0.13 CLS.

- `route-mode.js` now marks the demo URL in the document head before body
  layout. CSS shows the demo banner and reserves the matching header position
  from the first paint.
- The demo’s canvas work is scheduled one idle task at a time, and initial
  rendering no longer duplicates the specimen/feature views. The demo is
  populated immediately; its decorative canvases yield between draws.
- Added an outcome-based browser regression test: it blocks the app bundle,
  verifies the visible demo shell is already complete, then measures a mobile
  layout-shift total below 0.01.
- Kept the route-mode shell in the PWA precache and made its host cache policy
  revalidate on every load.
- Removed remaining decorative/mood copy from the product, legal pages, and
  404 page. The refreshed copy audit is in `.factory/copy-audit.md`.

## Verification

From the documented clean setup:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

- `npm ci`: pass; 60 packages, 0 vulnerabilities.
- `npm test`: pass; 10 Vitest assertions and 23 Playwright checks.
- `npm run typecheck` and `npm run build`: pass; `dist/` created.
- Every exact command in `.factory/claims.json`: pass individually (15/15).
- Built initial JavaScript is 30.78 KB raw / 11.32 KB gzip; CSS is 22.13 KB
  raw / 5.74 KB gzip.

Fresh live checks after deployment:

- SHA-256 comparison: all 24 deployable files matched `dist/` byte-for-byte.
- Fresh desktop and 390 px phone contexts identify the job, audience, and
  sample action without scrolling. The demo shows four recordings, a sample
  guess, the persistent banner, Reset demo, and Start for real. Reset restores
  all four samples; Start for real deletes the `demo:sound-pattern-playground`
  database before opening the real collection. No console or page errors and
  no mobile horizontal overflow appeared.
- Live axe 4.13 scans on `/`, `/demo`, `/privacy/`, `/terms/`, and the designed
  404 produced zero serious/critical violations on desktop and phone.
- Live headers include CSP, `Permissions-Policy: microphone=(self)`, HSTS,
  `Referrer-Policy`, and `X-Content-Type-Options`. The unknown URL returns the
  designed page with HTTP 404.
- A fresh live worker controlled `/demo`; after going offline, reload retained
  the four samples and showed `Offline · local`, with no errors.
- Lighthouse 13.4 mobile preset, fresh live run:

| Route | Performance | Accessibility | CLS | TBT | LCP |
| --- | ---: | ---: | ---: | ---: |
| `/` | 100 | 100 | 0 | 0 ms | 1.54 s |
| `/demo` | 99 | 100 | 0 | 120 ms | 1.53 s |

## Earlier findings

All earlier verification findings remain resolved: the isolated one-click demo,
claim manifest/tests, atomic import validation, headers, metadata, designed
404, immutable built assets, legal skip links/targets, and redundant hero image
preload were checked in the previous verification and retained in this build.
The prior release blocker—mobile `/demo` CLS and performance—is resolved by
this implementation SHA.

## Deployment and scope

`dist/` was deployed to the existing production Static Web App
`sf-sound-pattern-playground` with its existing `staticwebapp.config.json`.
No backend, account, billing, external AI feature, tracking, or paid offer is
part of this free local-first product; those checks are not applicable.

## Known gaps and next steps

No release-blocking gaps are known. The classifier remains deliberately small,
local, and illustrative; it must not be used for identity, emotion, health,
medical, safety, or sensitive-trait decisions.
