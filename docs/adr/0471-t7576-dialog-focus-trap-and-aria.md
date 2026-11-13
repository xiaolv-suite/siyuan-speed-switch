# ADR 0471：全表面 18 处二级弹窗无障碍焦点捕获与 ARIA 规范化（T-7576）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全表面无障碍交互走查与键盘焦点漫游排查中发现：
1. 插件拥有的 18 处二级弹窗（配置表单、组件商店、保存搜索编辑、版本差异、备份恢复、离开确认、快速记录等）在用户使用 Tab 键持续导航时，焦点会穿透弹窗边界溢出至底层的思源笔记主界面或背景遮罩，打破模态交互的心智模型；
2. 弹窗若依赖各处业务手动编写键盘循环逻辑，极易导致遗漏或行为不一致（例如在包含禁用控件、隐藏分支或内嵌子弹窗时发生焦点死循环或抢焦）。

## 决策

1. **统一抽敛轻量焦点循环守护器（trapDialogFocus）**：
   在 `src/platform-dom.js` 中封装专用的 `trapDialogFocus(dialogElement)`：
   - 过滤不可见（`.fn__none`、`[inert]`、`display: none`、`visibility: hidden`）与被禁用的元素；
   - 识别嵌套弹窗边界（`target.closest(".sw-platform-dialog")`），当下级弹窗激活时本层自动让出处理权；
   - 在 `firstElement` 按 Shift+Tab 时自动循环至 `lastElement`，在 `lastElement` 按 Tab 时自动循环至 `firstElement`；
   - 返回标准幂等的解绑函数 `cleanup()`。
2. **在 mountPlatformDialogTitleWrap 中自动挂载**：
   所有二级弹窗均已接入 `mountPlatformDialogTitleWrap`。在装配紫底白标与 `role="dialog"`、`aria-modal="true"` 的同时，自动对弹窗容器挂载 `trapDialogFocus(container)`，一次性覆盖全插件所有二级与三级弹窗。

## 验证

- **契约测试**：`tests/dialog-focus-trap-and-aria.test.cjs` 3/3 满分通过（含正向 Tab / Shift+Tab 循环拦截与负向注入校验）；
- **类型检查**：`pnpm exec tsc --noEmit` 0 报错。
