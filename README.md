# dsh-mv 创意工坊 / MV Workshop

Text, Canvas2D and WebGL2 3D music videos for **MV 放映室**, the [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli) plugin of
DeepSeek Harness. 为 MV 放映室收集文本、2D 与实时 3D MV 包。

- **Install / 安装**: MV 放映室 → 曲库 → **创意工坊** → pick a pack → **安装**. Then choose your own copy of the song
  to play it; complete packs auto-load their licensed captions and other resources. 选择包 → 安装 → 自备音乐；完整包的已授权歌词与其他资源自动加载。
- **Publish / 发布**: open your pack → **发布到工坊** → **在 GitHub 上提交** (fork & pull request in your browser).
  See [CONTRIBUTING.md](CONTRIBUTING.md) · [中文](CONTRIBUTING.zh.md).
- **No song audio** in this repository. Licensed lyrics/translations, timing, spectrum and visual resources may be included and load automatically. 只需自备音乐；歌词、译文与其他非音乐资源可随完整包提供。
- Licenses: each pack must declare its own rights; never infer a license for upstream work — [LICENSE-POLICY.md](LICENSE-POLICY.md).

## world.execute(me) packs / world.execute(me) 包

The two MVs that were built into dsh-mv-cli up to 0.8.x live here since 0.9.0 (they need dsh-mv-cli ≥ 0.9.0).
dsh-mv-cli 0.8.x 内置的两个 MV 自 0.9.0 起在这里发布（需要 0.9.0 及以上）。

| Pack / 包 | Original / 原作 | License / 许可 |
| --- | --- | --- |
| [`world-execute-me`](packs/world-execute-me) — ASCII scenes, renderer `script` | [yym8224961/world.execute-me-ascii](https://github.com/yym8224961/world.execute-me-ascii) | custom: used with the original author's permission, not open source ([NOTICE](packs/world-execute-me/NOTICE.md)) |
| [`world-execute-me-dsh-pv`](packs/world-execute-me-dsh-pv) — complete 1.1.0, new AI-assisted dancer, raster layers, 98 English cues and OFL fonts; plugin 0.9.5+ | [MisakaZentai/world-execute-me-dsh-pv](https://github.com/MisakaZentai/world-execute-me-dsh-pv) | Data MIT; derived art CC-BY-NC-SA-4.0; fonts OFL-1.1; Mili captions under separate non-commercial fan terms ([NOTICE](packs/world-execute-me-dsh-pv/NOTICE.md)) |

Their legacy sources are in [dsh-mv-cli/presets](https://github.com/Alice-Marx/dsh-mv-cli/tree/main/presets).
The complete dsh PV uses `tools/dsh-pv/build-complete.mjs`: 97 shots, 1,658 raster samples / 14 atlas pages,
new eight-pose dance and matching point-cloud/heat-map geometry. It is an AI-assisted remake, **not** recovery
of unpublished original-film/MMD material. [Dance source and attribution](https://github.com/Alice-Marx/dsh-mv-cli/tree/main/presets/dsh-pv-remake).
Consolas / Microsoft YaHei / Segoe UI Symbol remain local Windows fonts; only unmodified Space Mono / Anton
are bundled under OFL. No pack includes song audio. The ASCII pack remains caption-free; dsh PV supplies
98 English cues under its independent Mili fan-work terms.

Ported community projects / 移植社区项目：Wallpaper 保持 2D（0.9.1+），Polytech Tree 使用实时 WebGL2 3D（0.9.2+）。

| Pack / 包 | Original / 原作 | License / 许可 |
| --- | --- | --- |
| [`world-execute-me-wallpaper`](packs/world-execute-me-wallpaper) — complete 1.1.0, 92 bilingual cues; plugin 0.9.4+ | [seasnakes/world.execute-me-wallpaper](https://github.com/seasnakes/world.execute-me-wallpaper) | Visual code MIT; Mili captions under separate non-commercial fan terms ([NOTICE](packs/world-execute-me-wallpaper/LYRICS-NOTICE.md)) |
| [`polytech-tree`](packs/polytech-tree) — complete 1.2.0, GPU tour and full source catalogue; plugin 0.9.4+ | [secwind7/polytech-tree](https://github.com/secwind7/polytech-tree) | Code MIT; structured fields CC BY 4.0; descriptions CC BY-SA 4.0 ([NOTICE](packs/polytech-tree/NOTICE.md)) |
| [`world-execute-me-three`](packs/world-execute-me-three) — complete 1.1.0, original 12 scenes and 75 bilingual cues; plugin 0.9.4+ | [wiers-jack/world-execute-me-mv](https://gitee.com/wiers-jack/world-execute-me-mv) | Visual code and Three.js MIT; Mili captions under separate non-commercial fan terms ([NOTICE](packs/world-execute-me-three/LYRICS-NOTICE.md)) |

They are built by `presets/ports/*/build.mjs` in dsh-mv-cli from the upstream commits named in each NOTICE.
FrostNova's [world-execute-me-frostnova 1.0.1](packs/world-execute-me-frostnova) preserves the original realtime 3D main edit: 305 shots, 16 chapters, 129 caption indices, Chinese translation, analysis and offline OFL font resources. Requires plugin **0.9.7+** and hardware WebGL2 with float render targets. Resources prepare and warm at the final size before music starts; the current RTX 4070 full-film test loaded in about 26.6 seconds, with a maximum worker frame of 122.3 ms. Hardware performance varies. Only the music recording is user-provided.

FrostNova code/generated visuals and the adapter are AGPL-3.0-or-later; Mili text, OFL fonts and trademarks retain separate terms. The repository default license does not replace these terms. [Free complete Corresponding Source](https://github.com/Alice-Marx/dsh-mv-workshop/releases/download/world-execute-me-frostnova-1.0.1/20261007_frostnova-corresponding-source-1.0.1.zip) includes the pinned upstream, editable adapter and reproducible build inputs. 含快速闪烁与强对比切镜，请先阅读包内光敏提示。

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

## Domestic download mirror / 国内下载备用源

**Current status / 当前状态（2026-10-08）:** Gitee remains a Git mirror, but is **not enabled as the
default download fallback**. Some raw JSON resources return HTTP 451, with the platform message
`The content may contain violation information`. Successful Git synchronization or an accessible
index does not mean every pack resource can be downloaded. Complete installation of affected packs
is unavailable through this mirror until the restriction is resolved; GitHub remains the official
primary download source. Platform review must be handled by the repository owner; this project does
not submit automatic appeals or bypass content filters.

Gitee 仓库与 Git 同步已正常建立，但部分 raw 数据文件被平台返回 **HTTP 451 内容限制**，
所以目前不启用默认备用源。索引能打开、提交能同步，不代表全部素材能下载；受影响作品暂不能
通过 Gitee 完整安装。GitHub 仍为官方主下载源。平台复核由仓库拥有者处理，不自动对外申诉、
发送消息或规避平台拦截。

The official [Gitee mirror](https://gitee.com/Alice-Marx/dsh-mv-workshop) keeps the same published GitHub
`main`, tags and commit IDs. Plugin versions supporting automatic fallback first try GitHub; network
failures can fall back to `https://raw.giteeusercontent.com/Alice-Marx/dsh-mv-workshop/raw` without a proxy.
Each pack file still uses the complete commit named by `index.json`, its declared size and SHA-256;
certificate, size or integrity errors do not silently switch sources. The mirror contains no song audio.

官方 Gitee 备用仓与 GitHub 使用相同发布提交；支持自动备用的插件在 GitHub 网络失败时可直连
Gitee，继续逐文件核对大小及 SHA-256。音乐仍需自备。公开 raw 单文件超过 10 MB 时 Gitee 要求认证，
因此保留逐文件安装，不以大型 raw ZIP 替代；平台仍可能限流或暂时不可用。

After validation and the index job complete, the protected `mirror` CI job fetches the final GitHub
`main` and published tags and pushes them to Gitee without force or deletion. It runs only for this
official repository's `main` push or manual workflow run, never for pull requests or forks. Its credential
is the repository Actions secret `GITEE_TOKEN`, not a committed token. A new tag published after the
main run can be mirrored with a manual `validate packs` run on `main`.

Git synchronization does **not** synchronize Release attachments. In particular, FrostNova's complete
AGPL Corresponding Source ZIP is a separate free Release asset, not an anonymous raw file; mirror
attachments must be uploaded and their unauthenticated downloads verified independently.
The [Gitee Corresponding Source attachment](https://gitee.com/Alice-Marx/dsh-mv-workshop/releases/download/world-execute-me-frostnova-1.0.1/20261007_frostnova-corresponding-source-1.0.1.zip)
was separately uploaded and anonymously verified byte-for-byte against the GitHub release archive
(14,683,605 bytes, SHA-256 `809d44af31c83418a351f2a77ebd3628a0533f9ac979118e04420c4bb193469e`).

## 3D packs / 3D 包

Use `canvas.renderer: "script"`, `canvas.output: "webgl"`, `canvas.size: [1280, 720]` and a bundled
`setup(info, gl)` / `paint(gl, t, w, h, ctx)` script. Three.js must use the explicit
`{ canvas: info.canvas, context: gl }` renderer and no DOM, network loaders or animation loop.
Textures belong in `canvas.assets` (PNG/WebP as ImageBitmap); JSON shards are merged before setup.
WebGL scripts may be 2 MiB; the index marks them `renderer: webgl` and `requires: 0.9.2`.
Scenes using the optional synchronous-generator `prepare(info, gl)` require 0.9.6: 10 seconds per step, 120 seconds total, at most 512 steps. The player shows progress and waits before starting music.
Plugin 0.9.7 raises setup to 5 seconds and total preparation to 300 seconds, and adds synchronous `warmup(info, gl)` with its own 20-second deadline. Frames requested within 10 seconds after ready have an 8-second deadline; later requests use 1.5 seconds. Async warmup and mismatched stage ids are rejected.
CI uses a recording stand-in, **not a GPU**; maintainers must also verify real Chromium shader compilation,
nonblank frames, seeking and cleanup. 在真实浏览器验着色器、画面、拖动进度和切包清理，不能只看 Node/CI 通过。

The wiers-jack pack preserves the original 12-scene Three.js rendering core and 213-second visual timeline.
Pack 1.0.2 enables `canvas.subtitles: true` (plugin 0.9.3+) to display your local bilingual lyrics over the
3D image. Choose the original `src/lyrics.js` or your own LRC/JSON; imports/helpers never execute and no
lyric text is uploaded. Update both the plugin and pack to use this feature.
The maintainer confirmed direct MIT permission from the author on 2026-10-05; LICENSE/NOTICE records this
separately from the older upstream package's ISC declaration. It includes no audio or lyric text.
