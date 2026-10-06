# Contributing a pack

[中文](CONTRIBUTING.zh.md)

Packs are text, Canvas2D or WebGL2 music videos for **MV 放映室** (the [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli)
plugin of DeepSeek Harness). Each pack lives in `packs/<id>/` and is listed in `index.json`, which CI rebuilds after
every merge. There is no server: the plugin downloads `index.json` and pack files from `raw.githubusercontent.com`
and checks each file's sha256 against the index.

## The easy way: 发布到工坊 in the plugin

1. Open your pack in MV 放映室 → **发布到工坊**. Fill in id, version, license, author, description.
2. The plugin checks the pack, **removes only song audio**, preserves separately licensed lyrics/translations,
   cue/word timing, spectrum and declared visual resources, adds a cover from the current frame, writes a README, and
   puts everything in a local folder `…\dsh-mv\workshop-publish\<id>\packs\<id>\`.
3. Click **在 GitHub 上提交**: your browser opens this repository's *upload files* page for `packs/<id>/`. Drag the
   files from that folder in. GitHub forks the repository for you and opens a pull request. Nothing is submitted until
   you click the buttons on github.com.

## By hand

```
packs/<id>/
  mv.json              required; see the template in the plugin (新建（模板）)
  scenes.js            the scene script, if canvas.renderer is "script"
  cover.png|webp|jpg   optional, ≤ 1 MB (16:9 or 4:3 looks best)
  README.md            optional
  lyrics.timing.json   optional: { "format": "dsh-mv-lyrics-timing", "version": 1, "lines": [{ "t", "e", "h", "w" }] }
```

`mv.json` must contain:

```json
"x-dsh-mv-workshop": {
  "id": "<id>", "version": "1.0.0", "license": "CC-BY-NC-SA-4.0", "author": "<your name>",
  "description": "…", "tags": ["ascii"],
  "audio": { "duration": 211.9, "fingerprint": { "kind": "energy-2hz-v1", "values": "<base64>" } }
}
```

and must **not** contain song `audio`. Optional `lyrics` / `spectrum` reference local non-audio data. A lyric track requires separate `lyricsLicense` and `lyricsCredit` in the workshop metadata; `lyricsSource` can link its permission/terms. Complete tracks require dsh-mv-cli 0.9.4+ and load automatically. Users provide only music.
`h` in the timing file is the first 16 hex digits of sha256 of the line after NFKC, lower-casing and removing spaces,
punctuation and symbols.

## Rules (checked by CI: `node scripts/validate.mjs`)

- `<id>`: lowercase letters, digits and `-`, 3–64 characters; equals `x-dsh-mv-workshop.id`.
- Allowed files: `.json .js .mjs .md .txt .png .webp .jpg`. At most 40 files, 8 MiB per pack, 512 KiB per text/data file,
  256 KiB per text/pixels script, 2 MiB per WebGL script, 1 MiB per cover (canvas.assets images remain 512 KiB).
- **No song audio / video** (`.mp3 .flac .wav .m4a .ogg .mp4 …`). Declared lyric tracks may use `.lrc .srt .vtt .json .js .mjs`, with explicit lyric license/credit. Unreferenced lyric files/text remain rejected. Lyric JS is static data only and is never executed as a scene; prefer the publisher's canonical JSON.
- A **license is required** (`x-dsh-mv-workshop.license`), see [LICENSE-POLICY.md](LICENSE-POLICY.md).
- If the pack adapts someone else's work, link it in `x-dsh-mv-workshop.source` (an `https://` URL, e.g. the original repository); the panel shows it as **原作** on the card and in the details. Large renderer data goes in `canvas.assets` (JSON files ≤ 512 KB each — shard bigger ones; whole pack ≤ 8 MB).
- **Pixel scenes (dsh-mv-cli 0.9.1+)**: `canvas.output: "pixels"` with `canvas.size: [w, h]` (up to 1920×1080) and a `paint(g, t, w, h, ctx)` function that draws on a 2D canvas (no WebGL). Script packs also get their `canvas.assets` in `setup(info)` as `info.assets`. CI computes `requires` (the lowest plugin version that plays the pack, `0.9.1` for these) and puts it in `index.json`; you may set a higher `x-dsh-mv-workshop.requires` yourself. CI checks pixel scenes with a stand-in canvas (every sample frame must draw something).
- Scene scripts must be readable source and pass static checks: no `import`/`require`, `eval`, `Function`, network,
  storage or global objects (`fetch`, `WebSocket`, `localStorage`, `navigator`, `self`, `globalThis`, …), no
  prototype tricks, no obfuscation (very long lines, `\x..` escapes, `atob`). CI also runs every scene in a sandbox
  at several times (no errors, not blank). In the plugin, scripts always run in a Web Worker sandbox without network.
- **WebGL 3D (0.9.2+)**: `canvas.output: "webgl"`, `setup(info, gl)`, `paint(gl, t, w, h, ctx)`.
  Bundled Three.js uses `{ canvas: info.canvas, context: gl }`. Dormant library references to browser/network
  APIs may warn rather than fail static checks, but those APIs remain unavailable at runtime. No CDN, DOM or independent
  frame loop. Rebuild from absolute `t` for seek correctness. CI only records calls (`gpuValidated: false`);
  also verify real Chromium shaders, textures, frames, seeking, resize and cleanup before submitting.
- Pull requests may only touch `packs/<id>/`. Don't edit `index.json`.

The maintainer reviews every pull request before merging. Packs can be removed if a rights holder asks.
