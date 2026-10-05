# Polytech Tree · 人类科技树漫游

**Original / 原作:** [secwind7/polytech-tree](https://github.com/secwind7/polytech-tree) · code MIT · data CC BY 4.0

把 Polytech Tree 的「▶ 漫游动画」适配为实时 GPU 3D（`canvas.output: "webgl"`，需要 dsh-mv-cli **0.9.2** 或更新）：
3862 项科技、4962 条前置关系、11 个时代；镜头沿塔轴俯视上升，每个时代按科技数分配 10–30 秒，
科技按年份逐个显现，前置连线在目标显现前 1.6 秒内爬到。全片约 192 秒。

- 没有配乐：可以不选音频直接播放（静音时钟），也可以配任何你喜欢的歌；有音乐时画面会随响度微微发光。
- 与原作的差别：这里用裸 WebGL2 实例化八面体、深度遮挡与透视镜头，而非加载完整 Three.js 网页；
  保留原布局与漫游时序，简化形状、后处理和标签；没有悬停、筛选等交互。

See [NOTICE.md](NOTICE.md) for attribution, licences and changes.
