# ADR 0463：移动端 Sort Sheet 卸载时全页 inert 锁死防御与离开协调器自愈（T-7568）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量排查中发现：
1. 移动端排序抽屉（`openMobileSwitcher` 中的 `sw__mobile-sort-overlay`）打开时会将 `document.body.children` 的兄弟节点设置为 `inert=""` 与 `aria-hidden="true"`。若在此期间插件被卸载或发生热更新，原清理逻辑仅移除遮罩 DOM，导致页面主体保持 `inert` 状态，整个思源客户端发生不可点击锁死；
2. 移动端切换器在获取 `releaseFab` 后与后续装配之间存在检查点（如输入框未就绪等），原 `switcherRelease.fn` 初始化为 noop，中途销毁弹窗导致 `releaseFab()` 丢失，使悬浮球永久隐藏；
3. 代码片段实验室未保存改动弹窗（`openLeaveDialog`）未配置 `destroyCallback`，若用户通过点击空白处或 Esc 关闭弹窗，`leave.cancel()` 未被触发，导致 `pending` 状态残留，下次保存或离开会错误触发上一次废弃的闭包回调。

## 决策

1. **移动端 FAB 早期立即挂载防护**：
   在 `src/mobile-switcher-ui.ts` 中，获取 `releaseFab` 立即将 `switcherRelease.fn = () => { releaseFab(); };` 挂载，杜绝任意早期退出路径导致悬浮球被永久吞没。
2. **卸载时全局恢复惰性属性**：
   在 `src/index.ts` 与 `src/index.js` 的 `onunload()` 中，移除浮层后遍历 `document.body.children`，对同时拥有 `inert` 和 `aria-hidden="true"` 的孤儿兄弟节点主动清除该属性，避免客户端全局死锁。
3. **离开确认弹窗生命周期闭环**：
   在 `src/snippet-studio-ui.js` 的 `openLeaveDialog` 中增加 `destroyCallback`，在非按钮显式处理的情况下自动调用 `leave.cancel()`，清除废弃意图。

## 验证

- **契约测试**：`tests/mobile-inert-and-leave-safety.test.cjs` 4/4 满分通过，严格断言 FAB 早期安全闭环、inert 属性清理与离开确认自愈；
- **类型检查**：`pnpm exec tsc --noEmit` 0 错误。
