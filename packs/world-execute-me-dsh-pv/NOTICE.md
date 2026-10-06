# Complete dsh PV 1.1.0: independent resource terms

Code/data: MIT. Whale-girl-derived imagery and AI-remade dancer/raster adaptations: CC-BY-NC-SA-4.0. Fonts: OFL-1.1. Caption text: LicenseRef-Mili-NonCommercial-FanWork, per https://projectmili.com/copyright-guidelines. Only song audio is absent. This updated statement supersedes older pack notes saying all caption text/fonts/raster imagery were absent.

溟月 © 上善无形 → 女仆版 ZipZipPipe → 立绘 Small-tailqwq / dsh-deep-whale → 表情 dsh-whale-galgame; upstream MisakaZentai; AI-assisted dancer remake from the user-provided reference.

Reference: DeepSeek1.png, SHA256 1ee43fb06f5d0c6a9b342d37b0dd74859b73b375946f0e938b7bdc41c42833f0. User confirmed public non-commercial fan-work distribution of this reference in the 2026-10-06 conversation; this statement does not grant rights to unrelated images or third-party MMD models/motions.

AI use is explicitly labeled. The remade dancer does not use or redistribute the original MMD model, motion, MiniMax-H3 dance cache or any unconfirmed original dancer frames. Preserve art/NOTICE.md's full attribution chain. CC license text is retained at ../LICENSE.txt relative to art/; no artwork is relicensed as MIT. No Windows font binary or reusable per-character glyph atlas is shipped.

## Retained legacy artwork/source attribution

# NOTICE — world.execute(me); dsh PV

- **Original work / 原作:** [MisakaZentai/world-execute-me-dsh-pv](https://github.com/MisakaZentai/world-execute-me-dsh-pv) — code and data **MIT** © MisakaZentai.
  `data/*.json` is the recorded shot timeline, chat window and stdout band rebuilt from that project (sharded into
  ≤ 512 KB files; no lyric text). The renderer that replays it lives in dsh-mv-cli (`.dsh-plugin/client/mv/dshpv/`, MIT).
- **Artwork:** `art/*.webp` is the upstream whale-girl art, **CC BY-NC-SA 4.0** (resized, pixelated, recoloured):
  溟月 © 上善无形 → maid version ZipZipPipe → standing art Small-tailqwq / dsh-deep-whale → expressions
  dsh-whale-galgame. Full chain and upstream notices: [art/NOTICE.md](art/NOTICE.md). License text: [LICENSE.txt](LICENSE.txt).
- **This pack** is licensed **CC BY-NC-SA 4.0** as a whole (the MIT parts stay MIT). Non-commercial use only;
  adaptations must be shared under the same license.
- **Song and lyrics:** © Mili. Not included.
- It was a built-in preset of dsh-mv-cli 0.7–0.8 and moved to this workshop in dsh-mv-cli 0.9.0.

数据移植自 MisakaZentai 的 [world-execute-me-dsh-pv](https://github.com/MisakaZentai/world-execute-me-dsh-pv)（MIT）；鲸鱼娘立绘按 CC BY-NC-SA 4.0 分发（署名链见
art/NOTICE.md），仅限非商业使用，改编须同协议分享。歌曲与歌词版权归 Mili，本包不含音频和歌词。


## Retained original data MIT notice (unchanged text)

# dsh-pv data (MIT)

`timeline.json`, `chat.json` and `band.json` are data extracted from
**world-execute-me-dsh-pv** by MisakaZentai (https://github.com/MisakaZentai/world-execute-me-dsh-pv, commit a4dd0f7),
whose code and data are released under the MIT License:

    MIT License

    Copyright (c) 2026 MisakaZentai

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

- `timeline.json`: the shot table, chapters, LEAD/levels and, per shot, keyframes of the vector draw calls
  (text, boxes, lines, dots) that the upstream Python renderer issues, recorded at 2–6 points per shot and
  replayed on a canvas in real time. Upstream's own raster layers (her glyph dancer, banners, photos) are not
  included. The sung line's words are never stored: the one shot that lays them out (satisfaction) keeps
  placeholders that are filled from the user's own LRC at runtime, and the IF I CAN banner is stored as blank bars.
- `chat.json`: the dsh web window's chat states (upstream scripted chat), parsed from upstream's page frames.
  No DeepSeek frontend code, CSS or icons are included; the window is redrawn natively.
- `band.json`: upstream `data/timing/word_timeline_notext.json` reduced to per-line sha256, line times and word
  spans/onsets. **No lyric text.** The user's own LRC is matched to it by sha256 at runtime.

No audio, no lyric text, no fonts and no artwork are in this folder. The artwork lives in `../dsh-pv-art/`
under CC BY-NC-SA 4.0. Music: Mili — world.execute(me); (not included; bring your own audio).

