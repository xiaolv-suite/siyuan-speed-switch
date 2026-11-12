# ADR 0286：T-7387 片段实验室列表快捷复制、未保存离开确认键盘流与 v0.48.29 闭环

日期：2026-10-27  
状态：accepted  
任务：T-7387  

## 背景

在第三面板（代码片段实验室 Snippet Studio）的深入使用排查中，发现了以下微交互断层：
1. **代码片段复制流程繁琐**：
   - 用户在浏览片段库时，如需将一段 CSS/JS 代码复制到其他编辑器或分享，原本必须先点击选中片段加载进编辑器，再全选、复制；缺少列表级的一键直出按钮；
2. **未保存离开确认弹窗（`openLeaveDialog`）键盘退出断层**：
   - 当用户在有脏改动时试图切换其他片段，系统会弹出“未保存的改动”确认对话框（保存/放弃/取消）；
   - 但弹窗未监听 `Escape` 键盘按键，键盘用户无法直接按 Esc 安全取消并返回当前编辑草稿，必须用鼠标点击取消按钮。

## 决策

1. **片段列表项增设一键复制代码按钮（`sw-studio__library-copy`）**：
   - 在 `renderLibrary` 渲染每个片段条目时，加入轻量复制按钮（📋），点击直接调用具备剪贴板异步/回退双重保障的 `copyText(item.content)`，并即时弹出已复制状态反馈；
2. **`openLeaveDialog` 接入键盘 `Escape` 监听**：
   - 监听按键事件，用户敲击 `Escape` 自动触发 `cancelChoice.click()` 安全退出，键盘焦点平滑归还编辑器；
3. **版本号晋级（v0.48.29）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.29`。

## 证据与验证

1. **专项契约测试**：`tests/snippet-copy-and-leave-dialog-keys.test.cjs` 3/3 通过（含列表复制、离开弹窗按键监听与真实负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
