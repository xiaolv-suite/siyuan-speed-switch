# 架构决策记录 0497：T-7666~T-7669 平台统计指标栏数据驱动模型、点击联动与极窄容器自适应

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7666, T-7667, T-7668, T-7669
- **参与者**：小驴开发团队、统计优先与数据驱动交互治理

---

## 一、 背景与动因

在落实三段式现代外壳的过程中，需要将主区顶部的统计指标栏（`.sw-platform-metrics-bar`）进行真正的数据模型化与交互闭环：
1. **静态数字向数据驱动演进**：已开页签、我的收藏、今日待办、最近文档 4 个指标需要统一的纯函数数据模型计算，并提供超过 99 时的等宽安全夹取（`99+`）；
2. **两色分工在指标项的视觉落地**：待办指标作为正向数据项需显式声明 `isDataAccent`，采用派生的极光青绿（`--sw-color-data`）高光呈现，与常规操作主色区分；
3. **点击指标直接联动搜索模式**：用户点击对应指标项时，能够快速直达对应模式（如点击待办直达任务穿透、点击页签直达全量过滤），赋予指标项高频交互能力；
4. **侧栏与小屏防撑破响应式保护**：在极窄侧栏（$\le 280\text{px}$）或移动端小屏（$\le 420\text{px}$）时，必须具备自适应折叠规则，杜绝布局溢出与水平滚动条。

---

## 二、 架构决策与标准落地

### 1. T-7666 平台统计指标纯模型抽象（A 档）
- 编写 `src/platform-metrics-model.js`：
  - `buildPlatformMetrics`：输入 stats 与 labels，生成包含 key、label、value、isPrimary、isDataAccent 的标准指标数组；
  - `formatMetricDisplay`：提供 `99+` 优雅夹取与负数归零防护。

### 2. T-7667 指标项交互态与微反馈（A 档）
- `src/styles/_platform-shell.scss`：
  - 为 `.sw-platform-metric-item` 注入 `cursor: pointer`、`:hover { transform: translateY(-1px); background: var(--sw-color-accent-soft); }` 与 `:active { transform: translateY(0.5px) scale(0.98); }`；
  - 聚焦时接入统一发光焦点环 `--sw-focus-glow`。

### 3. T-7668 极窄断点与侧栏响应式收拢保护（A 档）
- `@container (max-width: 420px)` 下折叠次要指标项与分隔线（`is-secondary`），主数值字号自适应收敛至 20px；
- `@container (max-width: 280px)` 下整行优雅隐藏（`display: none !important;`），彻底杜绝 280px 极窄侧栏的横向滚动条。

### 4. T-7669 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/platform-metrics-reactive-and-responsive-contract.test.cjs`；
- 破坏性负向探针验证 280px 容器强制展示 4 列布局时报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/platform-metrics-reactive-and-responsive-contract.test.cjs` 5/5 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
