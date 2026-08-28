# Sound Pattern Playground — visual thesis

## Direction: cinematic environmental art

The product is an **acoustic field station at twilight**: a sheltered desk beside
a dark, still lake where every sound becomes a visible ripple. This world fits
the job because it makes listening feel attentive and exploratory without
pretending the baseline classifier is magical. The environmental scene sets the
context; the live waveform, spectrum, feature trail, and specimen labels remain
the visual protagonists.

This is intentionally a single dark treatment. Microphone capture benefits from
a stable, low-glare "listening room," and the warm/cool contrast keeps controls
legible without switching the atmosphere mid-experiment.

## Palette

Derived from peat water, moonlit mist, wet reeds, a brass field recorder, and a
red recording lamp.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#071311` | page background / deepest lake |
| `--pine` | `#0d211e` | raised surface |
| `--pine-2` | `#14302b` | controls / chart wells |
| `--paper` | `#f4f0df` | primary text (13.6:1 on pine) |
| `--mist` | `#b8c7bd` | secondary text (7.8:1 on ink) |
| `--signal` | `#73e6d2` | features, focus, selection |
| `--signal-ink` | `#05201b` | text on signal |
| `--brass` | `#f2bd65` | labels, learned examples |
| `--record` | `#ff746c` | recording and destructive warning |
| `--success` | `#8cdda1` | confirmed local save |

Color never carries state alone: icons, copy, stroke patterns, and live text
always accompany it.

## Typography

- **Headings / narrative:** Charter, Cambria, Georgia, serif. Broad, editorial
  shapes feel like field notes and soften the technical subject.
- **Controls / data:** Inter/system UI stack. Compact, neutral, and clear at
  small sizes. Numbers use tabular figures.
- No web fonts are requested at runtime; both stacks are local system families.
- Scale: 14 / 16 / 19 / 24 / 34 / clamp(44–72) px. Body is never below 16 px.
  Reading measure is capped at 68 characters.

## Spacing and shape

- Base rhythm: 4 px; working intervals: 8, 12, 16, 24, 32, 48, 72 px.
- Content width: 1180 px. Dense lab layouts use a 7/5 split; phones stack into
  one deliberate sequence: listen → inspect → label → compare.
- Corners are 6–18 px, like weatherproof equipment rather than soft generic
  cards. Borders are quiet 1 px mist lines at low opacity.
- Buttons and fields are at least 44 px high with 8 px separation.

## Interaction grammar

- The primary action is a physical **Listen** control, always paired with a
  microphone icon and explicit consent copy before browser permission.
- Listening expands from the live monitor: the red lamp illuminates, the
  duration counts, and charts draw left-to-right from their origin.
- Captures become "specimens" placed on a horizontal field strip. Selecting one
  updates all feature views and a plain-language observation.
- The three label stations resemble engraved instrument tabs, not dashboard
  badges. Classifier votes are shown as neighbor distances, so confidence never
  appears as an unexplained oracle score.
- Destructive deletion names the exact scope and requires confirmation. Import
  explains replacement/merge behavior before committing.

## Motion policy

- UI transitions run 180–260 ms using opacity and transform only.
- One intentional continuous motion exists while recording: a slow red lamp
  pulse and the live chart trace. It stops with recording and never flashes.
- New specimens rise 8 px from the capture strip; classifier votes travel from
  neighbor rows into the result bar.
- Under `prefers-reduced-motion: reduce`, all transforms and pulses become
  immediate opacity/state changes; live data still updates without animation.

## Asset plan and provenance

### Hero/environment plate

Subject: a compact acoustic field desk beside a nocturnal wetland, a small
field microphone pointing toward water, concentric ripples visualizing sound,
mist and reeds creating depth. Materials: blackened wood, weathered brass,
frosted glass, damp stone. Light: blue-green moonlight with a restrained warm
recorder lamp. Lens: cinematic 35 mm, low eye level, generous negative space at
left for title copy. Palette words: peat black, deep pine, sea-glass cyan, mist
cream, brass amber, recording coral.

Negative list: people, animals as focal subjects, readable text, letters,
logos, brands, watermarks, screens with UI, neon cyberpunk, generic gradient,
oversaturated colors, magical holograms, anatomical ears.

Generation prompt:

> Cinematic environmental concept art for an educational sound playground: a
> compact acoustic field station on a blackened wood platform beside a still
> wetland at blue hour, a small unbranded field microphone aimed across dark
> water, subtle concentric ripples and thin sea-glass cyan traces making sound
> visible across the water, mist between reeds, weathered brass knobs and one
> restrained coral recording lamp, deep peat-black and pine shadows, cream
> moon haze, cinematic 35mm lens at low eye level, tactile realistic materials,
> quiet curious mood, composition with generous calm negative space on the
> left, no people, no readable text, no letters, no watermark, no logos, no
> brands, no UI screens, no cyberpunk neon, no generic gradient, no anatomical
> ears, no misleading futuristic technology.

- Generator: Azure AI Foundry via factory `gen-image.sh`, deployment
  `factory-image`.
- Created: 2026-08-28.
- License/provenance: original generated asset for this product; no reference
  image, brand, copyrighted character, or real person used.
- Source PNG and prompt sidecar live in `assets/src/`; optimized WebP/AVIF ship
  from `public/assets/` at explicit dimensions. The footer discloses the
  generated scene.

### Authored UI assets

Wave, microphone, file, and privacy symbols are original inline SVG paths using
the same rounded instrument-line language. PWA icons are hand-authored SVG
converted locally to raster: a field microphone above three water ripples.

