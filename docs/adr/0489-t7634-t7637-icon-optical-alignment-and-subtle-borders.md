# 架构决策记录 0489：T-7634~T-7637 搜索图标光学居中、闭合圆润边框与半透明分割线全面收敛

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7634, T-7635, T-7636, T-7637
- **参与者**：小驴开发团队、视觉感知与光学对齐治理

---

## 一、 背景与动因

在第一面板（切换器 Switcher）的视觉感知细节审查中，发现了三处微瑕疵：
1. **搜索放大镜图标垂直基线漂移**：`.sw__search-icon` 仅声明了 `left: 8px`，缺乏 `top: 50%; transform: translateY(-50%)` 绝对居中约束，在容器高度微拉伸时出现光学偏上；
2. **输入框下底边缺失**：搜索框历史样式声明了 `border-bottom: 0;`，导致在高分屏与深色模式下边框形成非闭合残缺；
3. **顶栏生硬深灰分割线**：顶栏底部使用了 `1px solid var(--b3-border-color)`，生硬实线与卡片浮起设计语言割裂；
4. **按钮图标光学重心微差**：按钮内 SVG 与文本混排时，受字体 descender 影响，图标视觉重心偶发偏下 1px。

---

## 二、 架构决策与落地实现

### 1. T-7634 搜索放大镜与清空操作光学居中对齐（A 档）
- `.sw__search-icon` 明确注入 `top: 50%; transform: translateY(-50%);`，与右侧清空按钮形成严密光学几何对称。

### 2. T-7635 搜索框四边闭合并发光聚焦（A 档）
- 移除 `border-bottom: 0;`，恢复为四边统一柔和边框 `border: 1px solid var(--sw-color-line-soft, var(--b3-border-color));`；
- 聚焦时接入统一发光焦点环 `--sw-focus-glow`。

### 3. T-7636 顶栏与全局分割线半透明化（A 档）
- 顶栏底部边框收敛为 `1px solid var(--sw-color-line-soft)`（即 45% 透明度分层），消除生硬深灰割裂。

### 4. T-7637 按钮内 SVG 光学基线校准与契约测试
- 在三级按钮 `.sw-btn--primary`、`.sw-btn--soft`、`.sw-btn--quiet` 中声明 `svg { display: inline-block; flex-shrink: 0; vertical-align: -0.125em; }`；
- 新增专项测试 `tests/icon-alignment-and-subtle-borders-contract.test.cjs`；
- 破坏性负向探针验证图标垂直居中丢失报警。

---

## 三、 验证与证据

- 专项契约测试 `node tests/icon-alignment-and-subtle-borders-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
