# ADR 0452：第二面板工作台小组件卡片标题栏长按呼出快捷操作菜单手势加固（T-7557）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片支持通过右键菜单（`contextmenu`）进行配置、刷新、移除等快捷操作。在触控和移动端环境中，用户依赖长按手势（Long-press）唤起上下文菜单。此前：
1. `touchstart` 监听未对内部可交互元素进行过滤，用户点击卡片内的按钮、输入框、复选框时容易意外启动 500ms 倒计时；
2. 触发长按时缺少触觉震动反馈（Haptic feedback）。

## 决策

1. **交互子控件排除守卫**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `cell` touchstart 监听中：
   - 增加 `target.closest("button, input, select, textarea, a")` 判断，当用户触控交互按钮或表单项时直接放行，不启动长按计时器；
2. **长按触觉震动**：
   当长按满 500ms 触发时，安全尝试调用 `navigator.vibrate?.(50)` 触发 50ms 清脆物理震动，随后弹出 `openWidgetContextMenu` 操作菜单。

## 验证

- **契约测试**：`tests/workbench-card-longpress-menu.test.cjs` 2/2 满分通过，验证长按计时、控件过滤、震动调用与负向注入拦截；
- **回流测试**：`tests/workbench-header-active-touch.test.cjs` 保持全绿。
