# Sound Pattern Playground

Sound Pattern Playground is a private, offline-capable learning instrument for
students and hobbyists who want to understand what a small sound classifier
notices. Record short examples for three labels, inspect waveform,
frequency-trail, and MFCC-like summaries, then challenge a transparent
nearest-neighbor baseline and inspect every vote.

Live product: <https://sound-pattern-playground.sociobot.in>

## Why it exists

Audio tutorials often jump from a recording to a model result. This playground
keeps the evidence visible: it shows the feature differences, distances, and
misclassifications between the two. It is deliberately not an emotion,
identity, medical, surveillance, or safety classifier.

## Product behavior

- Explicitly requests microphone access only after the user checks consent.
- Records clips up to four seconds and stores them in browser IndexedDB.
- Defines exactly three editable action/object sound labels.
- Draws an accessible waveform, frequency trail, and eight-coefficient
  MFCC-like summary with plain-language alternatives.
- Runs 3-nearest-neighbor classification in the browser and lists the exact
  examples, distances, and votes behind each guess.
- Marks misclassifications for workshop discussion.
- Exports/imports a portable JSON dataset with audio and exports a features CSV.
- Deletes individual recordings or all local data after confirmation.
- Installs as a PWA and restores the full field kit offline.
- Includes `/privacy/` and `/terms/` pages. There is no account, tracking,
  third-party runtime script, CDN font, or cloud inference.

## Develop

Requirements: Node.js 20+ and a current Chromium, Firefox, or Safari browser.
Microphone capture requires HTTPS in production; `localhost` is treated as a
secure context during development.

```sh
npm install
npm run dev
```

Open the local URL Vite prints. The first recording triggers the browser’s
microphone permission prompt.

## Test and build

```sh
npm test
npm run build
```

`npm test` runs feature/classifier unit tests and Playwright end-to-end tests for
the full capture/classification/export path, axe accessibility, a 390 px layout,
console errors, and an offline service-worker reload. Playwright 1.58.2 is
pinned; its Chromium browser must be installed when it is not supplied by the
worker environment.

The exact production build command is `npm run build`. It emits the static site
to `dist/`, with `dist/index.html` at its root. Preview it locally with:

```sh
npm run preview
```

Deploy the contents of `dist/` to any static host with HTTPS. The host should
serve directory indexes for `/privacy/` and `/terms/`; the root application
otherwise has no server dependency.

## Implementation

The runtime is Vite + vanilla TypeScript and browser platform APIs: Web Audio,
MediaRecorder, Canvas, IndexedDB, and a hand-written service worker. There are
no production dependencies. The classifier uses Euclidean distance over a
normalized 12-band spectral fingerprint plus a small energy term; a vote is not
a probability.

The product-specific cinematic field-station system and generated-art
provenance live in [`.factory/design.md`](.factory/design.md). Build and quality
evidence is in [`.factory/handoff.md`](.factory/handoff.md).

## Privacy and safe use

Record only sounds you have permission to capture. Audio remains in this
browser unless the user explicitly exports a file. Never use the illustrative
features or baseline to infer emotions, identity, health, safety, or personal
traits. Use the visible **Erase all local data** control or clear site storage to
remove the complete dataset.

## License

MIT — see [LICENSE](LICENSE).
