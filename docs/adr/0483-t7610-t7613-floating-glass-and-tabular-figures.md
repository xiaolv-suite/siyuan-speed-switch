# 架构决策记录 0483：T-7610~T-7613 浮层毛玻璃降级、小组件精密等宽数字与极窄侧栏文本截断保护

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7610, T-7611, T-7612, T-7613
- **参与者**：小驴开发团队、视觉感知与多端稳定性治理

---

## 一、 背景与动因

在视觉与感知层深打磨过程中，针对浮层材质、动态数字排版与极窄屏幕边界，发现了三处影响质感与稳定性的细节缺口：
1. **浮层毛玻璃降级缺失**：悬浮球更多操作浮层与部分小组件卡片声明了 `backdrop-filter: var(--sw-blur-lg)`，但未声明 `@supports not` 降级底色，在低版本 WebView 或老旧图形驱动下，半透明底色过透导致文字可读性严重下降；同时存在 `0 16px 40px` 等散落字面阴影；
2. **时钟与倒数日数字微晃 (Jitter)**：世界时钟时间值与倒数日核心天数未声明 `font-variant-numeric: tabular-nums`，在数字跳变时字符宽度变化引发横向微晃；
3. **极窄侧栏卡片防溢出**：在 280px 极窄 Dock 容器下，长文档标题与深层路径如果缺乏强制单行截断，容易撑破卡片网格或引发横向滚动条。

---

## 二、 架构决策与标准落地

### 1. T-7610 浮层玻璃材质降级与三档阴影收敛（A 档）
- 优化 `src/styles/_floating-ball-more.scss`：字面投影替换为全局浮层标准令牌 `box-shadow: var(--sw-shadow-md);`；
- 补充 `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` 降级声明，底色加深补偿为纯实色 `var(--b3-theme-surface)`；
- 收敛 `_05-settings-widgets.scss` 卡片阴影至 `--sw-shadow-xs/sm`，焦点环统一为 `--sw-focus-glow`。

### 2. T-7611 小组件世界时钟与倒数日等宽数字排版（A 档）
- 在 `_05-settings-widgets.scss` 为 `.sw__home-module-item-value` 与 `.sw__home-stat-value` 注入 `font-variant-numeric: tabular-nums;`；
- 将倒数日字重从 800 收敛为 `var(--sw-weight-bold, 700)`，遵循“字号与色彩优先于全部加粗”原则。

### 3. T-7612 极窄侧栏 280px 断点长文本防溢出保护（A 档）
- 在 `_07-sidebar-panel-store.scss` 容器查询 `@container (max-width: 280px)` 下，为 `.sw__card-title` 与 `.sw__card-meta` 明确声明 `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`，确保极窄侧栏下不出现横向滚动条。

### 4. T-7613 契约测试与破坏性负向探针
- 新增专项测试 `tests/floating-glass-and-tabular-figures-contract.test.cjs`；
- 包含等宽数字被破坏与缺少毛玻璃降级声明的破坏性负向探针验证；
- 跑通全部 8 套样式门禁与构建流程。

---

## 三、 验证与证据

- 专项契约测试 `node tests/floating-glass-and-tabular-figures-contract.test.cjs` 4/4 PASS；
- 8 套样式门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- 真实 Chromium 样式冒烟测试（Dark/Light 双主题）通过；
- 可复现构建 3/3 核心产物一致。
