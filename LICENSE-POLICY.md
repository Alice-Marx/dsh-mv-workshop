# License policy / 许可政策

**Each pack declares its own license** in `mv.json` → `x-dsh-mv-workshop.license` (an SPDX id such as
`CC-BY-NC-SA-4.0`, `CC-BY-4.0`, `CC0-1.0`, `MIT`, or a short custom statement). That license covers the pack's own
files (scene scripts, cover, README, timings). If a pack has no explicit license file of its own, the repository
default for pack content is **CC BY-NC-SA 4.0** (<https://creativecommons.org/licenses/by-nc-sa/4.0/>); the
declared `license` field always wins.

- **Songs and lyrics are not part of any pack** and are never licensed here: they belong to their rights holders.
  Packs contain no audio and no lyric text — only timings and one-way hashes used to align the user's own copy.
- Third-party material inside a pack (code, artwork) must allow redistribution under the pack's license and be
  credited in `mv.json` `credits` (and the README). Non-commercial (NC) material requires an NC license for the pack.
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

- **歌曲和歌词不属于任何包**，这里也不授予任何相关许可，版权归权利人所有。包里没有音频和歌词文本，只有用于对齐用户自己文件的时间和单向哈希。
- 包内的第三方素材（代码、美术）必须允许以该包的许可证再分发，并在 `credits`（和 README）中署名；含非商业（NC）素材的包必须使用 NC 许可证。
- 仓库工具（`scripts/`、`.github/`、文档）采用 MIT 许可，见 [LICENSE](LICENSE)；`scripts/vendor/` 来自 dsh-mv-cli（MIT）。
- 只获得作者明确许可、但没有开源许可证的素材，只能由获得许可的人发布，`license` 写自定义声明，并附 `NOTICE.md` 说明情况、不向他人授予任何权利（例如 `packs/world-execute-me`）；用 `x-dsh-mv-workshop.source` 链接原作。
- 下架：权利人可以提 issue 或联系维护者，相关包会被移除。
