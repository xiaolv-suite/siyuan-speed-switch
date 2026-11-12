# 架构决策记录 0490：T-7638~T-7641 悬浮球吸附弹性回弹、快捷动作微触感与数字芯片等宽排版

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7638, T-7639, T-7640, T-7641
- **参与者**：小驴开发团队、全局触发器与快捷动作治理

---

## 一、 背景与动因

在全局触发器（悬浮球 FAB）与展开快捷动作面板的视觉感知审计中，发现了以下细节缺口：
1. **拖拽吸附缺乏物理质感**：悬浮球作为全平台唯一的可拖拽物理元素，此前拖动吸附释放使用普通 ease 曲线，缺乏真实的物理阻尼回弹弹性；
2. **快捷动作项缺乏按下触感**：展开面板中的每个动作行在点击或触控时，没有 `:active` 的微缩放反馈，键盘聚焦态使用默认 2px 边框而非发光环；
3. **数字直达芯片排版微抖**：前 9 个动作的快捷数字提示未强制等宽数字与等宽代码字体，切换时偶发轻微横向跳动。

---

## 二、 架构决策与标准落地

### 1. T-7638 悬浮球拖拽释放吸附弹性回弹（A 档）
- 依据“弹性曲线仅用于可拖拽可回弹元素”原则，为 `.sw-fab-trigger` 注入 `cubic-bezier(0.16, 1, 0.3, 1)` 物理弹性曲线；
- 位移动画纯由 `transform: translateX(...)` 与 `opacity` 承载，零重排开销，减动效模式下即时重置。

### 2. T-7639 快捷动作面板交互八态与发光焦点环（A 档）
- 动作卡片 `.sw__floating-ball-action.is-more-item` 注入 `transition: transform $sw-dur-fast $sw-ease` 与 `:active:not(:disabled) { transform: translateY(1px) scale(0.985); }`；
- 管理按钮与输入框 `:focus-visible` 全面接入统一微光焦点环 `--sw-focus-glow`。

### 3. T-7640 数字直达芯片等宽排版与 4px 微圆角收敛（A 档）
- `[data-digit]::before` 注入 `font-family: var(--sw-font-mono, monospace); font-variant-numeric: tabular-nums;`；
- 圆角收敛为 `var(--sw-radius-xs, 4px)`，并绑定 `--sw-shadow-xs` 柔影。

### 4. T-7641 契约测试与破坏性负向探针验证
- 新增专项测试 `tests/fab-spring-motion-and-actions-contract.test.cjs`；
- 验证吸附动画移除弹性或缩放位移失真时必定精准报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/fab-spring-motion-and-actions-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
