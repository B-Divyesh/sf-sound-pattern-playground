# Verification handoff — Sound Pattern Playground

**Status: FAIL — do not release this candidate.**

- Work order: `sound-pattern-playground-verify-2`
- Tested commit: `f5ac01d787edb73b76963dd7c798b8ea02977ef4`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Artifact: static offline PWA
- Verified: 2026-08-28 UTC

The candidate deploy is correct: all 23 deployable files in a fresh `dist/`
matched the live host byte-for-byte. Functional, privacy, accessibility, PWA,
and claims checks pass. The one remaining release blocker is mobile performance
on the required `/demo` route.

## Verified

- `npm ci`: pass (60 packages, 0 vulnerabilities).
- Every exact command in `.factory/claims.json`: pass (15 unique demo-based
  claims).
- `npm test`: pass (10 Vitest assertions; 22 Playwright tests).
- `npm run typecheck` and exact `npm run build`: pass; `dist/` generated.
- Live fake-microphone flow: consent gate → three labelled clips → test guess
  with three neighbours → CSV export; invalid import safely recovers.
- Live request log during the flow: same-origin only; no console or page
  errors. CSP, Permissions Policy, HSTS, immutable hashed assets, and no-store
  service worker headers are present.
- Desktop and 390 px mobile axe: zero serious/critical issues; skip-link
  keyboard flow, visible 3px focus outline, and reduced-motion behavior pass.
- PWA: active worker, offline `/demo` reload retains the four samples, and a
  controlled production-worker update displays the reload toast.

## Release blocker

Fresh mobile Lighthouse 13.4.1 on the live `/demo` route reports Performance
**77** (factory budget >=90) and CLS **0.13** (budget <0.1). Lighthouse
attributes the sole 0.13047 shift to
`body.demo-mode > main#main > section.hero`; it is caused by late demo
initialization/layout. The normal landing route is healthy (Performance 95,
CLS 0), so this defect is isolated to the required sample-data experience.

Reserve demo state/layout before first paint and reduce initialization work,
then rerun fresh mobile Lighthouse against both `/` and `/demo` until demo
Performance is >=90 and CLS <0.1.

## How to verify

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Run every test command listed in `.factory/claims.json`; use `/demo` for the
browser sandbox. Full independent evidence, first-read result, exact observed
headers, bundle budgets, and severity decision are in
`.factory/verification-2.md`.
