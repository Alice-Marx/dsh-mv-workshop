# Polytech Tree · 人类科技树漫游

**Original / 原作:** [secwind7/polytech-tree](https://github.com/secwind7/polytech-tree) · code MIT · data CC BY 4.0

把 Polytech Tree 的「▶ 漫游动画」做成 dsh-mv 的像素场景（`canvas.output: "pixels"`，需要 dsh-mv-cli **0.9.1** 或更新）：
3862 项科技、4962 条前置关系、11 个时代；镜头沿塔轴俯视上升，每个时代按科技数分配 10–30 秒，
科技按年份逐个弹出闪亮，名字停留 2 秒，前置连线在目标显现前 1.6 秒内爬到。全片约 192 秒。

- 没有配乐：可以不选音频直接播放（静音时钟），也可以配任何你喜欢的歌；有音乐时画面会随响度微微发光。
- 与原作的差别：原作用 Three.js（WebGL）实时渲染 3D 多面体；这里在 2D 画布上做同样的俯视透视投影，多面体画成对应面数的多边形；
  收尾的斜向全景改为拉远俯视；没有悬停、筛选等交互。

See [NOTICE.md](NOTICE.md) for attribution, licences and changes.
