# License policy / 许可政策

**Each pack declares its own license** in `mv.json` → `x-dsh-mv-workshop.license` (an SPDX id such as
`CC-BY-NC-SA-4.0`, `CC-BY-4.0`, `CC0-1.0`, `MIT`, or a short custom statement). That license covers the pack's own
files (scene scripts, cover, README, timings). If a pack has no explicit license file of its own, the repository
default for pack content is **CC BY-NC-SA 4.0** (<https://creativecommons.org/licenses/by-nc-sa/4.0/>); the
declared `license` field always wins.

- **Song audio recordings are never included.** Licensed lyric/translation tracks may be included as static data when `mv.json.lyrics` references them and `x-dsh-mv-workshop.lyricsLicense` / `lyricsCredit` declare their separate usage terms and authors; `lyricsSource` can link the terms. A code license does not grant third-party song-text rights. Old packs may carry only timings/hashes.
- Third-party material inside a pack (code, artwork) must allow redistribution under the pack's license and be
  credited in `mv.json` `credits` (and the README). Declare each independently licensed component separately;
  NC terms on song text or artwork do not restrict an AGPL software grant.
- The repository tooling (`scripts/`, `.github/`, documentation) is MIT licensed, see [LICENSE](LICENSE). Files in
  `scripts/vendor/` come from dsh-mv-cli (MIT).
- Material used **with the explicit permission** of its author but without an open licence may be published only
  by someone holding that permission, with a custom `license` statement and a `NOTICE.md` that says so and grants
  no further rights (example: `packs/world-execute-me`). Link the original in `x-dsh-mv-workshop.source`.
- Takedown: rights holders can open an issue or contact the maintainer; the pack will be removed.

---

**每个包自己声明许可证**（`mv.json` → `x-dsh-mv-workshop.license`，例如 `CC-BY-NC-SA-4.0`、`CC-BY-4.0`、`CC0-1.0`、`MIT`
或简短的自定义声明），适用于包自身的文件（场景脚本、封面、README、时间轴）。包内没有单独许可文件时，仓库对包内容的
默认许可为 **CC BY-NC-SA 4.0**；以包声明的 `license` 为准。

- **歌曲音频录音一律不随包分发。** 歌词、译文可按明确使用条款作为静态数据随包提供：`mv.json.lyrics` 指向数据，并用 `lyricsLicense` / `lyricsCredit` 单独声明使用条款和作者，可用 `lyricsSource` 链接依据；不得用代码许可代替歌曲文字的授权。旧包可继续只带时间和哈希。
- 包内的第三方素材（代码、美术）必须允许再分发，并在 `credits`（和 README）中署名；独立许可的组件分别声明，不得把歌词或美术的 NC 条件加到 AGPL 软件许可上。
- 仓库工具（`scripts/`、`.github/`、文档）采用 MIT 许可，见 [LICENSE](LICENSE)；`scripts/vendor/` 来自 dsh-mv-cli（MIT）。
- 只获得作者明确许可、但没有开源许可证的素材，只能由获得许可的人发布，`license` 写自定义声明，并附 `NOTICE.md` 说明情况、不向他人授予任何权利（例如 `packs/world-execute-me`）；用 `x-dsh-mv-workshop.source` 链接原作。
- 下架：权利人可以提 issue 或联系维护者，相关包会被移除。

## FrostNova package / FrostNova 包

`packs/world-execute-me-frostnova/` is excluded from the repository default
CC BY-NC-SA grant: adapted code and program-generated visuals are
**AGPL-3.0-or-later**, Three.js/fflate are MIT, and font-derived masks are OFL.
The code grant has no additional non-commercial restriction. Mili song text
and official translation follow the separate `LYRICS-NOTICE.md` fan-work terms;
Claude name/logo are Anthropic trademarks. `NOTICE.md` offers the complete fixed
Corresponding Source, including the changes and build tools, without charge.

该包代码与程序生成画面使用 AGPL，不套用仓库默认 CC BY-NC-SA，也不对代码新增禁止商业条件。
歌词、译文、字体及商标分别遵从包内独立声明，音乐录音不包含在内。
