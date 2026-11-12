# ADR 0373：T-7477 工作台小组件网格调整把手全键盘 Shift+方向键缩放与双语无障碍契约

## 背景与上下文

在第二面板（组件工作台）的编辑模式下，每个小组件卡片右下角都渲染了一个调整大小把手（`.sw-home__cell-resize-handle`），支持鼠标/触控 Pointer 拖拽微调占用的网格列数与行数。
此前该调整把手仅为普通 `div` 元素，标题写死为中文“拖拽调节宽高”，且未声明键盘聚焦能力与 `slider` 角色，纯键盘用户无法直接通过把手调节卡片网格跨度。

## 架构决策与实现

1. **滑块角色与全键盘无障碍语义**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中：
   - 为 `resizeHandle` 声明 `tabIndex = 0` 与 `role = "slider"`；
   - 标题与可访问标签引用双语字段 `homeResizeHandleTitle`（“拖拽或按Shift+方向键调节宽高” / “Drag or press Shift+Arrows to resize”），彻底消灭字面量硬编码。
2. **Shift+方向键自由网格缩放与平滑回焦**：
   - 监听 `resizeHandle` 的 `keydown` 事件：
     - `Shift + ArrowRight`：宽度 +1 列（上限 12 列）；
     - `Shift + ArrowLeft`：宽度 -1 列（下限 2 列）；
     - `Shift + ArrowDown`：高度 +1 行（上限 10 行）；
     - `Shift + ArrowUp`：高度 -1 行（下限 1 行）；
   - 触发缩放时阻止默认事件，即时调用 `persistLayout({w: nextW, h: nextH})`，重新渲染后平滑将焦点恢复至当前卡片的调整把手上，保证连续微调体验。

## 验证与证据

1. `tests/widget-resize-keyboard.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/i18n.test.cjs`：11/11 满分全绿。
