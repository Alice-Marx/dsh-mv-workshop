# dsh-pv-art — CC BY-NC-SA 4.0 (NOT MIT)

The image files in this folder (`whale-*.webp`, `maid-left.webp`) are **not** covered by the MIT licence of
dsh-mv-cli. They are adapted artwork distributed under the
**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** licence
(CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/ ; full text in `../LICENSE.txt`).

本目录里的图片（`whale-*.webp`、`maid-left.webp`）**不属于** dsh-mv-cli 的 MIT 许可，
按 **署名-非商业性使用-相同方式共享 4.0 国际（CC BY-NC-SA 4.0）** 分发，许可全文见 `../LICENSE.txt`。

## Attribution chain / 署名链

1. 角色原作 Original character 溟月（鲸鱼娘）: © 上善无形 / 上善 — https://www.pixiv.net/users/62155430 · https://space.bilibili.com/4456176
2. 女仆版设计 Maid redesign with DeepSeek elements: ZipZipPipe (zipzip) — https://www.pixiv.net/users/18604994 · https://space.bilibili.com/4168597 · post https://www.pixiv.net/artworks/148186519
   (the redesign was made with an AI image model, GPT Image 2, per the upstream notice / 上游说明该设计使用 AI 生成)
3. 立绘 Standing sprite: Small-tailqwq / dsh-deep-whale `maid-atelier` — https://github.com/Small-tailqwq/dsh-deep-whale/tree/main/maid-atelier
4. 八种表情 Eight expressions: dsh-whale-galgame — https://github.com/JAdpp/dsh-whale-galgame
5. Used in / 取自: MisakaZentai, world-execute-me-dsh-pv — https://github.com/MisakaZentai/world-execute-me-dsh-pv
   (`film/third_party_references/whale_maid_expanded_20260926/`, which keeps the same licence and chain)

The upstream notices are kept verbatim: `upstream-NOTICE-dsh-deep-whale.txt`, `upstream-NOTICE-dsh-whale-galgame.md`.
The upstream project records that ZipZipPipe's Pixiv post asks for attribution and non-commercial use and states that the
DeepSeek girl follows 上善's CC BY-NC-SA 4.0 (checked by upstream on 2026-09-30); see its docs/ASSET_SOURCES.md.

## Changes made here / 本项目的改动

- Downscaled from 935×1682 (expressions) and 1122×2019 (maid-left) to 200×360 and re-encoded as WebP (quality 80).
  缩小到 200×360 并重新编码为 WebP（质量 80）。
- At runtime the dsh-pv canvas preset further crops, pixelates (mosaic), tints (blue / red / grey) and glitches
  these images (avatar in the dsh window, the EXECUTION split screen, the whale-fall finale). Those on-screen
  adaptations are shared under the same licence.
  运行时画布还会对这些图做裁切、像素化、调色和故障效果；这些改编画面同样按 CC BY-NC-SA 4.0 共享。

## What this means / 含义

- Keep the full attribution chain above when you use or adapt these files. 使用、改编时保留完整署名链。
- **Non-commercial only.** 不得商用。
- Adaptations of the artwork must be shared under CC BY-NC-SA 4.0. 改编作品按同一许可分享。
- Since dsh-mv-cli 0.9.0 this folder is **not** in the npm package (which is MIT only). It is distributed in the
  **workshop pack** `world-execute-me-dsh-pv` (https://github.com/Alice-Marx/dsh-mv-workshop/tree/main/packs/world-execute-me-dsh-pv),
  licensed CC BY-NC-SA 4.0 as a whole; without it the dsh-pv renderer draws a placeholder silhouette.
  自 0.9.0 起本目录**不再**随 npm 包分发（插件包为纯 MIT），改由创意工坊包 `world-execute-me-dsh-pv` 分发（整体 CC BY-NC-SA 4.0）。
- No trademark rights are granted (DeepSeek's name and logo belong to their owners). This is an unofficial fan work,
  not affiliated with or endorsed by DeepSeek, Mili, or any author above. 非官方同人，与上述各方无从属关系。
