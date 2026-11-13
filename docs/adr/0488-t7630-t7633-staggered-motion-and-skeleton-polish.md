# 架构决策记录 0488：T-7630~T-7633 结果行错峰微动效、骨架屏双层流动渐变与悬停微光反馈

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7630, T-7631, T-7632, T-7633
- **参与者**：小驴开发团队、视觉与微交互动效治理

---

## 一、 背景与动因

在落实设计语言的静态结构后，动效与瞬态反馈需要从“能用”提升至“现代顺滑”，严控性能开销：
1. **列表加载硬切缺乏呼吸感**：切换器搜索结果返回时，卡片直接静态突显，缺少阶梯式层次入场；
2. **骨架屏质感粗糙**：骨架屏线条此前采用单色透明度闪烁，在极浅微底背景上显得呆板生硬；
3. **悬停微触感细腻度**：鼠标划过卡片时需要给出一到两像素位移（-1.5px）与三到五个百分点（3%）亮度微调，形成自然的吸顶微光感。

---

## 二、 架构决策与落地实现

### 1. T-7630 结果行错峰微动效（A 档）
- 声明 `@keyframes sw-list-item-enter`，仅操作 `transform: translateY(3px)` 与 `opacity`，严格杜绝重排（Reflow）；
- 为前 6 个卡片赋予 20ms 阶梯延迟（`&:nth-child(n) { animation-delay: (n-1)*20ms; }`），呈现干脆利落但富有节奏的物理入场；
- `prefers-reduced-motion: reduce` 下强制 `animation: none !important; transition: none !important;`。

### 2. T-7631 骨架屏同族双层流动渐变（A 档）
- `_05-settings-widgets.scss`：骨架屏线条升级为基于同族底色（`--sw-color-accent` 6%~12% 混合）的 200% 宽度线性流动渐变，以平滑位置位移替代单调明暗闪烁。

### 3. T-7632 悬停亮度微反馈与半透明分割线（A 档）
- 卡片悬停赋予 `transform: translateY(-1.5px); filter: brightness(1.03);`；
- 分割线全量使用透明度分层 `--sw-color-line-soft`，去除生硬灰色实线。

### 4. T-7633 契约测试与破坏性负向探针验证
- 新增专项测试 `tests/staggered-motion-and-skeleton-polish-contract.test.cjs`；
- 探针拦截单步错峰延迟过大（>100ms）导致的拖沓迟滞。

---

## 三、 验证与证据

- 专项契约测试 `node tests/staggered-motion-and-skeleton-polish-contract.test.cjs` 5/5 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
