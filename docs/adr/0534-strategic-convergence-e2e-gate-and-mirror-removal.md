# ADR 0534: 战略收敛——真实思源核心路径门禁、移除 2.8 万行 JS 镜像、首屏减法与范围冻结（T-7815～T-7818）

## 状态
已决断并实施 (Accepted)

## 背景与实测问题
在对全仓代码结构（9.8 万行源码、692 个测试文件、540 份 ADR、1004 行 ROADMAP）与真实思源隔离宿主进行高层诊断时，定位到制约项目的三大核心矛盾：
1. **验证失真与生产构建布尔污染**：692 个测试文件中有 444 个使用正则扫描源码文本（5,125 处 `assert.match`），导致 `webpack.config.js` 开启 `booleans_as_integers: true` 将生产包布尔字面量压为 `1/0`（破坏 535 处 `=== true/false` 严格判断与 `aria-pressed` 属性）、Go 内核返回 `{code: 0, data: null}` 空切片时书签/标签组件抛错显示“失败”、以及 9 个生态小组件因未设置 `secondary` 字段在工作台显示空白（`B-01`）等问题在“9,846 项单测全绿”下长期漏检。
2. **手工双份维护的技术债**：16 个 TypeScript 核心文件旁各有一份手工维护的同名 `.js` 副本（共 28,201 行），由于 Webpack `resolve.extensions` 优先解析 `.ts`，这些 `.js` 副本从不进入生产产物，且 `src/index.js` 已与真实编译结果漂移 3,725 行，每次修改却需双写。
3. **范围膨胀与首屏违约**：非核心表面代码量已远超切换器主业，切换器与工作台首屏挂载的统计指标栏直接违反 `ROADMAP.md` §2.1“首屏不放统计图表”的约束，29 处弹窗重复挂载版本号徽标并为此跨动态 chunk 传参。

## 决策与实现
1. **建立真实思源核心路径 E2E 发版门禁并修复 P0 实测缺陷（T-7815）**：
   - 新增 `tests/e2e/core-paths.spec.mjs` 与 `scripts/run-e2e-core-gate.mjs`（`pnpm run test:e2e:core`），并接入 `package.json` 的 `verify:release`；
   - 关闭 `webpack.config.js` 中的 `booleans_as_integers`（设为 `false`）；
   - 修复 `scripts/e2e/lib.mjs` 冷启动 `postChecked` 对 `document metadata is not ready` / `Access is denied` 的自动重试；
   - 修复 `src/platform-dom.js` 中 `mountPlatformDialogTitleWrap` 在真实思源 `.b3-dialog__header` 无 `.b3-dialog__title` 子节点时静默返回 `null` 的缺陷，并恢复 `.sw-settings-dialog > .b3-dialog__header` 可见性；
   - 修复 `src/index.ts` 中 `tags` 与 `bookmarks` 组件在 Go 内核返回 `{code: 0, data: null}` 时误判为失败的问题；
   - 落地待办池第一批真坏项：`B-01`（生态小组件 `secondary` 字段补齐、`normalizeHomeViewResult` 保留 `id/blockId/source/pluginId`、`action:riffCard` 与 `copy:` 剪贴板动作接线、异常返回 `status: "error"`）、`B-02`（`this.app?.plugins` 空安全访问）、`B-03`（片段实验室 `1024×640` 125% 缩放下 `.sw-studio__editor-frame` 最小高度 120px 与 `.sw-studio__commands` sticky 底栏）、`B-04`（组件商店 `.sw-home-store__detail-actions` sticky 底栏）；
   - 通过 `pnpm e2e:isolated`（[`tests/e2e/full-interactive-browser-audit.spec.mjs`](../tests/e2e/full-interactive-browser-audit.spec.mjs)）在真实浏览器中逐项点击实测全表面，进一步捕获并修复 4 项此前单测未覆盖的真实交互缺陷：
     1. **多模态 `#标签`、`!书签`、`?速查指引` 在真实浏览器中显示“无匹配文档”**：`src/doc-search-ui.ts` 漏将 `SEARCH_MODES.TAG` 与 `SEARCH_MODES.BOOKMARK` 纳入请求分支，且 `src/search-model.js` 的 `resolveDocSearchResultId` 仅放行 14 位时间戳块 ID，将 `help-*`、`tag-*`、`bookmark-*` 全部过滤为空；已补齐分支、块 ID 提取与 `resolveDocSearchResultId` 放行规则；
     2. **片段实验室工具栏换行后被编辑框遮挡无法点击**：`.sw-studio__section-bar` 缺少 `flex: 0 0 auto`，按钮换行时被压缩至 `42px`，下方 `.sw-studio__editor-frame` 遮挡「选择片段 / 片段商店」等按钮；已补齐 `flex: 0 0 auto; position: relative; z-index: 1`；
     3. **收藏与最近下拉面板按 `Escape` 误关整个切换器**：`trigger` 按钮未监听 `Escape`，且 `.sw__history-trigger` 在异步同步期间 `disabled = true` 导致焦点丢失到 `body`；已在触发器补齐 `Escape` 拦截与展开后焦点保持；
     4. **实验室伴侣栏 DOM 顺序**：将 `.sw-studio__stack-container` 置于 `aiHeader` 之后，保持 `acceptButton` 为 `.sw-studio__ai > button:last-child`；
     5. **切换器 `>` 命令模式二次进入或输入字符后整块列表被隐藏**：`filterCards` 将无 `.sw__card` 子节点的 `.sw__command-list.sw__group` 加上了 `.fn__none`，而 `renderCommandList` 复用节点时未移除 `.fn__none`，且退出 `>` 模式时未清理残留节点；已补齐 `box.classList.remove("fn__none")` 与非命令模式清理，同时为 `commonBridge.search` 补齐查询词核对、防重与 `<button>` 可聚焦支持（`B-13`）；
     6. **工作台自动对齐不可撤销与二级弹窗规范化（`B-12` / `B-05` / `B-06` / `B-14`）**：为「📐 自动对齐」补齐 `data-home-action="auto-align"`、`prepareLayoutMutation` / `commitLayoutMutation` 撤销历史入栈及 7 档合法宽度（`2/4/8/12`）；补齐快速记录输入框 Bento 圆角/内边距/焦点环与自适应高度；为 8 个二级/三级弹窗补齐 `mountPlatformDialogTitleWrap`、非 `.sw-platform-chrome` 弹窗 `.b3-dialog__header` 可见性、FAB 避让、`activeDialogs` 回收、`92vw` 窄屏宽度与异常错误回执；
     7. **思源文档真实写入落盘与活动编辑器解析修复（`T-7820`）**：修复 `resolveActiveHostEditor()` 误查 `this.getActiveEditor`（`Plugin` 实例上不存在该方法，真实宿主编辑器在 `getActiveTab().model.editor`）导致快速记录「当前文档」目标恒置灰、暂存栈「插入当前文档」恒报“未找到活跃编辑器”、模板插入与滚动记忆在真实思源中失效的问题；将暂存栈 `current-doc` 组装改走 `/api/block/appendBlock` 真实写入活动文档、补齐 `journal` 组装未配置日记本时的首本回退、修复动作画板误查 `sw__fav` 类名（实为 `sw__faved`），并清理死方法 `getPlatformMetricsStats` / `refreshTodayTasksCount` 保持 `package.zip` 余量 `2,440 B >= 2,000 B`（严守不调高预算硬上限）；
   - 从真实思源隔离实例直接生成 `acceptance-screenshots/` 下的 6 张明暗实拍图（工作台 8 个组件全部正常展示，0 失败态）。
2. **删除 16 个手工维护的 `.js` 镜像副本（28,201 行）（T-7816）**：
   - 新增 `tests/ts-register.cjs` 并在 `tests/run-tests.cjs` 与 `tests/source-scan.cjs` 接入 TypeScript 按需转译与缓存；
   - 删除 `src/index.js`、`src/second-panel-ui.js`、`src/doc-search-ui.js`、`src/settings-sections.js`、`src/home-store-ui.js`、`src/floating-ball-ui.js`、`src/home-config-form.js`、`src/home-external-adapters.js`、`src/mobile-switcher-ui.js`、`src/platform-metrics-ui.js`、`src/platform-metrics-model.js`、`src/store-labels.js`、`src/constants.js`、`src/doc-search-state.js`、`src/logger.js`、`src/types.js`。
3. **首屏统计栏减法与版本徽标收敛（T-7817）**：
   - 从 `src/index.ts`（切换器）与 `src/second-panel-ui.ts`（工作台）移除首屏 `.sw-platform-metrics-dock` 与 `renderPlatformMetricsBar` 挂载，生产依赖图由 89 降至 87 模块；
   - 版本徽标 `PLUGIN_VERSION_BADGE` 仅在设置弹窗（`openSetting`）显示一处，其余弹窗传空字符串 `""`，并删除 `index.ts` 向 `snippet-studio-ui.js` 的 `versionBadge` 跨 chunk 传参。
4. **范围冻结、关闭调研吸收循环与 ROADMAP 瘦身（T-7818）**：
   - 将原 1004 行 `ROADMAP.md` 归档至 `docs/archive/roadmap-history-through-2026-10-31.md`，主文件压缩为单页战略约束；
   - 宣布非核心表面进入“只修不加”冻结态，关闭“调研—吸收”循环，锁定 `1304 KiB` raw / `692 KiB` zip 包体硬上限（当前实测 `dist/index.js` 1,299,830 B、`package.zip` 705,834 B）。
