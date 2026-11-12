# 架构决策记录 0484：T-7614~T-7617 片段实验室视觉与阴影收敛、等宽代码排版与八态微触感闭环

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7614, T-7615, T-7616, T-7617
- **参与者**：小驴开发团队、视觉感知与第三表面架构治理

---

## 一、 背景与动因

在第三面板（片段实验室 Snippet Studio）的视觉层级审计中，发现了以下四处感知一致性问题：
1. **阴影与回退字号割裂**：库列表项（`&__library-item`）与目录项（`&__catalog-item`）使用了散落的字面阴影 `0 1px 2px rgb(15 23 42 / 4%)` 和 `0 4px 12px`，未纳入三档中性投影体系；复制按钮字号回退写成了 `12px`（实际 `--sw-font-xs` 规范为 `11px`）；
2. **状态徽标残留微弱内阴影**：`&__state-badge` 声明了 `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15)`，破坏了扁平微抬升的设计语言；
3. **按钮缺少按下微触感**：实验室内部的快速切换开关、复制按钮、执行动作按钮缺少 `:active:not(:disabled)` 的微缩放反馈与 `--sw-focus-glow` 双层发光环；
4. **编辑器与 Diff 视口排版**：代码编辑区与 AI 差异对比行未全量声明 `font-variant-numeric: tabular-nums` 与 `--sw-font-mono`，存在高分屏下字符横向错位风险。

---

## 二、 架构决策与标准落地

### 1. T-7614 片段实验室阴影与字号统一（A 档）
- 列表项与目录卡片全面替换为标准令牌 `box-shadow: var(--sw-shadow-xs);` 与悬停 `var(--sw-shadow-sm);`；
- 状态徽标移除 `box-shadow: inset`，转为 1px 半透明边框 `border: 1px solid color-mix(in srgb, currentColor 26%, transparent);`；
- 纠正 `var(--sw-font-xs, 12px)` 为 `var(--sw-font-xs, 11px)`。

### 2. T-7615 交互按钮八态与 Focus-Visible 补齐（A 档）
- 为 `&__button`、`&__library-toggle`、`&__library-copy` 补齐 `:active:not(:disabled)` 下的 `transform: translateY(1px) scale(0.985);` 物理微触感；
- 聚焦态接入统一的 `--sw-focus-glow` 发光焦点环。

### 3. T-7616 代码编辑器与 Diff 视口等宽排版固化（A 档）
- 在 `&__editor`、`&__ai-result`、`&__diff-row` 全量固化 `font-family: var(--sw-font-mono, monospace);` 与 `font-variant-numeric: tabular-nums;`，保证代码缩进与数字排版严格对其网格。

### 4. T-7617 契约测试与破坏性负向探针验证
- 新增专项测试 `tests/snippet-studio-visual-and-shadow-contract.test.cjs`；
- 验证徽标内阴影破坏性注入报警退出，自检与防回归探针双重闭环。

---

## 三、 验证与证据

- 专项契约测试 `node tests/snippet-studio-visual-and-shadow-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
