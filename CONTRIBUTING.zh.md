# 投稿 MV 包

[English](CONTRIBUTING.md)

这里收录 DeepSeek Harness 插件 [dsh-mv](https://www.npmjs.com/package/@ljwei-stak/dsh-mv-cli)（**MV 放映室**）的
ASCII MV 包。每个包放在 `packs/<id>/`，CI 在每次合并后重新生成 `index.json`。没有服务器：插件从
`raw.githubusercontent.com` 下载 `index.json` 和包文件，并按索引里的 sha256 校验每个文件。

## 最简单：在插件里「发布到工坊」

1. 在 MV 放映室打开你的包 → **发布到工坊**，填写 id、版本、许可证、作者、简介。
2. 插件检查包，**只去掉歌曲音频**，保留独立授权的歌词/译文、逐句/逐词时间、频谱和声明的画面资源，
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
audio.duration、audio.fingerprint），并且**不能**包含歌曲 `audio`。可以用 `lyrics` / `spectrum` 引用包内数据；歌词需在工坊元数据单独声明 `lyricsLicense`、`lyricsCredit`，可填 `lyricsSource`。完整轨道需插件0.9.4+，安装后自动加载；用户只需自备音乐。
时间轴里的 `h` 是该行文字经 NFKC、转小写、去掉空格 / 标点 / 符号后 sha256 的前 16 位十六进制。

## 规则（CI 用 `node scripts/validate.mjs` 检查）

- `<id>`：小写字母、数字和 `-`，3–64 个字符，与 `x-dsh-mv-workshop.id` 相同。
- 允许的文件：`.json .js .mjs .md .txt .png .webp .jpg`；每个包最多 40 个文件、8 MiB；文本/数据 512 KiB，文本/2D 脚本 256 KiB、WebGL 脚本 2 MiB、封面 1 MiB（canvas.assets 图片仍为 512 KiB）。
- **不允许歌曲音频 / 视频**（`.mp3 .flac .wav .m4a .ogg .mp4 …`）。显式引用并授权署名的歌词轨可用 `.lrc .srt .vtt .json .js .mjs`；未声明的词文仍拒绝。JS只读静态数据，不作为场景执行；建议用发布器生成的标准JSON。
- **必须声明许可证**（`x-dsh-mv-workshop.license`），见 [LICENSE-POLICY.md](LICENSE-POLICY.md)。
- 改编自他人作品时，用 `x-dsh-mv-workshop.source` 写上原作链接（`https://`，例如原仓库），面板会在卡片和详情里显示为「原作」。较大的渲染数据放在 `canvas.assets`（单个 JSON ≤ 512 KB，大的要拆分；整个包 ≤ 8 MB）。
- **像素场景（dsh-mv-cli 0.9.1+）**：`canvas.output: "pixels"`，`canvas.size: [宽, 高]`（最大 1920×1080），定义 `paint(g, t, w, h, ctx)` 在 2D 画布上绘制（不能用 WebGL）。脚本包还会在 `setup(info)` 的 `info.assets` 里拿到 `canvas.assets`。CI 会算出 `requires`（能播放这个包的最低插件版本，这类包为 `0.9.1`）写进 `index.json`；也可以自己在 `x-dsh-mv-workshop.requires` 写更高的版本。CI 用替身画布检查像素场景（每个采样帧都必须画了东西）。
- 场景脚本必须是可读源码并通过静态检查：不能 `import`/`require`、`eval`、`Function`，不能用网络、存储和全局对象
  （`fetch`、`WebSocket`、`localStorage`、`navigator`、`self`、`globalThis` 等），不能有原型链技巧和混淆（超长行、`\x..` 转义、`atob`）。
  CI 还会在沙箱里试运行每个场景（不报错、不空白）。插件里脚本始终运行在没有网络的 Web Worker 沙箱中。
- Pull Request 只能改动 `packs/<id>/`，不要修改 `index.json`。
- **WebGL 3D（0.9.2+）**：`canvas.output: "webgl"`，定义 `setup(info, gl)` 与 `paint(gl, t, w, h, ctx)`。
  已打包的 Three.js 使用 `{ canvas: info.canvas, context: gl }`。库里未执行的浏览器/网络 API 引用可保留并给警告，
  但运行时仍禁用这些 API，不支持 CDN、DOM 或独立动画循环。按绝对时间 `t` 重建画面保证 seek。
  CI 只记录调用（`gpuValidated: false`），投稿前须另用真实 Chromium 验着色器、纹理、画面、拖动进度、缩放及资源清理。

维护者会审核每个 Pull Request 后再合并。权利人要求时，包可能被移除。
