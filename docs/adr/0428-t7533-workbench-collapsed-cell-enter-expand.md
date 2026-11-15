# ADR 0428：第二面板工作台小组件折叠状态下回车与空格键双向触感切换加固（T-7533）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，用户可通过空格键或折叠按钮对卡片进行就地折叠。此前：
1. 当卡片处于折叠状态（`sw-home__cell--collapsed`，仅露出一行标题栏）时，用户聚焦卡片并按回车键（`Enter`），代码仍会直接穿透尝试打开组件配置表单或打开外部插件；
2. 在折叠状态下，用户按回车的首要心理预期是“展开该卡片以查看内容”，而非触发后台配置弹窗或跳转外部页面；
3. 缺少折叠态与展开态的回车键语义自适应分流。

## 决策

1. **Enter 键按折叠状态自适应分流**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中，当触发 `key.key === "Enter"` 时：
   - 首先检查 `cell.classList.contains("sw-home__cell--collapsed")`；
   - 若当前为折叠态，优先执行 `.sw__home-module-fold` 按钮点击以一键展开卡片；
   - 若当前为正常展开态，则继续流转既有的配置表单与插件打开链。

2. **双向键盘流一致性**：
   折叠状态下按 `Enter`、`Space`、`[`、`]` 均可快速唤起卡片展开，操作容错率与可用性大幅增强。

## 验证

- **契约测试**：`tests/workbench-collapsed-cell-enter-expand.test.cjs` 3/3 满分通过，验证折叠态判定、展开按钮激发与负向注入拦截；
- **全量测试**：`tests/workbench-cell-enter-action.test.cjs` 3/3 绿灯。
