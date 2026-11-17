# ADR 0416：第二面板工作台小组件卡片标题聚焦时 Enter 键快速唤出组件配置或打开操作（T-7521）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，用户聚焦卡片时支持多种键盘操作（方向键导航、空格折叠、Delete 移除等）。此前：
1. 聚焦在卡片上按下 `Enter` 键时，代码仅尝试查找编辑态专用工具栏 `.sw-home__cell-tools button`；
2. 当工作台处于普通的浏览模式（未开启全局编辑）时，该容器不存在，按下 `Enter` 毫无响应；
3. 用户需要通过鼠标移动点击卡片右上角微小齿轮，或不得不进入编辑模式，破坏了纯键盘浏览与配置的顺畅体验。

## 决策

1. **Enter 键动作级联回退**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `cell` 键盘监听中：
   - 优先响应编辑态工具栏配置按钮（`.sw-home__cell-tools button`）；
   - 若未处于编辑态，则回退查询模块自身的配置按钮（`.sw__home-module-config`）或组件打开按钮（`.sw-home__open`）；
   - 找到目标按钮即触发 `key.preventDefault()` 与 `openAction.click()`，打通浏览模式下纯键盘一键唤出配置。

## 验证

- **契约测试**：`tests/workbench-cell-enter-action.test.cjs` 3/3 满分通过，包含 TS 与 JS 镜像对齐、回退链断言与负向注入拦截；
- **全量测试**：`tests/workbench-cell-keyboard-actions.test.cjs` 3/3 绿灯。
