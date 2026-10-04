# dsh-mv 创意工坊 / MV Workshop

ASCII music videos for **MV 放映室**, the [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli) plugin of
DeepSeek Harness. 为 DeepSeek Harness 的 MV 放映室插件收集的 ASCII MV 包。

- **Install / 安装**: MV 放映室 → 曲库 → **创意工坊** → pick a pack → **安装**. Then choose your own copy of the song
  (and lyrics) to play it. 选择包 → 安装 → 选择你自己的歌曲文件（和歌词）即可播放。
- **Publish / 发布**: open your pack → **发布到工坊** → **在 GitHub 上提交** (fork & pull request in your browser).
  See [CONTRIBUTING.md](CONTRIBUTING.md) · [中文](CONTRIBUTING.zh.md).
- **No audio, no lyric text** in this repository — packs carry timings and hashes only. 本仓库不含音频和歌词文本。
- Licenses: each pack declares its own; default CC BY-NC-SA 4.0 — [LICENSE-POLICY.md](LICENSE-POLICY.md).

## world.execute(me) packs / world.execute(me) 包

The two MVs that were built into dsh-mv-cli up to 0.8.x live here since 0.9.0 (they need dsh-mv-cli ≥ 0.9.0).
dsh-mv-cli 0.8.x 内置的两个 MV 自 0.9.0 起在这里发布（需要 0.9.0 及以上）。

| Pack / 包 | Original / 原作 | License / 许可 |
| --- | --- | --- |
| [`world-execute-me`](packs/world-execute-me) — ASCII scenes, renderer `script` | [yym8224961/world.execute-me-ascii](https://github.com/yym8224961/world.execute-me-ascii) | custom: used with the original author's permission, not open source ([NOTICE](packs/world-execute-me/NOTICE.md)) |
| [`world-execute-me-dsh-pv`](packs/world-execute-me-dsh-pv) — dsh PV, renderer `dsh-pv` | [MisakaZentai/world-execute-me-dsh-pv](https://github.com/MisakaZentai/world-execute-me-dsh-pv) | `CC-BY-NC-SA-4.0` (data MIT, whale-girl art CC BY-NC-SA 4.0; [NOTICE](packs/world-execute-me-dsh-pv/NOTICE.md)) |

Both are generated from [dsh-mv-cli/presets](https://github.com/Alice-Marx/dsh-mv-cli/tree/main/presets) with
`presets/build-workshop-packs.mjs`. Neither contains audio or lyric text — bring your own copy of the song.
`mv.json` → `x-dsh-mv-workshop.source` names the original work; the panel shows it as **原作** on the card and in the details.

## How it works / 工作方式

No server. `index.json` (rebuilt by GitHub Actions after every merge) lists each pack's metadata and every file's
size and sha256. The plugin downloads `index.json` and the files from `raw.githubusercontent.com` at the commit named
in the index, verifies each sha256, re-runs the same validation, and installs the pack under
`%LOCALAPPDATA%\dsh-mv\workshop\<id>\`. Scene scripts always run in the plugin's sandbox (Web Worker, no network,
no storage, per-frame time limit).

```
packs/<id>/mv.json · scenes.js · cover.png · README.md · lyrics.timing.json · data/… (canvas.assets)
scripts/validate.mjs     checks packs (CI on every pull request)
scripts/build-index.mjs  writes index.json (CI on main)
scripts/vendor/          rule files shared with the plugin
```

Local check / 本地检查: `node scripts/validate.mjs` (Node 20+, no dependencies).
