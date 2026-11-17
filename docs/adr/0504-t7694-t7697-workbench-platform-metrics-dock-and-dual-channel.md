# ADR 0504：工作台主视图装配统计指标栏与双通道直达联动（T-7694~T-7697）

## 背景与诉求

在多表面协同（切换器、工作台、片段实验室）的演进中，主内容区的「统计优先」指标栏不仅要在切换器常驻，也需要在第二面板（工作台 Workbench）主视图首层装配：
- 用户在工作台编排或查阅小组件时，能够一眼获悉全局工作上下文概览（页签、收藏、待办、历史）；
- 点击指标项时，不能是机械跳出，而应遵循就地与跨表面的「双通道直达联动」：
  - 若当前工作台已布局了对应组件卡片（如“今日待办”、“我的收藏”、“最近文档”），则镜头平滑居中聚焦该卡片并赋予呼吸柔光轮廓（`.sw-home__cell--locate`）；
  - 若工作台当前未布局该卡片，或者点击【已开页签】，则平滑通过表面导航 `navigatePlatformSurface("switcher")` 直达切换器对应模式；
- 重绘事务（捕获/恢复）与 Dialog 销毁链路上，指标栏句柄必须被可靠释放，杜绝内存泄漏与幽灵监听。

## 架构决策与设计

1. **工作台主视图装配指标栏（T-7694）**：
   - 在 `src/second-panel-ui.ts` / `src/second-panel-ui.js` 的 `renderPanel` 离屏装配段 `mountFragment` 中，在工具栏 `.sw-home__bar` 上方装配 `<div class="sw-platform-metrics-dock"></div>`；
   - 在 `SecondPanelUiHost` 契约接口中声明 `getPlatformMetricsStats` 与 `refreshTodayTasksCount`，挂接主插件实例的实时统计桥；
   - 挂载 `renderPlatformMetricsBar`，为工作台注入高质感统计指标栏。

2. **双通道直达联动（T-7695）**：
   - 当用户在工作台点击指标项或键盘回车触发时：
     - `tabs` ➔ 调用 `navigatePlatformSurface("switcher")` 无缝切换回第一面板；
     - `favorites` ➔ 优先在 `root` 中查找 `.sw-home__cell[data-module-id="favorites"]`，若存在则 `scrollIntoView({ behavior: "smooth", block: "center" })` + 激活 `.sw-home__cell--locate` 聚焦；若无则回退至切换器；
     - `task` ➔ 优先在 `root` 中查找 `.sw-home__cell[data-module-id="today-tasks"]` 进行就地聚焦高亮；若无则回退至切换器；
     - `history` ➔ 优先在 `root` 中查找 `.sw-home__cell[data-module-id="recent-documents"]` 进行就地聚焦高亮；若无则回退至切换器。

3. **生命周期与响应式防护（T-7696）**：
   - 在面板闭包中持有 `activeMetricsBarHandle`；
   - 在每次 `renderPanel` 重建前及 `releasePanel` 销毁时，严格调用 `activeMetricsBarHandle.destroy()` 并置空；
   - 继承 `_platform-shell.scss` 的 `@container (max-width: 420px)` 与 `@container (max-width: 280px)` 自动折叠与隐藏规则，在移动端与侧边栏下保持克制。

4. **契约测试与负向验证（T-7697）**：
   - 新增专项测试 `tests/workbench-platform-metrics-contract.test.cjs`；
   - 注入破坏性负向验证探针：当篡改就地定位逻辑或破坏 switcher 回退时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/workbench-platform-metrics-contract.test.cjs` 4/4 PASS（含负向探针）；
- 既有指标契约：`tests/platform-metrics-dock-and-interactive-contract.test.cjs` 4/4 PASS；
- 样式门禁：8 套核心样式门禁 100% PASS；
- 浏览器冒烟：5 套真实 Chromium 冒烟测试 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
