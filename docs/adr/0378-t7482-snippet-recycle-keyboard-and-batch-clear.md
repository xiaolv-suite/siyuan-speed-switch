# ADR 0378：代码片段实验室回收站全键盘批量清空确认与单项快捷恢复（T-7482）

## 状态

已采纳 (Accepted) - 2026-10-28

## 背景

代码片段实验室的回收站浮层（`sw-studio__recycle`）用于归档与暂存由于覆盖、删除或冲突被淘汰的片段版本（最多 50 条 / 30 天 / 256 KiB 三限淘汰）。

此前：
1. “清空回收站”按钮（`snippetRecycleClear`）在列表为空时未禁用，用户误点仍会弹出确认弹窗；
2. 缺少全键盘快捷操作流：用户浏览回收站时，无法使用键盘快速恢复单项或永久删除单项；
3. 列表项缺少 `Home`/`End` 边界跳转支持。

## 决策

1. **回收站清空按钮空态自适应防护**：
   - 在 `src/snippet-recycle.js` 中新增纯模型导出函数 `clearRecycleStore()`，规范返回版本号为 1 的安全空 store；
   - 在 `src/snippet-studio-ui.js` 的 `renderList()` 渲染周期中，当 `entries.length === 0` 时，动态为清空按钮设置 `disabled = true` 与 `aria-disabled="true"`，杜绝空态下的无效二次确认弹窗；有条目时自动解除禁用；
   - 监听浮层全局快捷键 `Ctrl/Cmd+Shift+Delete` 或 `Alt+C`，在非空状态下快速触发清空确认流。

2. **单项全键盘快捷恢复与删除操作流**：
   - 列表项 `sw-studio__recycle-item` 标记 `tabIndex = 0` 与 `data-rec-id`，纳入键盘焦点环；
   - 聚焦列表项时：
     - 按 `Enter` 或 `r` / `R` 键直接触发 `restoreButton.click()` 执行脏稿检查并恢复；
     - 按 `Delete` 或 `Backspace` 键触发 `purgeButton.click()` 调出二次确认并彻底删除；
     - 按 `ArrowRight` 平滑转移焦点至操作按钮；
   - 浮层监听 `Home` 与 `End` 键，实现首尾条目的直达聚焦与流式滚动。

## 验证

- **契约测试**：`tests/snippet-recycle-keyboard.test.cjs` 包含 3 项契约断言，验证 `clearRecycleStore` 纯模型重置契约、清空按钮空态禁用与快捷键绑定、列表项快捷按键与 `Home`/`End` 跳转流；
- **负向验证**：通过修改 `clearRecycleStore` 返回值注入故障，确认测试能精准拦截报错，还原后 3/3 满分通过。
