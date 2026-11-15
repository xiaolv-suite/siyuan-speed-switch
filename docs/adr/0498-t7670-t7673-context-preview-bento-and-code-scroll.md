# 架构决策记录 0498：T-7670~T-7673 上下文预览面板 Bento 浮起质感、长代码横向滚动隔离与胶囊微触感

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7670, T-7671, T-7672, T-7673
- **参与者**：小驴开发团队、上下文面板与排版边界治理

---

## 一、 背景与动因

在落实三段式现代外壳的过程中，右侧随动上下文面板（`.sw__doc-preview`）存在以下细节优化空间：
1. **历史实线边框与粗聚焦环**：右侧面板此前仍保留 `border: 1px solid var(--b3-border-color)` 与 `:focus-within { outline: 2px solid ... }`，与左侧主内容区的 Bento 纯白微浮起设计语言存在割裂；
2. **极端超长代码块排版隐患**：当预览的文档中包含未自动折行的极端长代码或连续单行文本时，若缺少强制限宽与横向隔离，可能导致预览窗格横向膨胀挤压左侧卡片列表；
3. **固定与查找按钮形态分散**：面板顶部的图钉固定与查找切换按钮此前采用普通圆角矩形，未收敛至全圆角胶囊体系。

---

## 二、 架构决策与标准落地

### 1. T-7670 右侧上下文预览面板 Bento 浮起收敛（A 档）
- `src/styles/_03-switcher-mobile.scss`：
  - 边框弱化为半透明 `--sw-color-line-soft`；
  - 底色接入 `--sw-card-float-bg`（纯白/近白）；
  - 阴影接入双层近远复合柔影 `--sw-shadow-bento`；
  - `:focus-within` 统一为全局发光焦点环 `--sw-focus-glow`。

### 2. T-7671 预览代码块超长行横向滚动隔离防护（A 档）
- `.sw__doc-preview-block--code`：明确注入 `max-width: 100%; overflow-x: auto; box-sizing: border-box;` 以及等宽字体 `--sw-font-mono`，确保即使遇到超长代码也能在块内平滑横向滚动，彻底杜绝容器撑破风险。

### 3. T-7672 固定与查找开关全圆角胶囊与微触感优化（A 档）
- `.sw__doc-preview-pin` 与 `.sw__doc-preview-find-toggle` 收敛至全圆角胶囊 `var(--sw-platform-radius-pill, 999px)`；
- 注入 `:hover` 微浮起与 `:active` 缩放微触感。

### 4. T-7673 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/context-preview-bento-and-code-scroll-contract.test.cjs`；
- 破坏性负向探针验证代码块若移除滚动隔离必报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/context-preview-bento-and-code-scroll-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
