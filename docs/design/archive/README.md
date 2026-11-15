# 原型归档与生产实现对照说明（2026-10-31）

> **单一事实源关联**：完整存量材料盘点、四态分类与单一待办池见 [`docs/unified-backlog-and-audit-2026-10-31.md`](../../unified-backlog-and-audit-2026-10-31.md)。
> **治理原则**：遵循“原文件不删只注明去向、过期原型归档并附说明”，`docs/design/` 下被测试脚本或历史文档引用的原型原路径保留，已过期探索稿在本目录建立归档清单并在原文件头部注入归档说明注释。

---

## 一、 全部 22 份原型文件四态与实现对照总表

对照分类定义：
- **已实现（基线生效）**：原型结构与交互已在生产代码落地，作为现行组件/布局参考基线；
- **实现走样（已于 v0.48.85 修正）**：生产实现曾偏离设计规范（如缺失样式类、裸 SVG 或回调未接），已在本轮修复闭环；
- **未实现（受预算/边界暂缓）**：原型中包含的装饰或重型特性未进入生产，已记录明确工程理由；
- **原型已过期（已归档）**：早期单点探索或过度装饰方案，已被现行 Bento 双层微底与两色分工体系（ADR 0485～0531）正式取代。

| 原型文件 | 四态判定 | 对照分类 | 与生产实现对照说明及归档理由 |
| :--- | :---: | :---: | :--- |
| `store-redesign-2026-09-27.html` | 有效 | 已实现 | 组件商店左目录+右详情主从结构生产基线（由 `tests/store-master-detail-contract.test.cjs` 锁定）。 |
| `workbench-redesign-2026-09-27.html` | 有效 | 已实现 | 工作台 12 列网格、四材质×七尺寸档位与编辑态基线（T-6968/T-6969 已落地）。 |
| `platform-topbar-redesign-r5-2026-10-09.html` | 有效 | 已实现 | 平台统一顶栏 R5 布局基线（由 `tests/platform-topbar-layout-contract.test.cjs` 锁定）。 |
| `component-specs-01-clocks.html` ~ `09-longtail.html`（共 9 份） | 有效 | 已实现 | 58 款小组件逐卡规格基线（T-6971/T-7023 已完成双向对账，批次 8/9 由契约测试锁定）。 |
| `design-system-gallery-2026-09-27.html` | 有效 | 已实现 | 平台 UI 原语（六态徽标、kbd、分段控件、胶囊按钮）画廊基线（T-6871 已落地）。 |
| `ui-states-2026-09-27.html` | 有效 | 已实现 | 空态、加载骨架、错误重试与陈旧缓存状态呈现基线。 |
| `skin-prototypes.html` | 有效 | 已实现 | 可选独立皮肤层（融合/液态玻璃/暗夜玻璃/暖纸墨水）基线（ADR 0073，T-6796～T-6798 已落地）。 |
| `platform-ui-redesign-2026-09-26.html` | 已落地未标记 | 已实现 | R1 26 屏全插件原型（设置 10 标签、对话框、移动端），截图脚本 `scripts/design-screenshots.cjs` 引用。 |
| `platform-ui-redesign-r2-2026-09-26.html` | 已落地未标记 | 已实现 | R2 三表面默认全屏与主视野分配基线（ADR 0080，T-6877 已落地）。 |
| `platform-ui-redesign-r4-2026-10-03.html` | 已落地未标记 | 实现走样（已修正） | R4 片段实验室右侧伴侣栏新增 `sw-studio__tab-pill` 与工作台 `sw-home__stack-btn` 在 `697b0d50` 中漏写 SCSS 导致退化为原生灰按钮与 409×161px 裸 SVG，已于本轮 T-7812 彻底修正。 |
| `refactor-a-clock.html` | 过期 | 原型已过期 | **归档说明**：早期时钟单组件草稿，已被 `component-specs-01-clocks.html` 正式规格卡取代。 |
| `second-panel-compact-widget-prototype-2026-10-16.html` | 过期 | 原型已过期 | **归档说明**：10-16 紧凑单色探索稿，已被 T-7618～T-7781 的 Bento 双层微底与纯白浮卡体系取代。 |
| `second-panel-micro-mosaic-prototype-2026-10-16.html` | 过期 | 原型已过期 | **归档说明**：微型信息条拼贴试验稿，未采用其压缩字号方案，已被现行 12 列七档尺寸系统取代。 |
| `adaptive-glance-tiles-prototype-2026-10-16.html` | 过期 | 原型已过期 | **归档说明**：过渡期自适应瓦片试验稿，已被 `component-specs-*` 与 Bento 双层柔影取代。 |
| `cyber-tactile-glance-prototype-2026-10-17.html` | 过期 | 未实现 / 原型已过期 | **归档说明**：含鼠标实时跟随 Spotlight 光标追踪、3D tilt 倾斜与全屏 SVG 噪点滤镜；因持续触发 `mousemove` 重绘损耗帧率且违背极简克制原则（ROADMAP §2.1），仅吸收其等宽数字与 1px 微反光（`--sw-rim-light`），其余装饰废弃归档。 |
| `platform-ui-masterpiece-2026-10-17.html` | 过期 | 未实现 / 原型已过期 | **归档说明**：概念性重混音大屏演示稿，包含噪点开关与非标字体；生产环境坚持复用思源宿主变量与 Bento 双层轻量令牌，已归档。 |
| `unified-platform-os-prototype-2026-10-17.html` | 过期 | 原型已过期 | **归档说明**：OS 桌面化概念稿，违反“不替代思源工作区、不建第二套复杂视觉系统”约束，已由 T-7682～T-7809 的克制型 Bento 外壳取代。 |
| `widget-gallery-glance-prototype-2026-10-17.html` | 过期 | 未实现 / 原型已过期 | **归档说明**：探索将组件商店改为 440px 右侧内嵌小抽屉（Gallery Sheet）；因无法完整容纳 58 款组件的分类目录、实时 1:1 预览与配置表单，生产维持全屏/大窗主从双栏 Dialog（`store-redesign-2026-09-27.html`），本探索稿归档。 |
