# ADR 0466：文档预览查找框、组件商店与片段库实时过滤输入防抖加固（T-7571）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量审查中发现：
1. `src/doc-search-ui.ts` / `src/doc-search-ui.js` 的文档预览查找框（`buildDocPreviewFindBar`）在用户输入字符时，每次 `input` 事件均同步、无延迟地遍历整棵预览 DOM 树并执行 `<mark>` 命中高亮与滚动，在较长文档中造成明显的输入掉帧；
2. `src/home-store-ui.ts` / `src/home-store-ui.js` 的组件商店搜索输入直接同步遍历所有卡片并重算分组标签；
3. `src/snippet-studio-ui.js` 的左侧片段库搜索与目录选择器搜索在每次输入时均完全清空并重新实例化数十至上百个 DOM 节点。

## 决策

1. **预览查找输入防抖**：
   在文档预览查找框的 `input` 事件中引入 120ms 防抖，当用户连续打字时不产生瞬时 DOM 树重构，停止输入 120ms 后批量高亮并自动跳转定位。
2. **组件商店过滤防抖**：
   在组件商店 `searchInput` 的输入监听中引入 100ms 防抖，合并高频过滤请求。
3. **片段实验室目录与库检索防抖**：
   为片段库搜索（`librarySearch`）和目录拾取器（`openCatalogPicker`）的输入流增加 100ms 防抖保护，显著降低内存与微任务抖动。

## 验证

- **契约测试**：`tests/search-debounce-and-filtering.test.cjs` 4/4 满分通过，验证文档查找、商店检索与代码片段库的三重防抖机制；
- **回流测试**：`tests/icon-clamping-batching.test.cjs` 保持全绿。
