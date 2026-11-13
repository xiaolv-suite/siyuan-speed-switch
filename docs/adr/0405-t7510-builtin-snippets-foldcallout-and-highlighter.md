# ADR 0405：内置代码片段库新增折叠块引用与荧光笔划词强调 CSS 片段（T-7510）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器深度视觉定制：
1. 思源原生支持在块引用（`NodeBlockquote`）上设置折叠，但折叠后的块引用与普通折叠文本缺乏视觉区分，难以一眼辨识这是一段包含要点的折叠卡片；
2. 原生划词高亮标记（`==marked text==`，即 `[data-type="mark"]`）仅为整块纯色矩形背景填充，缺少纸质书籍阅读中常见的半高马克荧光笔手刷质感与悬浮交互。

## 决策

1. **新增 `swss-builtin-foldcallout`（折叠引用卡片主题主色边框与微底色）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockquote"][fold="1"]`；
   - 归属分类：`quote`；
   - 视觉设计：采用 `border-left: 3px solid var(--b3-theme-primary)` 主色醒目指示条、`color-mix` 派生 6% 微底色与 4px 轻圆角，并在悬停时加深底色至 10% 提升交互响应。

2. **新增 `swss-builtin-highlighter`（荧光笔划词半透横刷马克强调）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="mark"]`；
   - 归属分类：`typography`；
   - 视觉设计：采用 `linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--b3-theme-primary) 28%, #ffeb3b) 55%)` 打造逼真半高书籍划线，悬浮时平滑展开至 40% 高度，极大丰富阅读笔记体验。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 50 项；
   - 双语语言文件齐备并登记至死 key 静态扫描白名单；
   - `tests/snippet-studio-model.test.cjs` 资产规模全面更新至 50 项。

## 验证

- **契约测试**：`tests/builtin-snippets-foldcallout-highlighter.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **模型测试**：`tests/snippet-studio-model.test.cjs` 22/22 绿灯；
- **i18n 测试**：`tests/i18n.test.cjs` 11/11 绿灯。
