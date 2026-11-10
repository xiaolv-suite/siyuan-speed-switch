# ADR 0364：T-7467 动作画板思维导图导出按键提示与实体快捷键直达执行契约

## 背景与上下文

小驴雷切次级动作画板（Raycast 风格 ⌘K 面板）中汇集了分屏打开、链接复制、文档集保存、思阅/思播漫游以及一键导出思维导图（`export-tabs-mindmap`）等高频动作。每个动作均在 Keycap 键帽中声明了直观的快捷键（如 `⌥⇧M` 导出大纲、`⌥H` 任务视界、`⌥M` 拾遗漫游、`⌥C` 复制 ID 等）。
此前按键状态机（`action-palette-navigation.js`）只调度了通用的上下方向键、Enter 执行与 Escape 退出，未将实体快捷键直接映射为对应动作的直接执行意图（Direct Execution Intent），导致用户在画板中按下 `⌥⇧M` 时无法直接触发执行。

## 架构决策与实现

1. **直接动作实体快捷键调度**：
   在 `src/action-palette-navigation.js` 的 `dispatchPaletteKey` 状态机中：
   - 监听 `event.altKey` 组合键：
     - `⌥⇧M`（`altKey && shiftKey && key: "m"`）：直接定位并执行 `export-tabs-mindmap`；
     - `⌥H`：直接执行 `task-horizon-today`；
     - `⌥M`：直接执行 `glean-keep-roaming`；
     - `⌥R` / `⌥V` / `⌥C`：分别对应思阅阅读、思播媒体与复制块 ID；
   - 监听 `ctrlOrMeta` 组合键：
     - `⌘D`（收藏/取消收藏）、`⌘P`（置顶/取消置顶）、`⌘W`（关闭页签）、`⌘⇧S`（保存文档集）、`⌘⇧T`（撤销关闭）；
   - 一旦命中且处于可用动作集（`filteredActions`）中，立即将状态关闭（`isOpen: false`）并输出 `intent: PALETTE_KEY_ACTIONS.EXECUTE`，无缝携带 `action` 与 `targetContext`。
2. **安全隔离**：
   当画板处于关闭态（`!state.isOpen`）时，所有内部快捷键保持 `NOOP`，绝不干扰外部宿主事件。

## 验证与证据

1. `tests/action-palette-mindmap-feedback.test.cjs`：4/4 满分全绿（含真实负向验证探针）；
2. `tests/action-palette-home-end-navigation.test.cjs`：3/3 保持全绿。
