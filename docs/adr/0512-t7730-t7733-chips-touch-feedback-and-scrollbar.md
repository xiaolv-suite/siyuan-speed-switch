# ADR 0512：多模态 Chips 触感微反馈、粗指针触控热区提量与主滚动条滑块主题色悬浮（T-7730~T-7733）

## 背景与诉求

在第一面板（切换器 Switcher）的实际交互细节中，存在三处可进一步收敛的高频触感与无障碍体验点：
1. 顶栏常驻多模态穿透药丸（`.sw__mode-chip`，支持全部、@大纲、^正文、#标签、!书签、>命令、?速查）此前采用单一背景，且在鼠标点击或触摸时缺少 `:active` 物理轻触微反馈与 `:focus-visible` 发光环；
2. 在触屏/粗指针设备（`@media (pointer: coarse)`）上，24px 的高度对于单手拇指点按略显紧凑，容易发生边缘误触；
3. 切换器主列表滚动条滑块（`.sw__scroll::-webkit-scrollbar-thumb`）在 `:hover` 悬停时原本采用灰色加深，缺乏与当前主题主色呼应的专属微光。

## 架构决策与设计

1. **多模态 Chips 白卡浮起与触感微缩放（T-7730）**：
   - 在 `src/styles/_11-ui-polish.scss` 中将 `.sw__mode-chip` 默认背景接入 `var(--sw-card-float-bg, var(--b3-theme-surface))`，贯穿双层微底层级；
   - 注入 `:active { transform: translateY(0.5px) scale(0.97); }` 弹性质感与 `:focus-visible { outline: none; box-shadow: var(--sw-focus-glow); }` 发光微环。

2. **粗指针触控热区提量（T-7731）**：
   - 在 `@media (pointer: coarse)` 媒体查询下，将 `.sw__mode-chips-bar` 的纵向内边距提升为 `var(--sw-space-sm, 6px)`；
   - 将 `.sw__mode-chip` 的高度与最小高度自适应提升至 `30px`，内边距扩展至 `10px`，大幅改善触屏手势容错率。

3. **主滚动条滑块主题色悬浮微透高亮（T-7732）**：
   - 将 `.sw__scroll::-webkit-scrollbar-thumb:hover` 声明为 `color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 55%, transparent)`；
   - 悬停滑块时散发通透的主色微光，消除呆板的纯灰加深。

4. **契约测试与负向验证（T-7733）**：
   - 新增专项测试 `tests/chips-touch-feedback-and-scrollbar-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当粗指针触控热区被非法篡改压缩或丢失 `:active` 触感缩放时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/chips-touch-feedback-and-scrollbar-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 11 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
