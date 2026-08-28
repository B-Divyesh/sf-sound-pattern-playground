# Repair handoff — Sound Pattern Playground

**Status: repaired; local release gates pass**

- Work order: `sound-pattern-playground-repair-1`
- Repaired candidate: `1eaf5a290cf6d6fd6c2825c97a9d548860c36baf`
- Verifier report commit: `e714cdd8184df61c2bc5466dea26a4e56e6389e7`
- Artifact: static offline PWA (`dist/index.html`)
- Date: 28 August 2026 UTC

## Repairs

1. Added `.factory/claims.json` with 15 observable claims and one unique Playwright test for each claim. A manifest regression verifies IDs and tags stay one-to-one.
2. Added a one-click `/demo` with four useful sound samples, a persistent demo banner, reset and exit actions, direct `?demo=1` support, and the isolated `demo:sound-pattern-playground` IndexedDB database. Starting for real deletes the demo database.
3. Replaced partial import validation with complete schema, date, duration, feature-dimension, metric, label, MIME, unique-ID, and non-empty audio validation. Conversion happens before confirmation; samples and labels then commit in one IndexedDB transaction. Startup also removes legacy corrupt rows.
4. Added restrictive CSP and Permissions Policy headers, immutable asset caching, a no-cache service worker rule, hashed JS/CSS output, and service-worker discovery of hashed build files.
5. Added a host-level 404 override and a designed, accessible 404 page. `/demo` has an explicit host rewrite.
6. Added canonical, Open Graph, Twitter, route-specific title, 1200 × 630 social art, and 180 px Apple touch metadata. Removed the redundant WebP preload.
7. Added skip links to both legal pages, 44 px legal targets, route accessibility coverage, keyboard/reduced-motion coverage, and a 390 px overflow check.
8. Rewrote the first screen to name students and hobbyists, lead with **Try it with sample data**, explain the result, and show three plain facts.

## Regression coverage

- `tests/import-data.test.ts` includes the verifier’s exact malformed payload and dimension/date/audio validation.
- `tests/e2e/claims.spec.ts` covers all 15 claim IDs only through `/demo`, including isolation, same-origin requests, consent, the four-second boundary, persistence, offline reload, JSON/CSV, classification evidence, deletion, and PWA metadata.
- The malformed import browser regression asserts the payload never enters IndexedDB, reload remains healthy, and no page error occurs.
- `tests/static-contract.test.ts` checks the claims mapping, response policy, 404 rule, metadata, immutable caching, and removed preload.
- `tests/e2e/app.spec.ts` retains the real microphone/classification flow and adds demo/legal/404 axe checks plus keyboard, reduced-motion, mobile target, and overflow checks.

## Verification evidence

- Clean install: `npm ci` — 60 packages, 0 vulnerabilities.
- Full suite: `npm test` — 10 Vitest and 22 Playwright tests passed.
- Type check: `npm run typecheck` — passed.
- Production build: `npm run build` — passed; `dist/index.html` exists.
- Bundle output: JS 30.41 KB raw / 11.16 KB gzip; CSS 22.29 KB raw / 5.73 KB gzip; HTML 17.42 KB raw / 4.96 KB gzip.
- Exact claim command smoke: `npm run test:e2e -- --grep @claim:offline-reload` — 1 passed.
- Azure Static Web Apps emulator: `/` 200, `/demo` 200, unknown route 404; root includes CSP and Permissions Policy; hashed JS returns `Cache-Control: public, max-age=31536000, immutable`.
- Axe 4.13.0: zero serious/critical findings on `/`, `/demo`, `/privacy/`, `/terms/`, and `/404.html`.
- Browser checks: desktop and 390 × 844 passed with no horizontal overflow; skip focus, keyboard activation, legal touch targets, and reduced motion passed.
- Offline/update: service-worker-controlled offline reload retained all four demo recordings; the existing controller-change update toast regression remains passing.
- Request privacy: a complete demo recording emitted no cross-origin requests.
- Mobile Lighthouse 13.4.1: performance 100, accessibility 100, best practices 100, SEO 100; FCP 0.9 s, LCP 1.4 s, TBT 0 ms, CLS 0, 53 KiB transfer.

## Run and verify

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run preview
```

The claim inventory contains each standalone verifier command. The demo contract is documented in `.factory/demo.md`; copy counts and terminology are in `.factory/copy-audit.md`.

## Deployment and known gaps

Deployment and live identity evidence will be appended after the committed repair is uploaded with `/opt/fleet/lib/deploy-static.sh sound-pattern-playground dist`. There is no package consumer, backend, API, authentication authority, billing flow, or rate-limit surface for this static PWA. Lab Lighthouse does not provide field INP; browser interactions completed without blocking work and TBT was 0 ms.
