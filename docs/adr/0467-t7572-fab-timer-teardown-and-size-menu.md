# ADR 0467：浮动球定时器对称清理与工作台重绘尺寸菜单解绑（T-7572）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量审查中发现：
1. `src/floating-ball-ui.ts` / `src/floating-ball-ui.js` 的 `destroy()` 函数对 `reconcileTimer` 声明了在 `defaultView` 不存在时通过全局 `clearTimeout` 兜底，但对 `busyTimer` 仅声明了 `this.doc?.defaultView?.clearTimeout`。若在窗口销毁或 iframe 卸载时触发析构，`busyTimer` 将无法清除并残留孤儿回调；
2. `src/second-panel-ui.ts` / `src/second-panel-ui.js` 的工作台重绘函数 `renderPanel()` 重新构建整个 DOM 树，但未主动执行 `disposeSizeMenu()`。如果用户在尺寸菜单（SizeMenu）处于展开状态时触发重绘（例如快捷键、定时刷新或撤销操作），浮层 DOM 与绑定在 `window` / `document` 上的三个全局监听将永久泄漏。

## 决策

1. **浮动球定时器对称兜底**：
   在 `FloatingBallUi.destroy()` 中对 `busyTimer` 补齐 `if (view) view.clearTimeout(this.busyTimer); else clearTimeout(this.busyTimer);` 对称安全释放。
2. **工作台重绘尺寸菜单清理**：
   在 `renderPanel()` 起始阶段增加 `disposeSizeMenu()` 调用，保证任何重新渲染前彻底卸载已激活的尺寸浮层与所有全局事件监听。

## 验证

- **契约测试**：`tests/fab-timer-teardown-and-size-menu.test.cjs` 3/3 满分通过，验证浮动球定时器对称兜底与尺寸菜单清理；
- **回流测试**：`tests/search-debounce-and-filtering.test.cjs` 保持全绿。
