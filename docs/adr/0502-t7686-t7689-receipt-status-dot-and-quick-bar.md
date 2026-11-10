# 架构决策记录 0502：T-7686~T-7689 工作台底部回执状态圆点呼吸、胶囊按钮升级与快捷条伪边框消除

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7686, T-7687, T-7688, T-7689
- **参与者**：小驴开发团队、工作台底部状态与布局治理

---

## 一、 背景与动因

在工作台底部状态呈现与快捷操作条的审查中，发现了以下两处微观质感瑕疵：
1. **底部回执缺乏状态微感知与按钮胶囊化**：`.sw-home__receipt` 此前使用灰色实线边框，右侧“详情”按钮为普通文字样式，未纳入软胶囊体系；缺少直观的状态指示小圆点；
2. **快捷条伪边框与内阴影叠加**：`.sw-home__quick-actions` 声明了 `box-shadow: inset 0 1px 0 ..., 0 -1px 0 ...`，产生了生硬的多重线条割裂感。

---

## 二、 架构决策与标准落地

### 1. T-7686 工作台底部回执状态小圆点与软胶囊升级（A 档）
- `src/styles/_05-settings-widgets.scss`：
  - `.sw-home__receipt` 顶边框弱化为半透明 `--sw-color-line-soft`；
  - 增加 6px 圆形状态微光指示点（`&::before`），就绪时为极光青绿 `--sw-color-data`，异常时为 `--sw-color-error`；
  - 右侧详情操作按钮升级为全圆角软胶囊（`.sw-home__receipt-details`），声明 `--sw-color-accent-soft` 淡底与微触感反馈。

### 2. T-7687 工作台快捷条双层伪边框消除（A 档）
- `src/styles/_11-ui-polish.scss`：
  - 彻底铲除 `.sw-home__quick-actions` 的双层 `box-shadow`；
  - 收敛至单一柔和透明度分层 `border-top: 1px solid var(--sw-color-line-soft);`。

### 3. T-7688 移动端横屏视口微密度与留白保护（A 档）
- 保证横屏低高度场景下底部工具栏与卡片网格的呼吸间距。

### 4. T-7689 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/receipt-status-dot-and-quick-bar-contract.test.cjs`；
- 破坏性负向探针验证状态点若被破坏为直角方块必报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/receipt-status-dot-and-quick-bar-contract.test.cjs` 3/3 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
