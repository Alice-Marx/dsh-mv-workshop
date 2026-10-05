# world.execute(me); · Original Three.js MV

This pack preserves wiers-jack's actual Three.js rendering: all 12 original scenes and their 213-second timeline, camera paths, 1.2-second crossfades, fog/palettes, UnrealBloomPass and final shader effects. Install with dsh-mv-cli 0.9.3+ and select your own audio and lyrics. The scene runs offline in the WebGL worker.

Version 1.0.2 enables canvas.subtitles: the panel renders your local bilingual lyrics over the 3D image. Select the original src/lyrics.js directly (or your own LRC/JSON). Only the static LYRICS array is read; imports and overlay code never run. Nothing from your lyric file is uploaded. Update the plugin and this workshop pack, then select the file via Lyrics -> Choose.

The default 1280×720 render target keeps the full post-processing practical. Only DOM/audio/subtitle glue and embedded lyric text have been adapted; the visuals are upstream geometry rather than replacement cubes. See NOTICE.md for exact changes and attribution.

License: original visual code MIT by direct author permission confirmed by the workshop maintainer on 2026-10-05; adapter and Three.js MIT. This permission does not license Mili music or lyrics, which are not bundled.

Build from a checkout of https://gitee.com/wiers-jack/world-execute-me-mv:

```sh
npm ci --ignore-scripts # in the upstream checkout (esbuild and Three.js)
node presets/ports/wiers-jack-three/build.mjs <checkout> <output-directory> --author-mit-permission
```

The MIT flag records the separately confirmed author grant; it must not be used to assume permission for unrelated upstream revisions or assets. The output is one readable, non-minified scenes.js; source-provenance.json records source hashes, changed modules and the authorization basis. This package contains no lyric text or audio file.
