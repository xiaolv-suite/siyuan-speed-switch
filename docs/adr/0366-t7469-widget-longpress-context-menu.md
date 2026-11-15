# ADR 0366：T-7469 第二面板小组件卡片长按手势与移动端右键菜单交互加固

## 背景与上下文

在第二面板（组件工作台）中，用户在日常浏览查看小组件时，若要对某个小组件进行个性化设置、重新刷新或移除，此前必须先点击工作台右上角的编辑按钮进入全局编辑态，操作链路冗长；而在移动触控设备（手机或平板）上，用户习惯直接通过长按卡片弹出操作菜单。

## 架构决策与实现

1. **小组件卡片右键与长按上下文菜单解耦**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中，针对非编辑模式（`!editing`）下的每个小组件单元格（`.sw-home__cell`）：
   - **桌面端右键（`contextmenu`）**：调用 `new Menu("swHomeWidgetContextMenu")` 弹出原生操作菜单；
   - **移动端触控长按（`touchstart` / `touchmove` / `touchend`）**：
     - `touchstart` 启动 500ms 长按定时器；
     - `touchmove` 实施 10px 欧氏距离移动容差防抖，用户正常划动滚动时立即取消长按定时器，杜绝误触；
     - 500ms 静置后触发并弹出菜单，并在 `touchend` 中阻止后续事件穿透。
2. **菜单功能完备性**：
   - **配置**：存在 `configSchema` 时提供直达配置入口，调用 `openHomeConfigForm`；
   - **刷新组件**：单卡强制刷新 `controller.refresh(inst.config, {force: true})`；
   - **移除**：二次确认后从工作台移除该组件并支持一键撤销。

## 验证与证据

1. `tests/widget-longpress-menu.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. 保持与编辑模式下的把手拖拽（T-7068）完全互斥与安全隔离。
