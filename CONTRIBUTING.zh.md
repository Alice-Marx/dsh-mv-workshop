# 投稿 MV 包

[English](CONTRIBUTING.md)

这里收录 DeepSeek Harness 插件 [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli)（**MV 放映室**）的
ASCII MV 包。每个包放在 `packs/<id>/`，CI 在每次合并后重新生成 `index.json`。没有服务器：插件从
`raw.githubusercontent.com` 下载 `index.json` 和包文件，并按索引里的 sha256 校验每个文件。

## 最简单：在插件里「发布到工坊」

1. 在 MV 放映室打开你的包 → **发布到工坊**，填写 id、版本、许可证、作者、简介。
2. 插件检查包，**去掉音频和歌词文本**（歌词变成 `lyrics.timing.json`：每行时间、逐词时间和每行文字的哈希，不含文字），
   用当前画面生成封面，写 README，全部放到本机文件夹 `…\dsh-mv\workshop-publish\<id>\packs\<id>\`。
3. 点 **在 GitHub 上提交**：浏览器打开本仓库 `packs/<id>/` 的「上传文件」页面，把文件夹里的文件拖进去，
   GitHub 会自动 fork 并创建 Pull Request。在 github.com 上点按钮之前，什么都不会提交。

## 手动投稿

```
packs/<id>/
  mv.json              必需；格式见插件里「新建（模板）」
  scenes.js            canvas.renderer 为 "script" 时的场景脚本
  cover.png|webp|jpg   可选，≤ 1 MB（16:9 或 4:3 效果最好）
  README.md            可选
  lyrics.timing.json   可选：{ "format": "dsh-mv-lyrics-timing", "version": 1, "lines": [{ "t", "e", "h", "w" }] }
```

`mv.json` 必须包含 `x-dsh-mv-workshop`（id、version、license、author，可选 description、tags、
audio.duration、audio.fingerprint），并且**不能**包含 `audio`、`lyrics`、`spectrum`（用户用自己的歌曲文件播放）。
时间轴里的 `h` 是该行文字经 NFKC、转小写、去掉空格 / 标点 / 符号后 sha256 的前 16 位十六进制。

## 规则（CI 用 `node scripts/validate.mjs` 检查）

- `<id>`：小写字母、数字和 `-`，3–64 个字符，与 `x-dsh-mv-workshop.id` 相同。
- 允许的文件：`.json .js .mjs .md .txt .png .webp .jpg`；每个包最多 40 个文件、4 MB；文本文件 512 KB、脚本 256 KB、图片 1 MB。
- **不允许音频 / 视频 / 歌词文件**（`.mp3 .flac .wav .m4a .ogg … .lrc .srt .vtt .ass …`、`lyrics.json`），JSON 和 Markdown 里也不能有歌词文本。
- **必须声明许可证**（`x-dsh-mv-workshop.license`），见 [LICENSE-POLICY.md](LICENSE-POLICY.md)。
- 场景脚本必须是可读源码并通过静态检查：不能 `import`/`require`、`eval`、`Function`，不能用网络、存储和全局对象
  （`fetch`、`WebSocket`、`localStorage`、`navigator`、`self`、`globalThis` 等），不能有原型链技巧和混淆（超长行、`\x..` 转义、`atob`）。
  CI 还会在沙箱里试运行每个场景（不报错、不空白）。插件里脚本始终运行在没有网络的 Web Worker 沙箱中。
- Pull Request 只能改动 `packs/<id>/`，不要修改 `index.json`。

维护者会审核每个 Pull Request 后再合并。权利人要求时，包可能被移除。
