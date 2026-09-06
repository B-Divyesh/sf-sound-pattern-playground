# Verify sound comparison and classifier evidence — round 3

**Verdict: FAIL — the current Safari/WebKit path cannot run the sample demo.**

- Work order: `sound-pattern-playground-verify-3`
- Implementation candidate: `23081d4190831adf6c25309c11238acf8a181113`
- Documentation reviewed: `75d70fe7de9c992d351d1194e14bff1675f2f19b`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Verified: 6 September 2026 UTC
- Artifact: static offline PWA
- Findings: **5** (1 major, 1 moderate, 3 minor)
- Untested public claims: **1**

The implementation and documentation SHAs differ only because the later commit
updates `.factory/handoff.md`. A fresh build has 24 host-served files, excluding
the host-consumed `staticwebapp.config.json`; all 24 match the live responses
byte for byte. `/` and `/demo` also match `dist/index.html` byte for byte.

## Job, audience, and first action before scrolling

The job is to compare three sounds and inspect the features behind a small
nearest-neighbor classifier. The audience is students and hobbyists learning
what an on-device sound classifier notices. The first action is **Try it with
sample data**; the next line says that four recordings will open.

Fresh desktop and 390 × 844 phone sessions showed that information, the primary
action, and the three privacy/offline/price facts without scrolling. Neither
viewport had horizontal overflow.

## Findings

### F-01 — Major — The sample demo fails in current WebKit/Safari

The README requires “a current Chromium, Firefox, or Safari browser.” The live
demo works in Chromium 145 and Firefox 146, but it does not work in WebKit 26.

Fresh WebKit 26 result at `/demo`:

- HTTP 200 and the correct `Demo — Sound Pattern Playground` title;
- the demo banner is visible;
- the promised four recordings never appear;
- the page shows `0 recordings on this device`;
- the status says `Local storage is unavailable. Leave private browsing or
  allow site data before recording.`;
- **Reset demo** leaves the count at zero and reports `The demo could not reset.
  Reload and try again.`

An isolated same-origin IndexedDB check confirmed that a transaction storing
the audio `Blob` aborts in this WebKit runtime. The sample therefore cannot be
persisted and the first useful demo output, feature views, and classifier result
never appear. Evidence: `/work/.evidence/webkit-demo-failure.png`.

The public Safari/browser-support statement is not in `.factory/claims.json`,
and `playwright.config.ts` runs only `Desktop Chrome`. This is the one untested
public claim counted in this report. Add a declared cross-browser claim and test
the stored-audio path in WebKit, or narrow the public browser support statement.

### F-02 — Moderate — The offline fallback misses required recovery-page basics

`/offline.html` is precached as the PWA fallback, but it has no skip link. Its
only action is 139 × 19 CSS pixels rather than the required 44-pixel height. It
also omits canonical/social metadata and the standard navigation/footer links.

Its heading and action use the prohibited phrases `The shore is quiet`,
`Offline field note`, and `Open the field kit`. They do not state the offline
condition and recovery action in plain words. Ordinary offline `/demo` reload
works, so this affects the fallback page rather than the normal cached route.

### F-03 — Minor — Some root and demo navigation targets are too narrow

In fresh desktop measurements, the header **Demo** link is 39 × 44 CSS pixels.
The root/demo footer **Terms** link is 41 × 44 pixels on desktop and phone.
The strict accessibility and site-structure contract requires every touch or
click target to be at least 44 × 44 pixels. Visible focus itself passes with a
3-pixel cyan outline.

### F-04 — Minor — Product copy still breaks its plain-word terminology rules

The main page says `No sound under the lens yet`, `Ready for a mystery sound?`,
and `specimen`. These are metaphorical or competing names for the documented
terms `recording` and `test sound`. The offline page also uses `field note`,
`shore`, and `field kit`.

`.factory/copy-audit.md` says the landing page has no metaphors or mood headings,
but it omits those headings and marks `specimen` as acceptable even though its
own terminology table says the item is a `recording`.

### F-05 — Minor — Legal and 404 footers do not use the required site footer

The shared site-structure contract requires every route footer to include the
product one-line description, Privacy, Terms, Param Factory attribution, and a
version. The Privacy footer omits Privacy and the factory attribution; the
Terms footer omits Terms and the attribution; the 404 footer contains only the
product name and version. These routes otherwise have the correct title,
single `h1`, main landmark, skip link, and designed content.

## Declared claim commands

From the clean checkout, `npm ci` installed 60 packages with zero reported
vulnerabilities. Every exact command declared in `.factory/claims.json` was run
as its own process.

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `local-processing` | PASS |
| `microphone-consent` | PASS |
| `recording-limit` | PASS |
| `offline-reload` | PASS |
| `storage-persistence` | PASS |
| `csv-export` | PASS |
| `json-roundtrip` | PASS |
| `transparent-classifier` | PASS |
| `local-delete` | PASS |
| `no-account` | PASS |
| `feature-views` | PASS |
| `editable-labels` | PASS |
| `misclassification-mark` | PASS |
| `installable-pwa` | PASS |

Each declared ID occurs exactly once in `tests/e2e/claims.spec.ts`. The commands
pass in their configured Chromium sandbox. F-01 remains because the public
Safari support statement is not declared and the same demo fails in WebKit.

## Local quality gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages, 0 vulnerabilities |
| `npm test` | PASS — 10 Vitest assertions and 23 Playwright checks |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — `dist/` created with root `index.html` |

The built JavaScript is 30,777 bytes raw / 11,299 bytes gzip. CSS is 22,130
bytes raw / 5,719 bytes gzip. Both remain well below the product budgets.

## Live functional and recovery checks

Chromium checks used new contexts and a fake microphone.

- The sample action opened `/demo` with four recordings: desk tap, bottle hum,
  hand clap, and a test tap.
- The persistent banner said sample data is not saved to the collection. It
  remained at the top after scrolling.
- The populated output showed three non-empty chart descriptions, a `Desk tap`
  guess, and three neighbor-distance rows.
- Reset restored the four samples and `Desk tap` label.
- A real label set before demo entry remained unchanged after demo edits, reset,
  and **Start for real**. The demo database was deleted; the real database and
  its label remained.
- `/?demo=1` loaded the same sandbox. Browser Back restored it after exit.
- Starting without consent reported the required action and focused consent.
- Simulated permission denial gave browser-controls recovery guidance.
- Duplicate labels produced a specific error and accepted a corrected value.
- The earlier malformed import payload was rejected before storage; four sample
  rows remained before and after reload, with no page error.
- Escape closed the erase dialog and returned focus to **Erase all local data**.
- A manual short recording saved, CSV downloaded, and the four-second boundary
  stopped at `00:04.0` with a `4.0 s` row.
- Chromium 145 and Firefox 146 loaded, exported, edited, and reloaded the demo.
  WebKit 26 failed as described in F-01.

No backend, tenant, API, account, billing, CLI, library package, or desktop
binary exists. Backend isolation, restart persistence, health, 429/Retry-After,
and clean consumer-install checks are not applicable.

## Accessibility, privacy, PWA, routes, and performance

- The required `verify-url.sh` passed: descriptive title, `lang=en`, one `h1`,
  a main landmark, alt text, and no root console errors.
- Fresh axe 4.13 Playwright scans on `/`, `/demo`, `/privacy/`, `/terms/`, the
  designed 404, and `/offline.html` found zero serious or critical violations
  on desktop and phone. F-02 and F-03 are manual contract findings.
- Keyboard smoke passed: the first Tab reaches the skip link; Enter focuses
  `main`; reduced-motion changes transitions to `0.00001s`.
- The normal live demo made no cross-origin requests. Audio/classification
  stayed on the origin, and the tested flow produced no console or page errors.
- A fresh controlled service worker kept four samples and a changed label after
  an offline reload. The status changed to `Offline · local`.
- Privacy deletion is available in the app and documented on `/privacy/`.
- Root, demo, Privacy, and Terms return 200. The unknown URL returns the styled
  404 with HTTP 404; its expected failed-resource console line is not a defect.
- All discovered valid internal destinations return 200. Route titles are
  specific, and canonical/Open Graph/Twitter metadata exists on root, legal,
  and 404 pages.
- Live security headers include CSP, `Permissions-Policy: microphone=(self)`,
  HSTS, Referrer-Policy, nosniff, and frame denial. Hashed assets are immutable;
  the worker is no-store and route-mode revalidates.

Fresh Lighthouse 13.0.1 mobile runs:

| Route | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 100 | 100 | 100 | 100 | 1.1 s | 20 ms | 0 |
| `/demo` | 97 | 100 | 100 | 100 | 1.1 s | 190 ms | 0 |

Both transferred 53 KiB in the Lighthouse run. The earlier `/demo` performance
and CLS blocker is resolved at the implementation candidate.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Claims manifest and per-claim tests missing | Resolved — 15 declared commands pass individually |
| No one-click isolated demo | Resolved in Chromium/Firefox; WebKit failure is new F-01 |
| Malformed import persisted corrupt data | Resolved — live reject is atomic and survives reload |
| CSP and Permissions Policy missing | Resolved — present live |
| Unknown paths returned home with 200 | Resolved — designed HTTP 404 |
| Canonical and social metadata missing | Resolved on root/legal/404 routes |
| Assets unversioned and short cached | Resolved — hashed immutable JS/CSS |
| Legal skip links and 41-pixel target | Resolved on legal pages; root/demo targets remain F-03 |
| Redundant hero preload | Resolved — no redundant preload remains |
| `/demo` mobile Performance 77 and CLS 0.13 | Resolved — Performance 97 and CLS 0 |

## Decision

**FAIL.** The sample demo and stored-audio path fail in a current WebKit engine
despite the public Safari support statement. Four additional contract findings
remain. Release requires zero findings and zero untested claims.
