# ADR 0480：代码编辑器 Ctrl+Y 快捷键对齐、index.js 同构与画板防呆守卫（T-7601~T-7604）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在推进产品深度体验闭环过程中，针对快捷键多平台习惯与纯 JS 运行时同构进行深化加固：
1. **Windows 键盘习惯重做（T-7601）**：在代码片段实验室的文本编辑区，除 macOS/通用习惯的 `Ctrl+Shift+Z` / `⌘Shift+Z` 外，广大 Windows 桌面用户习惯按 `Ctrl+Y` 进行重做；原有监听器仅检查了 `"z"`，导致 `Ctrl+Y` 无响应；
2. **纯 JS 模块同构契约（T-7602）**：`src/index.js` 在单测和部分轻量离线环境中被直接调用，需与 `src/index.ts` 保持同构，具备 `setupSearchModeChips` 方法及其生命周期释放；
3. **动作画板空动作执行防呆（T-7603）**：在次级动作画板无任何可用动作或过滤为空时，用户按下回车键（`Enter`），状态机必须严密返回 `NOOP`，绝不允许向外触发空动作执行。

## 决策

1. **编辑器快捷键跨平台习惯对齐（T-7601）**：
   - 在 `src/snippet-studio-ui.js` 的 `field.addEventListener("keydown")` 中，增加 `(event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "y" && !event.shiftKey && !composing` 分支，拦截默认事件并触发 `redoDraft()`，同时保留原有 `Shift+Z` 逻辑与契约。
2. **index.js 运行时同构镜像补充（T-7602）**：
   - 在 `src/index.js` 补齐 `setupSearchModeChips` 实现，并在 `assembleSwitcherParts` 与 `release.fn` 中挂载与清理，实现与 `index.ts` 的同构对齐。
3. **动作画板空动作防呆（T-7603）**：
   - 在 `src/action-palette-navigation.js` 中固化 `!targetAction` 时返回 `PALETTE_KEY_ACTIONS.NOOP` 守卫，杜绝空指针。

## 验证

- 新增专项契约测试 `tests/editor-shortcuts-and-dispatch-contract.test.cjs` 4/4 满分通过（包含正向逻辑与负向注入探针）；
- 全量自动化测试（9,635 项测试）100% PASS；
- 14 道发布总门禁 `pnpm run verify:release` 100% 满分通过；
- 产物热同步至 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。
