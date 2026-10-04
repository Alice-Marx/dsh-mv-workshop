# data/

Derived from `data/techs.json`, `data/eras.json` and `data/categories.json` of
[Polytech Tree](https://github.com/secwind7/polytech-tree) (commit `51d6e1f5141e`) — structured fields (name, nameEn, year, era,
category, importance, prereqs, colours), licensed **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/).
Attribution: *Polytech Tree (github.com/secwind7/polytech-tree), CC BY 4.0.*

**Changes:** the fields above were reduced to what the tour draws; node positions, reveal times and edge
timings were computed from them with the original layout / tour algorithms (MIT) and stored here
(`nodes-*.json`: [x, y, z, category, importance, revealAt, spin, phase] + names; `edges.json`: [from, to, start, duration];
`tower.json`: eras and categories). The Chinese `desc` summaries (CC BY-SA 4.0) are **not** included.
