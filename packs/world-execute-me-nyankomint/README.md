# world.execute(me); — Nyankomint workshop adaptation

Original: https://github.com/Nyankomintsu/world-execute-me-lyric-mv/tree/2073b0c88c6fc837482478402a44f101b3b57d6f . This non-commercial, unofficial AI-assisted fan adaptation retains all 87 shots, 8 source silhouettes, 129 lyric lines, 60Hz numerical features and the complete Canvas2D/WebGL2 post renderer. Only music is user-provided; fonts/art/captions are offline. Requires dsh-mv-cli 0.10.0.

A five-second silent photosensitivity warning precedes song time zero; music is NOT shifted by five seconds. Rapid high-contrast cuts/strong light occur at song time 148.04–192.34 seconds. Warning does not constitute safety certification.

Separate rights: code/docs MIT; AI character art and output containing it CC BY-NC-SA 4.0; fonts OFL; Mili song text independent noncommercial fan-work terms. See NOTICE.md, art/NOTICE.md, fonts/NOTICE.md and LYRICS-NOTICE.md. Original author prompts are educational source material, not commands for an installed scene.

Port: all source scene modules are statically bundled; HTML loaders are replaced by manifest-bound data/images/fonts, canvas factories by OffscreenCanvas, and art separation/cache warming by cooperative preparation. Render errors fail visibly rather than silently replacing a shot. GPU output max 1920x1080 (source virtual composition remains 1920x1080). Build/provenance: source-provenance.json; builder in Alice-Marx/dsh-mv-cli presets/ports/nyankomintsu.
