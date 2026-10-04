# Contributing a pack

[中文](CONTRIBUTING.zh.md)

Packs are ASCII music videos for **MV 放映室** (the [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli)
plugin of DeepSeek Harness). Each pack lives in `packs/<id>/` and is listed in `index.json`, which CI rebuilds after
every merge. There is no server: the plugin downloads `index.json` and pack files from `raw.githubusercontent.com`
and checks each file's sha256 against the index.

## The easy way: 发布到工坊 in the plugin

1. Open your pack in MV 放映室 → **发布到工坊**. Fill in id, version, license, author, description.
2. The plugin checks the pack, **removes the audio and the lyric text** (lyrics become `lyrics.timing.json`: line
   times, word times and a hash of each line — no text), adds a cover from the current frame, writes a README, and
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

and must **not** contain `audio`, `lyrics` or `spectrum` (users play the pack with their own copy of the song).
`h` in the timing file is the first 16 hex digits of sha256 of the line after NFKC, lower-casing and removing spaces,
punctuation and symbols.

## Rules (checked by CI: `node scripts/validate.mjs`)

- `<id>`: lowercase letters, digits and `-`, 3–64 characters; equals `x-dsh-mv-workshop.id`.
- Allowed files: `.json .js .mjs .md .txt .png .webp .jpg`. At most 40 files, 4 MB per pack, 512 KB per text file,
  256 KB per script, 1 MB per image.
- **No audio / video / lyric files** (`.mp3 .flac .wav .m4a .ogg … .lrc .srt .vtt .ass …`, `lyrics.json`), no lyric
  text inside JSON or Markdown.
- A **license is required** (`x-dsh-mv-workshop.license`), see [LICENSE-POLICY.md](LICENSE-POLICY.md).
- If the pack adapts someone else's work, link it in `x-dsh-mv-workshop.source` (an `https://` URL, e.g. the original repository); the panel shows it as **原作** on the card and in the details. Large renderer data goes in `canvas.assets` (JSON files ≤ 512 KB each — shard bigger ones; whole pack ≤ 8 MB).
- Scene scripts must be readable source and pass static checks: no `import`/`require`, `eval`, `Function`, network,
  storage or global objects (`fetch`, `WebSocket`, `localStorage`, `navigator`, `self`, `globalThis`, …), no
  prototype tricks, no obfuscation (very long lines, `\x..` escapes, `atob`). CI also runs every scene in a sandbox
  at several times (no errors, not blank). In the plugin, scripts always run in a Web Worker sandbox without network.
- Pull requests may only touch `packs/<id>/`. Don't edit `index.json`.

The maintainer reviews every pull request before merging. Packs can be removed if a rights holder asks.
