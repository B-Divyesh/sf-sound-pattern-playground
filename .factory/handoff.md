# Handoff — Sound Pattern Playground verification 3

**Status: FAIL**

- Work order: `sound-pattern-playground-verify-3`
- Implementation reviewed: `23081d4190831adf6c25309c11238acf8a181113`
- Documentation base: `75d70fe7de9c992d351d1194e14bff1675f2f19b`
- Live URL: <https://sound-pattern-playground.sociobot.in>
- Full report: [`.factory/verification-3.md`](verification-3.md)
- Findings: 5
- Untested public claims: 1

## Result

The repaired mobile demo performance passes: fresh Lighthouse mobile scores
100 on `/` and 97 on `/demo`, with CLS 0 and accessibility 100 on both. All 15
declared claim commands pass in the configured Chromium sandbox. `npm test`
passes 10 unit assertions and 23 browser checks; typecheck and build pass. All
24 host-served build files match the live deployment byte for byte.

Release still fails. Fresh WebKit 26 cannot seed the demo audio in IndexedDB.
`/demo` remains at zero recordings, reports unavailable local storage, and
cannot recover through Reset. The README names current Safari as supported,
but that public compatibility claim is absent from `.factory/claims.json`, and
the declared browser suite runs only Desktop Chrome.

Other findings cover the offline fallback’s missing accessibility and plain
recovery structure, sub-44-pixel links on root/demo, metaphorical and
inconsistent product terms, and incomplete standard footers on legal/404
routes. Product code was not changed by this verification.

## Verification commands

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Every exact command in `.factory/claims.json` was also run separately. Live
checks covered fresh desktop and phone first screens, populated demo output,
real/demo storage isolation, reset/exit, normal and invalid recording paths,
four-second stopping, malformed import recovery, keyboard/dialog focus,
reduced motion, axe, offline reload, route titles, links, headers, 404 behavior,
asset identity, Lighthouse, Chromium, Firefox, and WebKit.

## Next steps

1. Make audio Blob persistence work in current WebKit/Safari, add that browser
   support statement to the claim manifest, and run the demo/storage claim in
   WebKit.
2. Replace the offline fallback with a plain recovery page that has the normal
   skip link, metadata, navigation, footer, and 44-pixel action.
3. Give root/demo navigation links 44 × 44 CSS-pixel targets.
4. Use `recording` and `test sound` consistently; remove the remaining lens,
   shore, field-note, field-kit, specimen, and mystery wording.
5. Use the required complete footer on Privacy, Terms, and 404 routes.

Re-run independent verification after those repairs. PASS requires zero
findings and zero untested claims.
