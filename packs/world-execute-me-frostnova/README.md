# world.execute(me); · FrostNova 实时 3D MV

Install dsh-mv-cli **0.9.6+**, refresh the workshop, and select only your own music. This is FrostNova's original live WebGL2/Three.js rendering, not a 2D substitute: the main edit has 305 shots across 16 chapters; camera rigs, procedural geometry, GLSL, bloom/pointcut, 60Hz stem/mel analysis, all original code quotations, 129 line indices with word timing and official Chinese captions are included offline.

光敏警告：含快速闪烁、强对比与快速切镜。如对闪光敏感，请勿播放。歌曲从0秒对齐，原网页5秒负时间预警不插入音乐时间。需要WebGL2和EXT_color_buffer_float；兼容输出960×540，内部自适应，不宣称网页原生4K。中文原布局/淡入淡出随场景绘制；插件歌词会自动读取，不叠加重复字幕。

AI visuals are credited to Claude Opus 5.5 Max; adaptation is unofficial. Music is not included and no original-site key/audio service is contacted. AGPL code/visuals, MIT libraries, OFL font-derived masks, Mili texts and Anthropic trademarks have distinct terms; only the song-text reuse is scoped to non-commercial fan work. See NOTICE.md, LICENSE.txt and licenses/.

**Complete Corresponding Source, free download:** https://github.com/Alice-Marx/dsh-mv-workshop/releases/download/world-execute-me-frostnova-1.0.0/20261007_frostnova-corresponding-source-1.0.0.zip
Upstream fixed source: https://github.com/FrostNovaOrg/world-execute-web/tree/29aefca50e40c14498420e1c6e1f3a1037727e17
Adapter/build source: https://github.com/Alice-Marx/dsh-mv-cli/tree/main/presets/ports/frostnova-web

Plugin 0.9.6 adds bounded synchronous-generator preparation. The original start/middle/end/transition prewarm is performed per shot before music starts, preserving the original 2048-square galaxy map and all particle counts. The bridge dynamic const-assignment probe is replaced by a static TypeError with the same intended message; original quoted code remains unchanged.
