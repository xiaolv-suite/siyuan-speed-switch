# ADR 0518：搜索过滤角标等宽排版、白卡边缘隔离与清除按钮微动效（T-7754~T-7757）

## 背景与诉求

在第一面板（切换器 Switcher）的顶栏搜索框（`.sw__search-wrap`）中，集成了搜索输入框、清空按钮（`.sw__search-clear`）与过滤条件筛选按钮（`.sw__search-filter-btn`）：
- 过滤条件激活时的数字角标（`attr(data-filter-count)`）缺少 `tabular-nums` 等宽排版与代码字体家族，在多模态与复合过滤条件下数字容易发生字形抖动；
- 搜索清空按钮缺少按下态（`:active`）的轻触缩放反馈；
- 搜索过滤按钮在键盘聚焦态（`:focus-visible`）此前采用实线外框，未能对齐全屏统一发光微环（`--sw-focus-glow`）。

## 架构决策与设计

1. **搜索过滤角标等宽排版与白卡边缘物理隔离（T-7754）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 中将 `.sw__search-filter-btn.sw__active::after` 升级为 `font-family: var(--sw-font-mono, monospace);` 与 `font-variant-numeric: tabular-nums;`；
   - 保持 `border: 2px solid var(--b3-theme-surface);` 物理隔离边框，背景接入 `var(--sw-color-accent, var(--b3-theme-primary))`。

2. **清空按钮按压缩放微动效与输入框聚焦白卡浮起（T-7755）**：
   - 为 `.sw__search-clear` 补齐 `:active { transform: translateY(-50%) scale(0.92); }` 触觉反馈；
   - 搜索输入框 `.sw__search:focus` 声明 `background: var(--sw-card-float-bg, var(--b3-theme-surface));`，输入态纯白浮起。

3. **过滤触发按钮 focus-visible 统一发光微环（T-7756）**：
   - 为 `.sw__search-filter-btn:focus-visible` 统一接入 `box-shadow: var(--sw-focus-glow);`，消除内嵌负边框带来的硬切感。

4. **契约测试与负向验证（T-7757）**：
   - 新增专项测试 `tests/search-filter-badge-and-clear-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当过滤角标丢失等宽排版或丢失物理隔离边框时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/search-filter-badge-and-clear-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 17 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
