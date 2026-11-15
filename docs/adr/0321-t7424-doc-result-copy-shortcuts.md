# 0321. T-7424 文档搜索结果行 ⌘C 与 ⌘⇧C 复制快捷键契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7424

## 背景与上下文

在全库与穿透搜索结果列表（`sw__doc-item`）中，用户此前可通过 ⌘K 打开动作画板后执行“复制块超链接”（`⌘C`）或“复制 Markdown 链接”（`⌘⇧C`），或使用组合键 `Alt+C` 进行复制。
但在文档结果行焦点聚焦状态下，用户习惯性按标准的 `⌘C` 或 `⌘⇧C` 无法直接生效，存在按键直达体验割裂。

## 架构决策

1. **直接拦截 ⌘C 与 ⌘⇧C 复制**：
   - 在 `src/doc-search-ui.ts` 与 `src/doc-search-ui.js` 的 `buildDocResultItem` keydown 处理中：
     - 当捕获 `⌘C` / `Ctrl+C`（非 Shift）时，复制当前文档或正文块的超链接 `siyuan://blocks/${copyTargetId}`；
     - 当捕获 `⌘⇧C` / `Ctrl+Shift+C` 时，复制 Markdown 格式链接 `[${docTitle}](siyuan://blocks/${copyTargetId})`；
     - 触发成功复制提示并在剪贴板写入后阻止默认按键穿透。
2. **门禁与测试**：
   - 新增 `tests/doc-result-copy-shortcuts.test.cjs`；
   - 负向验证：若 ⌘C 缺少 blockId/rootId 守卫必定精准红。

## 后果与影响

- 文档结果行高频复制流转效率显著提升；
- 与动作画板中的快捷键完全统一。
