# Attribution and authorization

Original: https://gitee.com/wiers-jack/world-execute-me-mv (revision aabf9b12583193a11de5d5d3276a5f6169878830).

This bundle includes the original 12 scene implementations, palette, procedural texture helpers, section manager, camera paths and post-processing chain (RenderPass, UnrealBloomPass, final shader and OutputPass). It embeds Three.js 0.160.1; its MIT license is reproduced separately in LICENSE.txt.

Authorization: on 2026-10-05 the workshop maintainer confirmed direct contact with wiers-jack and permission to publish this adaptation under MIT. The MIT grant is reproduced in LICENSE.txt with copyright credited to wiers-jack; the worker adapter is MIT, copyright Alice-Marx. This records the maintainer-reported direct author authorization, not a LICENSE file added to the upstream revision. The source checkout is unchanged; source-provenance.json preserves its historical package declaration and records this separate author grant.

Changes: DOM bootstrap, keyboard controls, file picker, AudioEngine and LyricOverlay removed; generated texture canvases replaced by OffscreenCanvas; lyric-dependent visual cues resolved to numeric times; embedded lyric prose replaced by code-state labels; six sung countdown names replaced by numerals; film-grain clock anchored to audio t; discontinuous seeks reset camera state and trance audio smoothing; current camera is applied before billboard geometry updates. The panel supplies time, spectrum and optional user lyrics. No audio, lyric file, artwork or external network asset is bundled. The cover is a screenshot of this rendered scene.

Music/lyrics: © Mili and their rights holders, not included.
