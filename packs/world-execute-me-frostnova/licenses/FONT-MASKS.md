# Offline OFL text adapter

`build-fonts.mjs` is an offline production tool. `runtime.mjs` paints the
upstream's text in the restricted worker without font registration, platform
fonts, DOM, network access or font-binary distribution.

## Build

Run from the plugin checkout after installing the port's tool dependencies:

```powershell
npm ci --prefix presets/ports/frostnova-web
npm exec --prefix presets/ports/frostnova-web -- playwright install chromium
node presets/ports/frostnova-web/fonts/build-fonts.mjs --upstream UPSTREAM_CHECKOUT --extra-fonts presets/ports/frostnova-web/fonts/extra-fonts.json --out NEW_DIRECTORY
```

No machine-specific executable path is needed: the default is the locally
installed `playwright` package and its Chromium. `--playwright PACKAGE_OR_PATH`
(or `DSH_MV_PLAYWRIGHT`) can select an existing installation. `--chrome PATH`
can instead select an existing Chrome executable. These optional paths are
build-time options only; no local path is included in published pack data.

The output directory must not already exist. The baker uses an isolated local
Chrome page and loads only the explicitly named OFL source files. It checks the
font cmap first; no unsupported character is rasterized by a system fallback.
The build does not install or register fonts on the user's machine. The original
upstream files remain unchanged.

Masks are lossless 8-bit alpha at 64 px. Byte RLE is gzip-compressed and stored
as base64, with deterministic metrics, baselines and source-text kerning pairs.
Each JSON shard is under 480 KiB. All full OFL notices accompany the output.
`font-provenance.json` records source SHA-256, coverage and shard hashes.

The currently covered faces are JetBrains Mono 400/500/600/700/800, Space
Grotesk 400/500/600/700, Noto Sans SC Medium, STIX Two Text 400/500/600/700
upright and true italic, STIX Two Math, Noto Sans KR 800 (required Korean
characters), Noto Sans (required superscripts), and Noto Sans Symbols 2
(required ornamental characters). JetBrains Mono, Space Grotesk and the
Chinese subset come unchanged from the upstream project. Additional source
files and their full licenses are kept in `source/`, from these official
distributions:

- https://github.com/google/fonts/tree/main/ofl/stixtwotext
- https://github.com/google/fonts/tree/main/ofl/stixtwomath
- https://github.com/google/fonts/tree/main/ofl/notosanskr
- https://github.com/google/fonts/tree/main/ofl/notosans
- https://github.com/google/fonts/tree/main/ofl/notosanssymbols2

The rendered masks and font notices remain SIL OFL 1.1 material, **not MIT**.
Their font-family names identify the original OFL faces; no proprietary font
software or extracted proprietary glyph image is included. The `Apple SD
Gothic Neo` / `PingFang SC` requests use the corresponding available Noto glyph.
The old Apple Symbols / Menlo glyph-atlas fallback is replaced by OFL STIX/Noto.

Every original scene font string has an explicit mapping, including the outro's
`Avenir Next` request (which is separate from `PROJECT.fonts`). Mappings are
case-insensitive, declared in `font-aliases.mjs`, and included as `aliases` in
baked face metrics:

| Upstream name | Actual OFL face |
| --- | --- |
| JetBrains Mono; Menlo, Menlo-Regular, Menlo-Bold, monospace | JetBrains Mono |
| Space Grotesk; Avenir Next, AvenirNext, AvenirNext-Regular/Medium/DemiBold/Bold/Heavy, sans-serif | Space Grotesk |
| Noto Sans SC; PingFang SC, PingFangSC | Noto Sans SC Medium |
| Apple SD Gothic Neo, AppleSDGothicNeo | Noto Sans KR |
| STIX Two Text, serif | STIX Two Text, including true italic |
| Apple Symbols | Noto Sans Symbols 2, then the baked OFL math glyph fallback |

CSS numeric weights continue to select the nearest baked weight. Proprietary
names are routing aliases only, never a claim to reproduce their exact glyph
outlines. The Avenir aliases therefore use the upstream's open Space Grotesk
alternative, not the machine's Avenir or an accidental serif fallback.

## Runtime contract

`configureFonts(assets)` synchronously merges assets whose `format` is
`frostnova-font-masks`. A shard has `version: 1`, `em: 64`,
`encoding: "gzip-rle8"`, `faces: [...]` and `glyphs: [...]`. Face definitions
need appear only once; shard ordering does not matter. Glyphs contain the face
id, single character, advance, relative raster origin, width, height and RLE
payload. Sizes, runs, inflated lengths and cache memory are bounded.

`makeCanvas(width, height)` returns a real `OffscreenCanvas`. Its native 2D
context retains every non-text canvas method. `fillText`, `strokeText`, and
`measureText` use the offline glyphs, including spacing, alignment, measured
baselines, alpha, transforms, max-width fitting and native blur/glow. Linear,
radial and conic gradients created through the wrapped context retain the
native paint coordinate space. `restoreText(g)` restores the wrappers after
upstream `setWords(false)` has assigned no-op text functions. `setWords(true)`
must call it instead of deleting those functions.

The main bundle may provide the lexical `__frostInitialAssets` factory value
before dependent modules initialize. This is inert pack JSON, not a global
capability or sandbox exemption.

## Known differences and scope

- The masks contain the original project's actual text and glyph atlas, not a
  general-purpose full CJK font. A future edit with new characters must re-run
  the baker. Uncovered characters deterministically use the OFL `?` glyph.
- Glyphs are sampled at 64 px; very large text can be softer than vector/native
  font rendering. Small text may have slightly different subpixel hinting.
- Outlines use a centred alpha contour, not native typographic stroke join
  geometry. Native shadow blur is applied afterwards. Arbitrary canvas patterns
  have no text-space remapping; the upstream's solid/gradient paints are covered.
- Unused Unicode regular-expression range endpoints can appear in the
  provenance coverage report. They are not strings displayed by the film.
- Playback does not do general bidi shaping or contextual-script substitution;
  the upstream uses Latin, Greek/math, Chinese and the explicitly baked Korean
  syllable, with normal left-to-right drawing.

## Verify

```powershell
$env:FROSTNOVA_FONT_DIR = 'BAKED_DIRECTORY'
$env:FROSTNOVA_FONT_QA_DIR = 'NEW_QA_DIRECTORY'
node --test tests/frostnova-fonts.test.mjs
```

The same installed Playwright/Chromium defaults apply to the optional browser
test; `DSH_MV_CHROME` can select an existing Chrome for that test. With no
`FROSTNOVA_FONT_DIR`, the browser check is explicitly skipped, but portable
alias-routing and RLE/canvas unit tests still run.

The independent real-Chrome check renders actual upstream typography and
exercises gradients, outlines, glow, max-width, words-off/on restoration and
native drawing. It explicitly checks that Avenir Next and AvenirNext have the
same real glyph metrics as Space Grotesk. It saves a PNG for visual review. No full-film QA is performed
by this font tool.
