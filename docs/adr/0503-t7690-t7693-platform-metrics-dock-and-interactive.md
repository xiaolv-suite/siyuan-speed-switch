# ADR 0503：切换器装配首行统计指标栏与交互流转联动（T-7690~T-7693）

## 背景与诉求

在现代三段式外壳与参考图视觉设计演进中，主内容区遵循「统计优先」设计原则：
- 顶部固定 3~4 个关键指标（大数字配小标签，竖分隔而非卡片包裹，极光青绿数据语义色）；
- 指标项需与下方的搜索框及功能面板形成真机联动，避免“假指标”或“纯摆设”；
- 移动端或窄容器下需具备自适应折叠能力（420px 折叠次要指标，280px 自动优雅隐藏）；
- 键盘导航（Enter / Space）与无障碍属性（role="button"、tabindex="0"、aria-pressed、aria-label）全覆盖。

## 架构决策与设计

1. **DOM 结构与装配挂载（T-7690）**：
   - 在 `buildSwitcherHtml` 的主内容区 `.sw__content` 顶层常驻声明 `<div class="sw-platform-metrics-dock"></div>`；
   - 在 `assembleSwitcherParts` 装配流中获取该挂载点，调用轻量 UI 组件 `renderPlatformMetricsBar`；
   - 由 `SpeedSwitchPlugin` 提供真实数据源桥接：
     - `tabsCount`：`getAllTabs().length` 实时已开页签数；
     - `favsCount`：`this.getFavorites().length` 我的收藏总数；
     - `tasksCount`：`refreshTodayTasksCount()` 异步查询今日未完成待办并由 `cachedTodayTasksCount` 响应式更新；
     - `historyCount`：`this.getOpenHistory().length` 最近文档打开数。

2. **交互联动与高亮流转（T-7691）**：
   - 指标项支持 `click` 与键盘 `Enter` / `Space` 触发；
   - 点击时触发 `.is-active` 互斥流转与 `aria-pressed` 状态更新；
   - 联动映射（`resolveMetricActionKey`）：
     - `tabs` ➔ 清空当前搜索词，恢复全量页签视图，聚焦输入框；
     - `favorites` ➔ 触发 `.sw__fav-trigger` 打开收藏下拉面板；
     - `task` ➔ 输入框填入 `!` 切换至待办模式，聚焦并执行穿透搜索；
     - `history` ➔ 触发 `.sw__history-trigger` 展开最近文档下拉。

3. **响应式折叠与容器防护（T-7692）**：
   - 在 `src/styles/_platform-shell.scss` 中严格锁定：
     - `@container (max-width: 420px)`：自动隐藏次要指标 `.is-secondary`（收藏与历史），仅保留核心【已开页签】与【今日待办】，主数字自适应为 20px；
     - `@container (max-width: 280px)`：整条指标栏 `display: none !important` 优雅隐藏，绝不挤压小窗。

4. **契约测试与负向验证（T-7693）**：
   - 建立 `tests/platform-metrics-dock-and-interactive-contract.test.cjs`；
   - 注入破坏性探针：破坏无障碍 `role="button"` 语义时精准拦截。

## 验证与门禁结果

- 契约测试：`tests/platform-metrics-dock-and-interactive-contract.test.cjs` 4/4 PASS（含负向探针）；
- 样式门禁：8 套核心样式门禁 100% PASS；
- 浏览器冒烟：5 套真实 Chromium 冒烟测试 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
