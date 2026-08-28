# Build handoff — Sound Pattern Playground

Work order: `sound-pattern-playground-build-1`

Completed: 2026-08-28

Deploy type: static PWA (`dist/`)

## What was built

- A production Vite + vanilla TypeScript PWA with no runtime dependencies.
- An explicit-consent microphone flow for 1–4 second clips, clear denied/
  unsupported/storage error states, live feedback, and automatic stop.
- Exactly three editable local sound labels with collection progress and
  readiness guidance.
- Waveform, time/frequency trail, and eight-coefficient MFCC-like canvas views;
  every chart has a useful text alternative and a plain-language observation.
- A transparent 3-nearest-neighbor baseline using normalized spectral bands,
  including the nearest examples, numeric distances, vote explanation, tie
  behavior, and a persistent misclassification mark.
- IndexedDB persistence for audio, features, labels, predictions, and workshop
  notes; state survives reload/tab close.
- JSON export/import with recordings and merge confirmation, features CSV
  export, per-recording deletion confirmation, and confirmed full erasure.
- Install manifest, 192/512/maskable icons, versioned service-worker shell
  cache, cache-first assets, network-first navigation, offline fallback, and an
  update/reload toast.
- Responsive keyboard/touch UI, deliberate 390 px sequence, visible focus,
  reduced-motion fallback, semantic landmarks, legal/privacy routes, and safe-
  use language throughout.
- An original cinematic wetland field-station hero. Source PNG and full prompt
  sidecar are in `assets/src/`; shipped AVIF/WebP/JPEG variants are all well
  below the 300 KB mobile hero budget. Provenance is recorded in
  `.factory/design.md` and disclosed in the footer.

## Verification

Run from a clean clone:

```sh
npm install
npm test
npm run build
```

Results on 2026-08-28:

- `npm audit`: 0 vulnerabilities.
- `npm test`: 4 unit tests + 4 Playwright tests passed.
- Playwright full flow: captured Tap/Hum/Clap with the fake audio device,
  reached classifier-ready, captured a mystery clip, rendered three neighbors,
  marked a misclassification, and downloaded feature CSV.
- Playwright offline: waited for service-worker activation, set the browser
  context fully offline, reloaded, and restored the functional field-kit shell.
- Playwright mobile: 390 × 844 viewport, primary capture action visible, no
  horizontal overflow.
- Playwright console: no console errors on initial load.
- axe-core 4.13.0: no serious or critical violations.
- Production build: `dist/index.html` exists at the deploy root.
- Bundle sizes: JS 24.88 KB raw / 9.35 KB gzip; CSS 21.23 KB raw / 5.51 KB
  gzip; no font payload.

Mobile Lighthouse 13.4.1 against the production preview:

| Category / metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| Largest Contentful Paint | 1.7 s |
| Total Blocking Time | 50 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.0 s |

Hero assets: AVIF 24 KB mobile / 48 KB desktop; WebP 44 KB / 88 KB; JPEG
fallback 76 KB. Initial JavaScript and CSS are far below the 200 KB / 50 KB
budgets.

## Known limits

- The feature trail samples Web Audio analyser frames during capture. It is an
  intentionally understandable learning approximation, not a standards-grade
  MFCC implementation or trained neural audio model.
- MediaRecorder’s container/codec varies by browser. Export preserves the
  browser-provided MIME type; very old browsers without MediaRecorder are
  rejected with a useful message.
- A class can become usable with one example, but three or more varied examples
  per sound are recommended in the interface.

## Suggested next steps

- Workshop-test the success measure with students and refine the feature
  explanation copy around the misunderstandings they actually report.
- If the curriculum needs reproducibility across devices, add an optional
  decoded-PCM WAV export while retaining the current local-only defaults.
- Add a small confusion-matrix view after enough marked test sounds exist.
