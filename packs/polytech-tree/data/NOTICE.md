# Complete non-audio resources / 完整非音乐资源 1.2.0

Full original technology rows, descriptions and per-entry sources are retained in data/catalog-*.json; original eras/categories are in data/source-meta.json. Only sharding changed. Structured fields remain CC BY 4.0; Chinese descriptions remain CC BY-SA 4.0, including attribution to upstream and referenced Wikipedia contributors. Code is MIT. The row descriptions and their adaptations must retain their share-alike terms: https://creativecommons.org/licenses/by-sa/4.0/ . The original project has no song/lyric track; no artificial lyrics are added. 可以静音播放，或自备音乐。

# data/

Derived from `data/techs.json`, `data/eras.json` and `data/categories.json` of
[Polytech Tree](https://github.com/secwind7/polytech-tree) (commit `51d6e1f5141e`) — structured fields (name, nameEn, year, era,
category, importance, prereqs, colours), licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
Attribution: *Polytech Tree (github.com/secwind7/polytech-tree), CC BY 4.0.*

**Changes:** the fields above were reduced to what the tour draws; node positions, reveal times and edge
timings were computed from them with the original layout / tour algorithms (MIT) and stored here
(`nodes-*.json`: [x, y, z, category, importance, revealAt, spin, phase] + names; `edges.json`: [from, to, start, duration];
`tower.json`: eras and categories). The complete original rows, including Chinese `desc` summaries
(CC BY-SA 4.0) and per-entry source credits, are retained unchanged in `catalog-*.json`.
