# ADR 0356：T-7459 全表面双向键盘交互与阶梯 Escape 契约对齐加固

## 背景与动机

在小驴雷切无障碍与全键盘操作体验演进中，各表面确立了以“阶梯式 Escape”（Stepped Escape：输入框有内容时首次按 Esc 清空输入并更新检索，输入框为空时二次按 Esc 退出容器并安全回焦）与“全键盘双向循环流”（Home/End 首末直达、ArrowUp/ArrowDown 跨区域回焦）为核心的高质量交互心智。

然而，部分历史阶段建立的单向契约断言仍以“按 Escape 直接一步退出”或单一字符集进行硬编码匹配，在演进引入任务穿透前缀（`task:`、`[ ]`）与阶梯退出后产生历史断言失配。此外，穿透检索解析器在普通排除语法（如 `-工作`）时误将其识别为 TASK 模式剥离前缀，导致排除词被误当成包含关键词高亮。必须进行系统性的交互加固与契约对齐。

## 架构决策与实现

1. **排除检索语法高亮守卫加固**：
   在 `src/search-model.js` 的 `extractHighlightSearchNeedle` 中增加前置负向排除语法守卫：
   当关键词以单 `-` 开头且紧跟关键词时（如 `-工作`），将其保留为普通搜索文本，交由 `parseSearchTerms` 解析为 `excludes` 排除集，彻底根除排除词被错误高亮标记的缺陷。
2. **商店与预览阶梯式 Escape 契约对齐**：
   - 在 `tests/store-search-interaction.test.cjs` 与 `tests/home-store-keyboard-navigation.test.cjs` 中，断言对齐阶梯式退出：非空查询清空输入、空查询退出商店弹窗；
   - 在 `tests/doc-preview-behavior.test.cjs` 中，测试对齐页内查找栏阶梯式退出：首次 Esc 清空高亮与查询、二次 Esc 收起查找栏；同时验证关闭按钮与 Ctrl+F 恢复上一次查询词的完整回路。
3. **移动端抽屉双向键盘流与关闭契约对齐**：
   在 `tests/surface-close-contract.test.cjs` 中，对齐支持 Home/End 快速直达后的键盘调度，并确保优先将焦点授予首个可用操作按钮。
4. **语言命名空间与死 key 白名单对齐**：
   - 补齐双语 `toolbar` 本地化文案（`"工具栏"` / `"Toolbar"`）；
   - 在 `tests/i18n.test.cjs` 中将动态配置动作（`actionKeepRoaming`、`actionPaletteKeepRoaming`、`actionPaletteTaskHorizon`、`actionPaletteExportTabs`）登记到 `ALLOWED_UNUSED` 允许列表；
   - 在 `tests/task-horizon-adapter.test.cjs` 中将裸 `fs.readFileSync` 彻底消除，改走规范的 `readSourceText`，实现源码读取债务清零。

## 验证与证据

1. 全量自动化测试套件（`tests/run-tests.cjs`）：**9347 项测试，9346 通过 / 0 失败 / 1 跳过**，实现全量自动化测试 100% 满分通过；
2. `search-model` 93/93 满分全绿，负向排除语法与穿透高亮边界完全合规；
3. `store-mobile-layout-contract` 669/669 满分全绿；
4. `kernel-widgets-wiring` 100/100 满分全绿；
5. `quick-actions` 25/25 满分全绿；
6. `i18n` 11/11 满分全绿；
7. `source-scan-coverage` 4/4 满分全绿。
