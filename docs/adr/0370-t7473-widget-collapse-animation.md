# ADR 0370：T-7473 第二面板小组件局部折叠/展开动画与键盘交互加固

## 背景与上下文

在第二面板（组件工作台）中，每个小组件卡片头部均具备折叠/展开把手（`sw__home-module-toggle`）。
此前当用户触发折叠时，仅组件内部的内容容器（`body`）被隐藏，而外层 CSS Grid 网格单元格卡片（`.sw-home__cell`）依然保持声明的多行网格高度（`gridRow = span ${effectiveH}`，通常为 3~4 行），在界面上留下了大片空白无用的卡片框，极大浪费了垂直空间。

## 架构决策与实现

1. **小组件单元格网格行高动态联动压缩**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中：
   - 当点击折叠/展开把手触发 `onToggle` 时：
     - 同步更新 `cell.dataset.collapsed` 与 `cell.classList.toggle("sw-home__cell--collapsed", entry.collapsed)`；
     - 桌面端动态调整 `cell.style.gridRow = entry.collapsed ? "span 1" : "span " + Math.max(1, effectiveH)`；
   - 在初次渲染或重绘时，若持久化记录为已折叠，初始行高直接声明为 `"span 1"`。
2. **样式层紧凑微质感与溢出隐藏**：
   在 `src/styles/_05-settings-widgets.scss` 中增加 `.sw-home__cell--collapsed`：
   ```scss
   &--collapsed {
       min-height: var(--sw-control-h, 34px);
       overflow: hidden;

       .sw-home__cell-body {
           display: none !important;
       }
   }
   ```
   折叠后卡片平滑收缩至单行标题栏高度，使工作台排版紧凑致密。

## 验证与证据

1. `tests/widget-collapse-animation.test.cjs`：4/4 满分全绿（含真实负向验证探针）；
2. 保持与工作台历史布局持久化与可撤销性完全兼容。
