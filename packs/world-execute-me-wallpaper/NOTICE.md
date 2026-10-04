# NOTICE — world.execute(me); · Wallpaper MV

- **Original / 原作:** [seasnakes/world.execute-me-wallpaper](https://github.com/seasnakes/world.execute-me-wallpaper) (commit `151471d32207`) —
  the code of the B 站 video 【Opus5.5 一句话生成 world.execute(me); mv】 and its Wallpaper Engine wallpaper.
- **License:** the original code is MIT, © 2026 seasnakes — full text in [LICENSE.txt](LICENSE.txt). This
  adaptation (scenes.js, data/) is distributed under the same MIT license.
- **Changes (Alice-Marx, 2026-10):** common.js + scenes2.js run as a dsh-mv pixel scene script on an
  OffscreenCanvas (DOM lookups replaced, `String.fromCharCode` replaced by a lookup table); analysis.js
  moved to `data/analysis-*.json`; events.js inlined; the HTML lyric card redrawn on the canvas from the
  user's own lyrics. Removed: audio, `lyrics-data.js` (lyric text), the "Claude UI" mock-up, Wallpaper Engine glue.
- **Music and lyrics:** Mili — "world.execute(me);". Not included. Rights belong to Mili and the respective
  rights holders; see https://projectmili.com/copyright-guidelines . The original repository is marked
  “仅供交流学习使用” (for exchange and study).
