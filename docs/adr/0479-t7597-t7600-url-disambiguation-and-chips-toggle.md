# ADR 0479：网络 URL 穿透消歧保护、侧栏极窄工具栏高度限制与模式药丸反选重置（T-7597~T-7600）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全面复审评估的第二批确认落地任务中，针对用户在深度使用中的 4 项边缘体验与交互流痛点进行实装闭环：
1. **带端口/路径冒号的 URL 检索误识大纲（T-7597）**：用户在切换器中检索带本地端口的 URL（如 `http://localhost:6806`）或含路径参数冒号的链接（如 `https://domain.com/path:123`）时，`findOutlineColonIndex` 会因为其内部存在第二个冒号而误切为大纲穿透模式，导致整条 URL 被破坏并引发全库空结果；
2. **极窄侧栏 Dock 快捷入口换行挤压（T-7598）**：当用户在侧栏启用了 6+ 个快捷动作，并将侧栏收缩至 280px 极窄模式时，顶栏操作区多行换行导致高度从 44px 暴增至 90px+，严重挤占下方卡片空间；
3. **多模态药丸 Chips 缺少二次反选重置机制（T-7599）**：用户点击顶栏 `@大纲` 或 `#标签` 药丸后，输入框填入前缀，但再次点击该药丸无法取消，必须手动按退格键，缺少直观的 Toggle 语义；
4. **全系统 14 道门禁与契约自洽（T-7600）**：全套改动必须通过类型检查、重现性构建双审计、9,631 项测试与 5 套 Chromium 真实冒烟。

## 决策

1. **协议头连续 URL 保护机制（T-7597）**：
   - 优化 `src/penetration-search-model.js` 中的 `findOutlineColonIndex`：凡以 `http://`、`https://`、`siyuan://`、`file://` 开头且内部无空格分隔的连续字符串，识别为 URL 实体，直接忽略其中的所有冒号并返回 `-1`，强行放行至 `SEARCH_MODES.DOC`；
   - 常规大纲语法（`:标题` 与 `文档名:标题`）继续保持正常大纲穿透。
2. **极窄侧栏单行横向滚动与高度保护（T-7598）**：
   - 在 `src/styles/_07-sidebar-panel-store.scss` 的 `@container (max-width: 280px)` 断点中，为 `.sw__quick-actions` 施加 `max-height: 38px; overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none;` 限制，坚决保住顶栏高度在 48px 以内。
3. **模式药丸二次反选重置机制（T-7599）**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `setupSearchModeChips` 中，当点击的药丸已处于 `is-active` 激活态且前缀非空时，判定为 Toggle 取消动作，自动清空前缀恢复全量检索，消除新手误点后的死胡同。
4. **全量门禁与发布验收（T-7600）**：
   - 新增专项契约测试 `tests/resilience-and-edge-url-contract.test.cjs`（4/4 PASS）；
   - 跑通全部 14 道本地发版门禁（9,631 项测试 100% PASS 与 5 套 Chromium 冒烟），产物热同步至运行态目录。

## 验证

- 新增专项契约测试 `tests/resilience-and-edge-url-contract.test.cjs` 4/4 满分通过（包含正向逻辑与负向注入探针）；
- 全量自动化测试（9,631 项测试）100% PASS；
- 14 道发布总门禁 `pnpm run verify:release` 100% 满分通过；
- 产物热同步至 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。
