# 架构决策记录 0496：T-7662~T-7665 并发态幽灵实例防御、清空对话框单例与现代三段式统计外壳

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7662, T-7663, T-7664, T-7665
- **参与者**：小驴开发团队、并发安全性与现代工业结构治理

---

## 一、 背景与动因

在深入交互态与并发态排查中，发现了以下隐蔽缺陷与结构升级需求：
1. **小组件商店连击插入重复实例（幽灵卡片）**：在组件商店中，若用户快速连续点击“添加组件”，在视图刷新尚未完成的微秒级窗口期内，会向 `instances` 和 `layouts` 重复 push 两条相同 `instanceId` 的记录。这会导致后续通过 `findIndex` 移除或拖拽调整时永远只能命中第一条，第二条卡片成为永久无法删除和移动的“幽灵卡片”；
2. **清空工作台连击弹出多层重叠对话框**：连按清空按钮缺少单例守卫，瞬间生成两层确认弹窗；
3. **现代工业三段式与统计优先外壳需求**：依据参考图视觉组织规律，需要确立三段式结构（52px 极窄常驻图标导航条、主内容区、可折叠右侧上下文）并在主内容顶部固化统计优先的关键指标栏。

---

## 二、 架构决策与标准落地

### 1. T-7662 小组件商店添加按钮连点防重防御（P0 级 Bug）
- `src/home-store-ui.ts` 与 `src/home-store-ui.js`：添加前强制检查 `instances` 与当前端侧 `layoutList` 是否已存在该 `moduleId`，存在则直接退出；并在点击瞬间立即设置 `addButton.disabled = true;`，彻底杜绝并发重复插入幽灵卡片。

### 2. T-7663 工作台清空确认对话框单例防重锁（P1 级 Bug）
- `src/second-panel-ui.ts` 与 `src/second-panel-ui.js`：引入 `clearConfirmDialog` 单例引用，在未关闭前阻止二次创建，并在 `destroyCallback` 中安全清空释放。

### 3. T-7664 顶部统计优先关键指标栏与 52px 极窄图标导航（A 档 UI 升级）
- `src/styles/_platform-shell.scss`：
  - 声明 `.sw-platform-metrics-bar`：顶部固定 3~4 个关键统计指标，采用大数字（`--sw-font-stat-hero: 28px`，等宽排版）配小标签，指标之间用半透明竖线（`var(--sw-color-line-soft)`）分隔，严禁卡片包裹；
  - 声明 `.sw-platform-icon-rail`：52px 极窄常驻图标导航条，活跃项采用圆角背景块（`--sw-color-accent-soft`）而非单纯文字变色。

### 4. T-7665 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/concurrency-defense-and-three-column-contract.test.cjs`；
- 负向探针验证小组件添加若失去实例去重判定必定精准报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/concurrency-defense-and-three-column-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
