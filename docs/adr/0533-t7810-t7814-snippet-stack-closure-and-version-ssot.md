# ADR 0533: 连续切片暂存栈全链路闭环、选区实时快照、一键撤销与全工程版本单一事实源（T-7810～T-7814）

## 状态
已决断并实施 (Accepted)

## 背景与实测缺口
在对仓库存量材料、22 份设计原型与生产代码进行全量扫描及真实 Chromium（CDP）实测审查时，定位到以下具体缺陷与半成品：
1. **回调断链与假回执半成品（T-7810）**：`src/index.ts` 与 `src/snippet-studio-ui.js` 挂载 `mountSnippetStackView` 时未传入 `onAssemble` 与 `onOpenBlock`，导致用户在代码片段实验室点击「一键组装推入日报 / 组装插入当前文档 / 生成结构化新文档 / 复制组装块」时 **0 次发起内核请求或剪贴板写入**，却在状态栏显示假成功回执；点击血缘反链 `((blockId))` 无反应；`assembleSnippetStackToDoc` 缺少 `try/catch` 且未透传用户选中的组装输出维度（`mode`）；异步操作无防连点互斥锁；`index.ts` 与 `doc-search-ui.ts` 存在 3 处未等待 Promise 的裸 `void navigator.clipboard.writeText` 调用。
2. **编辑区选区失焦丢失与多语言裸键名渲染（T-7811）**：`resolveActiveSelectionContext()` 仅在初始化时静态求值，用户在 `.protyle-wysiwyg` 选中文本后点击悬浮球或呼出切换器动作画板时，浏览器焦点转移导致实时 `window.getSelection()` 清空，且普通文字选区未顺着 `anchorNode.closest("[data-node-id]")` 提取段落块 ID；`snippet-studio-ui.js` 的 `translations` 表漏登记 `snippetStack*` 键，导致界面按钮直接显示英文裸键名 `"snippetStackTitle"`；从工作台点击「连续切片暂存栈」（`objectKind: "stack"`）进入实验室后未自动激活暂存栈标签页，且移动端/侧栏端点击工作台该按钮因实验室仅限桌面而无法使用。
3. **缺失样式、不可逆操作无撤销与折叠栏溢出（T-7812）**：`.sw-studio__ai-nav`、`.sw-studio__tab-pill`、`.sw-studio__stack-container`、`.sw-home__stack-btn` 四个生产类名在 SCSS 中无对应规则，实测 Chromium 渲染为 `2px outset` 原生灰框按钮与 `409×161px` 裸 SVG；伴侣栏折叠态（`data-ai-collapsed="true"`）未隐藏 `.sw-studio__stack-container`；`.sw-snippet-stack` 在独立弹窗中缺少 `--studio-*` 作用域令牌回退；移除单条切片与清空未锁定项无撤销恢复能力。
4. **版本号硬编码分散与 README 失实描述（T-7813 / T-7814）**：28 处 `mountPlatformDialogTitleWrap` 硬编码版本号字面量且 `src/index.js` 缺失 4 处主弹窗标题栏；`README.md` 与 `README.en-US.md` 缺失安装方式章节、误将默认快捷键写为 `Ctrl+P` / `Ctrl+Shift+P`、误称使用 CodeMirror 编辑器、历史更新日志未折叠，且 `acceptance-screenshots/` 停留在旧版界面。

## 决策与实现
1. **打通暂存栈全链路与异常/并发守卫（T-7810）**：
   - 在 `index.ts`、`index.js` 与 `snippet-studio-ui.js` 中完整透传 `stack.assemble`（携带 `assembleOpts`）、`stack.openBlock`、`stack.captureSelection`、`stack.fetchGleanFoldTree`；
   - 为 `mountSnippetStackView` 增加 `asyncBusy` 防连点互斥锁与 `aria-busy` 状态标注；
   - 为 `assembleSnippetStackToDoc` 增加全链路 `try/catch` 异常捕获与时间戳文档命名，并将全仓残余 `void navigator.clipboard.writeText` 统一改为 `.then/.catch` 真实回执。
2. **编辑区选区实时快照、多语言收口与独立弹窗回退（T-7811）**：
   - 在 `bindEditorSelectionObserver()` 监听 `selectionchange`（60ms 防抖，`onunload` 成对解绑），当选区位于 `.protyle-wysiwyg` 内时缓存文本、段落 `data-node-id`、根文档 ID 与标题（60s 有效窗），焦点切入插件 UI 时保留快照；
   - 补齐 `snippet-studio-ui.js` 的 `snippetStack*` 字典映射并移除 `tests/i18n.test.cjs` 中的 12 项伪白名单；
   - 支持 `objectKind === "stack"` 自动展开并激活暂存栈页签；新增 `openSnippetStackDialog()` 复用 `snippet-studio` 动态 chunk 挂载 `.sw-dialog--snippet-stack` 独立弹窗，供移动端、侧栏端及禁用实验室时无损回退。
3. **一键撤销（Undo）与 Bento 样式闭环（T-7812）**：
   - 在 `mountSnippetStackView` 中为单条移除与清空未锁定保留深拷贝快照 `lastUndoSnapshot`，状态栏提供 `[data-stack-action="undo"]` 按钮一键恢复；
   - 补齐 `.sw-studio__ai-nav`、`.sw-studio__tab-pill`、`.sw-studio__stack-container`、`.sw-home__stack-btn` Bento 胶囊样式、折叠栏竖排适配、`.sw-snippet-stack` 作用域令牌回退及 `:focus-visible` 焦点环。
4. **代码版本常量 `PLUGIN_VERSION` 与预算校准（T-7813 / T-7814）**：
   - 在 `src/constants.ts` 与 `src/constants.js` 导出 `PLUGIN_VERSION = "0.48.85"` 与 `PLUGIN_VERSION_BADGE = "v0.48.85"`，主入口通过参数向懒加载 chunk 传递 `versionBadge` 以保持 Webpack Scope Hoisting；
   - `RAW_BUNDLE_BUDGET_BYTES` 由 1296 -> 1304 KiB（1,335,296 B，实测 1,330,988 B，余量 4,308 B >= 2000 B）；`ARCHIVE_BUDGET_BYTES` 由 688 -> 692 KiB（708,608 B，实测 706,011 B，余量 2,597 B >= 2000 B）。
