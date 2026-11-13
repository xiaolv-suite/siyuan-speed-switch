# 架构决策记录 0499：T-7674~T-7677 商店分类全圆角胶囊分段、进度条柔和渐变与胶囊体系贯穿

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7674, T-7675, T-7676, T-7677
- **参与者**：小驴开发团队、胶囊体系贯穿与数据柔和化治理

---

## 一、 背景与动因

在胶囊体系贯穿与柔和数据表达审计中，发现了以下两处微观质感断点：
1. **老旧 Tab 底部实线**：组件商店分类 Tab（`.sw-home-store__tabs`）此前沿用了传统网页式的 `border-bottom: 2px solid` 底横线设计，与全平台确立的全圆角胶囊体系割裂；
2. **进度条轨道生硬矩形**：概览进度条使用了 3px 小圆角，端点不够圆润，且填充色缺少数据语义色过渡；
3. **数据表达柔和化要求**：遵循“折线用粗圆头与渐变面积，气泡与散点用半透明，图表容器不加边框”的原则，需要全面深化。

---

## 二、 架构决策与标准落地

### 1. T-7674 商店分类全圆角胶囊分段体系（A 档）
- `src/styles/_07-sidebar-panel-store.scss`：
  - 彻底铲除 `border-bottom: 2px solid transparent;`；
  - 整体 Tab 槽收敛为 `border-radius: var(--sw-platform-radius-pill, 999px);` 的内嵌胶囊槽位（`inline-flex`），底色采用 `--sw-color-surface-muted`；
  - 激活项 `.sw-home-store__tab.is-active` 声明纯白浮卡底色 `var(--sw-card-float-bg)` 与微抬升柔影 `--sw-shadow-xs`，与第一面板多模态药丸栏完全同构。

### 2. T-7675 进度条 999px 全圆头与数据渐变面积（A 档）
- `.sw__home-progress` 与 `.sw__home-progress-fill` 统一升级为 `border-radius: var(--sw-platform-radius-pill, 999px);`；
- 填充条应用 `linear-gradient(90deg, var(--sw-home-accent), var(--sw-color-data))`，以主题色向极光青绿的柔和过渡表达达成进度。

### 3. T-7676 全圆角工具提示与状态小圆点（A 档）
- 保持胶囊圆角贯穿，状态统一使用文字配小圆点，杜绝大块刺眼底色。

### 4. T-7677 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/capsule-tabs-and-soft-progress-contract.test.cjs`；
- 破坏性负向探针验证分类 Tab 若回退为 2px 实线底边必报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/capsule-tabs-and-soft-progress-contract.test.cjs` 3/3 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
