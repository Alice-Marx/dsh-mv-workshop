<!-- 中文说明在下方 / Chinese below -->

## Pack

- Folder: `packs/<id>/`
- Title / artist:
- License (also in `mv.json` → `x-dsh-mv-workshop.license`):
- Made with: <!-- dsh-mv 发布到工坊 / by hand / AI agent -->

## Checklist

- [ ] Only files under `packs/<id>/` are changed (no `index.json`, no tooling)
- [ ] **No audio, video or lyric text** (no `.mp3/.flac/.lrc/.srt/...`, no lyrics inside JSON / Markdown). Lyric timings only as `lyrics.timing.json` (times + hashes)
- [ ] No third-party artwork or code I may not share under the pack's license; credits are in `mv.json` `credits`
- [ ] The scene script is readable source (not minified / obfuscated) and plays in MV 放映室
- [ ] `node scripts/validate.mjs` passes (CI runs it too)

---

## 包信息

- 文件夹：`packs/<id>/`
- 歌名 / 歌手：
- 许可证（同时写在 `mv.json` → `x-dsh-mv-workshop.license`）：

## 自检

- [ ] 只改动了 `packs/<id>/` 下的文件
- [ ] **不含音频、视频和歌词文本**；歌词时间轴只用 `lyrics.timing.json`（时间 + 哈希）
- [ ] 没有无权分享的第三方美术或代码；署名写在 `credits`
- [ ] 场景脚本是可读源码，能在 MV 放映室播放
- [ ] `node scripts/validate.mjs` 通过（CI 也会运行）
