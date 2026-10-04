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
