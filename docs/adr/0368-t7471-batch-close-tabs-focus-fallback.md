# ADR 0368：T-7471 动作画板多页签批量关闭后焦点安全回退加固

## 背景与上下文

在次级动作画板（Raycast 风格 ⌘K 面板）中，用户执行批量关闭动作（如“关闭其他页签”、“关闭其后页签”、“关闭未置顶页签”）时，被选中的旧卡片会被批量销毁并移出 DOM。
此前在列表重新渲染后，未重新指定焦点接管节点，导致原焦点直接失效并掉落至宿主根节点 `document.body`，用户后续按方向键无法继续在切换器内导航，破坏了全键盘操作体验。

## 架构决策与实现

1. **桌面弹窗列表重绘后卡片焦点自动接管**：
   在 `src/index.ts` 的 `batchCloseTabsWithReport` 批量关闭完成且重绘卡片后：
   - 优先查询第一张存活的可见卡片（`scrollElement.querySelector(".sw__card:not(.fn__none)")`）；
   - 若存在有效卡片，直接调用 `focusTarget.focus({preventScroll: true})` 恢复卡片键盘焦点；
   - 若全部卡片均已关闭（空列表），安全回退至搜索输入框 `searchInput.focus({preventScroll: true})`，确保焦点始终处于合法且可交互状态。
2. **侧栏 Dock 面板重绘同步加固**：
   在侧栏重绘（`refreshSidebar()`）后，同样检测并恢复首个有效卡片的焦点。

## 验证与证据

1. `tests/batch-close-tabs-focus-fallback.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. 保持与既有批量关闭撤销回执（T-7356）完全兼容。
