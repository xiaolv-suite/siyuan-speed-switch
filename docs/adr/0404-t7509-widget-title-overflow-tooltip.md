# ADR 0404：第二面板工作台小组件卡片标题超长省略与悬停完整气泡提示加固（T-7509）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，各小组件卡片展示在网格中。此前：
1. 当卡片宽度较窄（如双拼、单列或窄屏）或组件标题较长时，标题文字会自动以 `text-overflow: ellipsis` 省略；
2. 但外部卡片容器 `cell.title` 仅拼接了 `[source, descriptor.subtitle, ...capabilities]`，遗漏了组件本身的名称 `descriptor.title`，导致用户悬停在卡片或标题上时无法通过系统 Tooltip 查看被截断的完整标题；
3. 内部视图 `src/home-view.js` 的 `h3.sw__home-module-title` 与 `span.sw__home-module-context` 在未产生更新时间戳时未挂载初始 `title` 属性。

## 决策

1. **容器卡片悬停气泡补全**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `updateCellDescription` 中，将 `descriptor.title` 前置纳入 `detail` 数组：
   `const detail = [descriptor.title, source, descriptor.subtitle, ...capabilities].filter(Boolean).join(" · ");`
   并在 `cell.title = detail;` 中完整暴露，使用户悬停即可读取完整名称与来源、说明。

2. **标题与上下文原生 Tooltip 补齐**：
   在 `src/home-view.js` 中，创建 `title` 元素时默认设置 `title.title = title.textContent`，创建 `context` 元素时默认设置 `context.title = view.contextTitle`。

3. **样式层省略保护**：
   在 `src/styles/_05-settings-widgets.scss` 中补齐 `.sw__home-module-context` 的单行截断与文本省略规范，防止长上下文挤压破坏标题栏流动。

## 验证

- **契约测试**：`tests/widget-title-overflow-tooltip.test.cjs` 4/4 满分通过，包含标题包含性校验、DOM 属性挂载校验与负向注入拦截；
- **类型与全量测试**：`tsc --noEmit` 零报错，`npm test` 9458 项全绿。
