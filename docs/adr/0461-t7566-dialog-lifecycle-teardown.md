# ADR 0461：全表面活动弹窗统一追踪与插件卸载 onunload 无损清理（T-7566）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量排查中发现：
1. 插件在 `onunload()` 阶段仅显式销毁了 5 个主弹窗，其余二级弹窗（组件商店、组件配置、保存搜索编辑、版本差异、Gist 恢复、离开确认、快速捕获等）未纳入集中跟踪。如果用户在二级弹窗处于打开状态时重载或禁用插件，可能导致孤儿 DOM 节点残留，并遗留带有闭包引用的事件监听；
2. `src/index.ts` 与 `src/index.js` 的 `onunload()` 中对 `mobileSwitcherDialog?.destroy()` 存在连续两次调用的历史笔误；
3. 二级弹窗标题栏封装（`mountPlatformDialogTitleWrap`）未在根节点标记通用类，未声明 `role="dialog"` 与 `aria-modal="true"`，且内部 SVG 图标缺少 `aria-hidden="true"`。

## 决策

1. **集中活动弹窗与孤儿节点清理**：
   - 在 `Plugin` 实例中声明 `activeDialogs: Set<Dialog>`；
   - 在 `onunload()` 中遍历并销毁所有未关闭的活动弹窗并清空集合；
   - 在 `onunload()` 中查询 `document.querySelectorAll(".sw-platform-dialog")`，查找其父级 `.b3-dialog` 确保即使弹窗对象未直接挂载在主插件上也能彻底从页面清除。
2. **清除历史冗余双重调用**：
   - 彻底移除 `onunload` 中重复的 `mobileSwitcherDialog` 销毁逻辑，消除死代码。
3. **无障碍标记与类名注入**：
   - 在 `src/platform-dom.js` 的 `mountPlatformDialogTitleWrap` 中，自动为外层容器注入 `.sw-platform-dialog` 标记；
   - 注入 `role="dialog"` 与 `aria-modal="true"`；
   - 为标题栏图标注入 `<svg aria-hidden="true">` 杜绝读屏器播报无意义图标标记。

## 验证

- **契约测试**：`tests/dialog-lifecycle-teardown.test.cjs` 4/4 满分通过，严格断言集中清理、重复调用消除与 ARIA 标记注入；
- **类型检查**：`pnpm exec tsc --noEmit` 0 错误。
