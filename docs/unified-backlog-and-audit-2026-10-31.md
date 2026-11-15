# 小驴雷切（Lv Speed Switch）存量盘点、全链路实测审计与单一待办池（2026-10-31）

- **审计与封验日期**：2026-10-31
- **适用版本**：`v0.48.85`（本地发版封验，上一版可回滚基线 `v0.48.84` 已备份至 `.artifacts/rollback/`）
- **单一事实源声明**：本文件整合全仓库存量待办、原型与调研材料，作为**唯一有效待办池（Single Source of Truth for Backlog）**。原文件均保留不删并已在文件头部注明迁移去向；`docs/archive/` 保持只读冻结契约不变。

---

## 一、 存量材料全量盘点与四态归类

扫描范围覆盖仓库内除源码（`src/`、`tests/`、`scripts/`）、构建产物（`dist/`、`package.zip`）与依赖缓存（`node_modules/`、`.git/`）外的全部存量文件，按内容归为 6 大类，逐份判定为 **有效、过期、重复、已落地未标记** 四态之一：

### 1.1 任务计划与待办账本类
| 文件路径 | 内容归类 | 四态判定 | 处置与去向说明 |
| :--- | :---: | :---: | :--- |
| `ROADMAP.md` | 产品总体路线 | **有效** | 保留在根目录作为方向基线，已同步更新基线至 `v0.48.85` 并指向本单一待办池。 |
| `BLOCKERS.md` | 环境与外部阻塞 | **有效** | 保留在根目录；记录 B-004（Android 真机）、B-005（桌面 200% 缩放/读屏人工会话）、B-007~B-011（外部服务/凭据前置）。 |
| `docs/dev-plan-2026-10-06.md` | 当期阶段执行账本 | **有效** | 保留并追加本轮 `T-7810～T-7814` 闭环记录；未完候补统一收口至本文第五节单一待办池。 |
| `docs/current-status-index.json` | 机器可读状态索引 | **有效** | 保留并由 `scripts/current-status-audit.cjs` 守护。 |
| `.tasks/TASK-20261030-fold-slicing.md` | 专项任务单 | **已落地未标记** | 纯模型已落地，UI 组装回调断链已并入本池 `T-7810` 闭环；原文件顶部已注明迁移去向。 |
| `.tasks/TASK-20261031-github-benchmark-fusion.md` | 专项任务单 | **已落地未标记** | 模型已合入 `697b0d50`，但留有回调未接、选区失焦丢失与样式缺失半成品，已并入 `T-7810～T-7812` 修复闭环；原文件顶部已注明迁移去向。 |
| `.zcode/plans/plan-sess_76e8d64d-27ca-497f-8991-a3c5152b095f.md` | 会话计划稿 | **已落地未标记** | T-7341 Action Palette DOM 装配计划，已于 v0.48.0 交付；原文件顶部已注明状态与去向。 |
| `.zcode/plans/plan-session_8876e9fa0d95a772b742d6b1ac55a133.md` | 会话计划稿 | **已落地未标记** | T-7565～T-7580 质量强化计划，已于 v0.48.83 交付；原文件顶部已注明状态与去向。 |
| `ECOSYSTEM-INTEGRATION-DIRECTIVE.md` | 生态统领任务单 | **已落地未标记** | 块属性命名空间、800ms 熔断、`plugin.json` 规范等 6 项均已落地并由 `tests/ecosystem-integration-directive.test.cjs` 锁死；顶部已注明状态。 |
| `docs/dev-plan-2026-09-17.md` ~ `2026-09-27.md`（5 份） | 历史阶段账本 | **过期** | T-6290～T-7123 历史批次记录，已被 `dev-plan-2026-10-06.md` 接替，保留供历史追溯。 |
| `docs/agent-development-backlog-final-2026-10-03.md` | 历史 47 卡账本 | **已落地未标记** | 已于 2026-10-04 完成对账并合入 T-7125～T-7168，不重复立项。 |
| `docs/handoff-2026-09-28.md` | 历史交接单 | **过期** | v0.41.0 交接清单，所列事项已全部交付销号。 |
| `docs/archive/{TODO,DECISIONS,PROGRESS,README}.md` | 冻结历史归档 | **过期（只读冻结）** | 受 `tests/root-doc-budget.test.cjs` 与 `AGENTS.md` 保护，严禁修改或追加。 |

### 1.2 UI 原型与视觉规范类（`docs/design/`）
- 详见 [`docs/design/archive/README.md`](./design/archive/README.md) 逐份登记表：
  - **有效基线（14 份）**：`store-redesign-2026-09-27.html`、`workbench-redesign-2026-09-27.html`、`platform-topbar-redesign-r5-2026-10-09.html`、`component-specs-01~09.html`（9 份）、`design-system-gallery-2026-09-27.html`、`ui-states-2026-09-27.html`、`skin-prototypes.html`。
  - **已落地未标记（3 份）**：`platform-ui-redesign-2026-09-26.html`、`platform-ui-redesign-r2-2026-09-26.html`、`platform-ui-redesign-r4-2026-10-03.html`（其中 R4 伴侣栏新增切片栈标签走样问题已于本轮 `T-7812` 修复）。
  - **过期归档（8 份）**：`refactor-a-clock.html`、`second-panel-compact-widget-prototype-2026-10-16.html`、`second-panel-micro-mosaic-prototype-2026-10-16.html`、`adaptive-glance-tiles-prototype-2026-10-16.html`、`cyber-tactile-glance-prototype-2026-10-17.html`、`platform-ui-masterpiece-2026-10-17.html`、`unified-platform-os-prototype-2026-10-17.html`、`widget-gallery-glance-prototype-2026-10-17.html`（已在文件头部注入归档说明注释并登记于 `docs/design/archive/README.md`）。

### 1.3 调研报告与架构决策类
- **`docs/adr/0001` ~ `0533`（540 份）**：**有效**（架构决策事实源）。
- **`docs/deep-research-panels-and-github-2026-10-21.md`**：**部分有效**（Wave 5/6/8 已落地，剩余 Wave 7 候补已迁入本文单一待办池 `T-7815～T-7817`，原文件已注明去向）。
- **`docs/research-cycle-r19-2026-10-20.md`**：**已落地未标记**（Wave 1~4 的 T-7349~T-7358 已全部交付，原文件已注明状态）。
- **`docs/research-cycle-r1` ~ `r18`、`docs/competitor-deep-research-2026-09-19.md`、`docs/research-tcotc-snippets-benchmark-and-fusion-2026-10-17.md`**：**已落地未标记 / 历史调研依据**（吸收项均已转化为具体任务交付）。
- **`docs/research-siyuan-ocr-2026-10-10.md`、`docs/research-common-phrases-2026-10-05.md`**：**有效（边界结论）**（明确 OCR 待上游稳定后评估、“小驴常用”作为独立插件不混入雷切）。

### 1.4 门禁、合规与用户文档类
- **`README.md`、`README.en-US.md`、`CHANGELOG.md`、`docs/CHANGELOG.md`、`docs/CHANGELOG.en-US.md`、`CONTRIBUTING.md`、`SECURITY.md`、`LICENSE`、`docs/gate-audit-checklist.md`、`docs/release-readiness.md`、`docs/storage-compatibility-matrix.md`、`docs/widget-protocol.md`、`docs/component-store-guide.md`、`docs/privacy-and-security.md`、`docs/faq-and-troubleshooting.md`**：**有效**（随本轮 `v0.48.85` 同步更新）。
- **根目录历史构建日志（`.codex-test.log`、`full-test.log`、`verify-*.log`、`jobs.json`、`runs.json`、`joblog.txt`）与 `.workbuddy/memory/2026-09-*.md`**：**过期（历史运行留痕）**（不删除已有文件，不纳入发布包 `package.zip`）。

---

## 二、 五大类代码缺陷排查与实测复现证据

本轮排查严格依据代码静态走查 + JSDOM / Chromium（Edge Headless CDP）真实执行取证，不写无复现步骤的“潜在风险”：

### 2.1 交互与数据类缺陷：实验室「连续切片暂存栈」组装导出与块定位回调悬空（假成功半成品）
- **位置**：`src/index.ts:4667-4670`、`src/snippet-studio-ui.js:1227-1244`、`src/snippet-stack-ui.js:353-360`
- **复现步骤**：
  1. 打开第三面板「代码片段实验室」，切换到右侧伴侣栏第 2 个标签「连续切片暂存栈」；
  2. 添加任意切片后，点击底栏「一键组装推入日报」（或「组装插入当前文档」「生成结构化新文档」「复制组装块」）；
  3. 观察网络请求与状态栏文字。
- **修复前实测表现**：
  - `index.ts` 只向 `mountSnippetStudio` 传入了 `stack: { load, save }`，未传入 `assemble` 与 `openBlock`；`snippet-studio-ui.js` 也未向 `mountSnippetStackView` 传入 `onAssemble` 与 `onOpenBlock`；
  - 实测 Chromium CDP 捕获 `fetchCallsMadeOnJournalAssemble: []`（**0 次 API 调用**），但状态栏直接回落显示 `"已组装 1 条片段（含 1 处血缘反链）"` 假成功回执；点击卡片下方的 `((blockId))` 血缘反链按钮完全无反应；
  - 此外，`index.ts:5896` 与 `doc-search-ui.ts:2262, 2272` 残余 3 处 `void navigator.clipboard.writeText(...)` 未等待 Promise 完成即弹出“已复制到剪贴板”，且 `assembleSnippetStackToDoc("copy")` 在无 `navigator.clipboard` 环境静默跳过却返回 `ok: true`。
- **修复方案与实测结果（`T-7810`）**：
  - 在 `index.ts`、`index.js` 与 `snippet-studio-ui.js` 完整打通 `stack.assemble`（透传用户选择的输出维度 `mode`）、`stack.openBlock`、`stack.captureSelection`、`stack.fetchGleanFoldTree`；
  - 全链路包裹 `try/catch`，新文档标题增加 `YYYY-MM-DD-HHmmss` 防重名冲突，全仓剪贴板调用统一改为 `.then/.catch` 真实回执；
  - **修复后 Chromium 实测**：点击「一键组装推入日报」真实发出 `["/api/filetree/createDailyNote", "/api/block/appendBlock"]` 请求并返回 `"已将 1 条切片结构化写入今日日记"`。

### 2.2 状态类缺陷：暂存栈异步操作无防连点互斥锁 + 正文选区在点击悬浮球/切换器时失焦丢失
- **位置**：`src/snippet-stack-ui.js:191, 292, 344`、`src/index.ts:6110-6168`
- **复现步骤**：
  1. **连点复现**：在暂存栈有切片时快速连点 3 次「一键组装推入日报」或「生成结构化新文档」，因异步请求在途无 `busy` 锁，触发 3 次并发写入；
  2. **选区丢失复现**：在思源编辑区（`.protyle-wysiwyg`）用鼠标拖选一段普通文本（未触发整块 `.protyle-wysiwyg--select`），随后点击悬浮球或按热键打开切换器呼出动作画板，点击「原子切片入栈」。
- **修复前实测表现**：
  - 连点 3 次触发 3 次重复请求；
  - 点击悬浮球或切换器输入框自动 `focus()` 后，浏览器原选区丢失或转移，且普通文字选区未顺着 `anchorNode.closest("[data-node-id]")` 查找段落块 ID，导致报错“未检测到活动选区”或丢失 `((blockId))` 反链。
- **修复方案与实测结果（`T-7810` / `T-7811`）**：
  - 在 `mountSnippetStackView` 引入 `asyncBusy` 互斥锁与根节点 `aria-busy="true"`，在途期间禁用异步按钮（单测实测连点 3 次仅执行 1 次）；
  - 在 `index.ts` 新增 `bindEditorSelectionObserver()` 监听 `selectionchange`（60ms 防抖，`onunload` 成对销毁），当选区在 `.protyle-wysiwyg` 内时实时缓存选区文本、顺着 `anchorNode.closest("[data-node-id]")` 提取的真实块 ID、根文档 ID 与文档标题（60s 有效窗），焦点进入插件 UI 时保留快照不覆盖。

### 2.3 交互与集成类缺陷：不可逆删除/清空无撤销（Undo）、多语言裸键名渲染、跨端入口断链
- **位置**：`src/snippet-stack-ui.js:223, 513`、`src/snippet-studio-ui.js:54-469, 1180`、`src/second-panel-ui.ts:825-829`
- **复现步骤与实测表现**：
  1. 在暂存栈点击「清空未锁定」或单卡「移除切片」，数据立即被覆盖持久化，无任何撤销途径；
  2. 打开片段实验室，右侧栏第 2 个标签按钮直接渲染英文裸键名 **`"snippetStackTitle"`**（因 `snippet-studio-ui.js` 的 `translations` 表漏登记 `snippetStack*` 键，`t("snippetStackTitle")` 返回非空原键名使 `|| "切片暂存栈"` 短路失效，且 `tests/i18n.test.cjs` 被塞入 12 个 `ALLOWED_UNUSED` 白名单掩盖未引用事实）；
  3. 从工作台顶栏点击「连续切片暂存栈」（携带 `objectKind: "stack"`），进入实验室后仍停留在默认 AI 页签（`stackHidden: true`）；在移动端或侧栏端工作台点击该按钮，因实验室仅支持桌面主窗口，无法打开暂存栈。
- **修复方案与实测结果（`T-7811` / `T-7812`）**：
  - 为单条移除与清空未锁定保存深拷贝快照 `lastUndoSnapshot`，状态栏动态显示「撤销（Undo）」按钮（`[data-stack-action="undo"]`），点击一键恢复原切片与顺序；
  - 补齐 `snippet-studio-ui.js` 的 `snippetStack*` 字典映射并从 `tests/i18n.test.cjs` 移除 12 项伪白名单；
  - `objectKind === "stack"` 时自动展开折叠栏并激活暂存栈页签；新增 `openSnippetStackDialog()` 独立弹窗回退，供移动端、侧栏端及禁用实验室的桌面端无损使用。

---

## 三、 核心功能完整链路验证结论

逐项验证“输入 → 处理 → 持久化 → 重载后仍在 → 异常后可恢复”全链路：

| 核心功能模块 | 链路结论 | 实测验证与恢复机制 |
| :--- | :---: | :--- |
| **1. 第一面板切换器、拼音/路径缩写与三层搜索** | **已实现且可用** | 本地页签 0ms 过滤，异步搜索代际校验防乱序；`sw_mru`/`sw_favorites`/`sw_pinned`/`sw_closed_history` 防抖落盘，重载后经 `runStorageMigration` 恢复；内核 API 异常时降级保留已开页签并展示错误状态。 |
| **2. 多模态穿透检索（`@/:`、`^`、`#`、`!`、`-`、`>`、`?`）** | **已实现且可用** | 参数化安全只读 SQL（单引号转义 + `LIMIT` 钳制），URL 协议头冒号消歧，点击已激活药丸二次反选重置，三阶梯 `Escape` 回退。 |
| **3. 次级动作画板（Action Palette `Ctrl+K` / `⌘K`）** | **已实现且可用** | 支持分屏打开、块链接/Markdown 复制（真实 Promise 捕获）、一键保存当前页签为文档集、导出大纲思维导图、撤销关闭页签、采集入切片栈。 |
| **4. 第二面板 Bento 小组件工作台与组件商店** | **已实现且可用** | 58 款组件定义完备，4 套场景预设、今日待办原地打勾写回、布局拖拽历史撤销/重做、`sw_home_state` 持久化；单组件 800ms 熔断隔离与单项重试、脱敏诊断导出。 |
| **5. 第三面板代码片段实验室与回收站/分组树** | **已实现且可用** | 原生 CSS/JS 片段管理、CSS 沙箱双栏预览、零依赖 CSS 格式化、`sw_snippet_recycle`（50 项/30 天/256KB）回收站自愈、`sw_snippet_groups` 分组树、JSON 三模式（Merge/Fork/Overwrite）导入。 |
| **6. 连续切片暂存栈与 TextFold 5 阶语义切片** | **已实现且可用**（本轮消伪闭环） | 32 槽位有界栈（置顶保护淘汰）、三态分片切换、`Alt+↑/↓` 调序、`F2` 行内微调、删除/清空一键撤销、`sw_settings.snippetStack` 持久化重载保留、四目标真实组装导出与 `((blockId))` 跳转。 |
| **7. 命名文档集（Document Sets）与配置包备份** | **已实现且可用** | 活动页签标记、3 版覆盖历史、4 路并发 5s 超时带 `AbortController` 预检、缺失项跳过、JSON 导入导出与 Markdown 恢复报告。 |
| **8. 全局悬浮球（FAB）与选区智能首推** | **已实现且可用**（本轮补齐选区快照） | 自由停放/边缘吸附、单击/双击/长按/四向快滑、1–9 固定槽、`.protyle-wysiwyg` 实时选区特征识别与首层动作动态置顶。 |
| **9. 实验室 JS 片段沙箱内实时执行预览** | **受平台安全限制无法实现** | **限制来源**：浏览器同源/窗口环境无法在不污染思源宿主 DOM 与全局监听器的前提下安全沙箱化执行任意思源插件级 JS 并支持无残留卸载（ADR 0078/0222）。**替代方案**：实验室提供 JS 语法/括号诊断与草稿保存，保存后通过思源原生片段开关启用并重载 UI 生效。 |
| **10. 思源标签面板打开后精确高亮指定子标签** | **受平台限制无法实现** | **限制来源**：思源公开插件 API 仅提供 `toggleModel("tag", true)` 打开标签 Dock，未暴露选中特定标签节点的公开参数（ADR 0196）。**替代方案**：在切换器内通过 `#标签名` 穿透检索直接列出该标签下的全部命中块并一键定位。 |

---

## 四、 界面审查发现与修复前后实测截图对比

本轮通过真实 Chromium（Edge Headless CDP）测量计算样式与几何尺寸，发现并修复以下 4 项具体界面问题（对比截图存放在 `.artifacts/audit-2026-10-31/`，最新全量验收截图已更新至 `acceptance-screenshots/`）：

1. **第二面板工作台顶栏 `.sw-home__stack-btn` 缺失胶囊样式与 SVG 固有尺寸（位置：`src/second-panel-ui.ts:820`、`src/styles/_11-ui-polish.scss:2508`）**
   - **修复前实测**：`<svg>` 未声明 `width/height` 且 `.sw-home__stack-btn` 无 SCSS 规则，在独立渲染环境下退化为 `borderRadius: "0px"`, `border: "2px outset rgb(0,0,0)"`，按钮尺寸膨胀至 **`409.3px × 161px`**（截图：`.artifacts/audit-2026-10-31/before-01-workbench-toolbar.png`）。
   - **修复后实测**：补齐 `width="14" height="14"` 固有属性并纳入 `.sw-home` 胶囊按钮规范，实测 `borderRadius: "999px"`, 尺寸 **`112px × 21px`**, `svgRect: 13px × 13px`，与相邻预设胶囊完全一致（截图：`.artifacts/audit-2026-10-31/after-01-workbench-toolbar.png`、`acceptance-screenshots/workbench-light.png`）。
2. **第三面板右侧伴侣栏 `.sw-studio__ai-nav` 与 `.sw-studio__tab-pill` 缺失样式且显示裸键名（位置：`src/snippet-studio-ui.js:1177`、`src/styles/_snippet-studio.scss:695`）**
   - **修复前实测**：两个切换标签渲染为 `borderRadius: "0px"`, `bg: "rgb(240,240,240)"`, `border: "2px outset rgb(0,0,0)"` 原生灰按钮，第 2 个按钮文本为 `"snippetStackTitle"`（截图：`.artifacts/audit-2026-10-31/before-02-studio-unstyled-pills.png`）。
   - **修复后实测**：升级为 Bento 分段胶囊（`borderRadius: "999px"`，激活项白卡浮起 + `--sw-shadow-xs` + 主题色高光），文本正确显示 `"连续切片暂存栈"`，伴侣栏折叠至 48px 时自动切换为 `writing-mode: vertical-rl` 竖排标题并隐藏 `.sw-studio__stack-container`（截图：`.artifacts/audit-2026-10-31/after-02-studio-bento-stack.png`）。
3. **第三面板 `.sw-studio__stack-container` 缺少弹性高度导致卡片列表受挤压（位置：`src/styles/_snippet-studio.scss:739`）**
   - **修复前实测**：`containerRect.height` 仅 `394px`，241px 窄栏内工具栏与底栏折行后卡片列表区不足 `150px`（截图：`.artifacts/audit-2026-10-31/before-03-studio-stack-geometry.png`）。
   - **修复后实测**：声明 `display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0;` 并优化 `.sw-snippet-stack--studio` 紧凑按钮高度，`containerRect.height` 扩展至 **`492px`**，列表区高度提升至 **`219.5px`**（截图：`.artifacts/audit-2026-10-31/after-02-studio-bento-stack.png`）。
4. **独立弹窗 `.sw-snippet-stack` 作用域令牌断链与 `:focus-visible` 补齐（位置：`src/styles/_snippet-studio.scss:1058`）**
   - 在 `.sw-snippet-stack` 根节点补齐 `--studio-accent` 等 7 个变量的 `--sw-platform-*` / `--b3-theme-*` 回退，并为全部 6 类交互控件补齐 `:focus-visible { box-shadow: var(--sw-focus-glow); }` 与 `prefers-reduced-motion: reduce` 减动效规则。

---

## 五、 单一待办池（Unified Backlog Pool）

优先级计算公式：**`优先级得分 = (影响面 × 频率) / 成本`**（影响面 1~5，频率 1~5，成本 1~5；同一根因合并为一条）。

| 编号 | 类型 | 标题与根因合并说明 | 影响面 | 频率 | 成本 | 依赖项 | 优先级得分与理由 | 状态 | 验收方式 |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| **T-7810** | 缺陷 | **连续切片暂存栈组装链路断链修复、防连点锁与全仓剪贴板异步消伪**：补齐 `stack.assemble` / `openBlock` 接线、维度参数透传、`aria-busy` 互斥锁、`try/catch` 异常捕获与全仓真实 Promise 剪贴板回执 | 5 | 5 | 2.0 | 无 | **12.5（P0）**：直接影响切片组装导出、块反链跳转与复制回执真实性 | ✅ 本轮完成 | 单测 + JSDOM/Chromium 实测点击四类组装、连点 3 次仅执行 1 次、抛错回执与反链跳转 |
| **T-7811** | 缺陷 | **编辑区选区实时快照、多语言裸键名修复与全端独立暂存栈弹窗回退**：新增 `.protyle-wysiwyg` 选区缓存与段落 `data-node-id` 提取、补齐 `snippetStack*` 字典映射并移除死键白名单、`objectKind="stack"` 自动激活与移动/侧栏独立弹窗 | 5 | 5 | 2.5 | T-7810 | **10.0（P0）**：解决点击悬浮球/动作画板选区丢失、界面裸键名与移动端不可达 | ✅ 本轮完成 | 选区失焦回退测试、双语渲染断言、移动端/侧栏独立弹窗挂载测试 |
| **T-7812** | 功能/体验 | **暂存栈缺失 Bento 样式补齐、折叠态适配、焦点环与删除/清空一键撤销（Undo）**：补齐 4 个缺失样式类、作用域令牌回退、`:focus-visible` 与 `lastUndoSnapshot` 一键恢复 | 4 | 4 | 2.0 | T-7810, T-7811 | **8.0（P1）**：消除原生灰按钮与 409×161px 裸 SVG，为不可逆删除提供即时撤销 | ✅ 本轮完成 | 块级 CSS 门禁（含外科式负向验证）、Chromium 计算样式实测、删除/清空后点击 Undo 恢复测试 |
| **T-7813** | 技术债 | **抽取统一代码版本常量 `PLUGIN_VERSION` 并收口全工程 28 处弹窗徽标**：消除 13 个文件散落硬编码版本号，对齐 `package.json`、`plugin.json`、`README` 与代码常量 | 4 | 3 | 1.5 | 无 | **8.0（P1）**：根治发版版本漂移与同构镜像漏改 | ✅ 本轮完成 | `tests/dialog-title-version-sync.test.cjs` 全工程扫描 + 注入错误版本负向验证 |
| **T-7814** | 体验 | **中英文 README 重构（首屏定位、安装方式、快捷键勘误、折叠日志）与最新界面截图重拍** | 4 | 4 | 2.0 | T-7812, T-7813 | **8.0（P1）**：消除默认快捷键与编辑器失实说明，更新 v0.48.85 实拍截图 | ✅ 本轮完成 | 文档对账契约测试、本地链接解析门禁、`shots:acceptance` 9 张截图生成校验 |
| **T-7116** | 体验 | **Android 真机安装升级、软键盘、屏幕旋转与边缘侧滑触控终验** | 4 | 3 | 4.0 | B-004（需 adb 与真机） | **3.0（P2 · 环境阻塞）**：本地 Chromium 触控夹具已通过，真机待设备连接后执行 | ⏸ Blocked (B-004) | 按 `docs/acceptance-runbook.md` 在 Android 真机实测 |
| **T-7144** | 体验 | **少量高价值小组件基于真人使用频率的二轮精修** | 3 | 3 | 4.0 | T-7168（真人频率反馈） | **2.25（P2 · 条件待命）**：8 个候选组件的工程边界已闭环，待真人反馈后选型 | ⏳ Deferred | 隔离宿主 E2E + 前后耗时/误点对比 |
| **T-7115** | 体验 | **真实思源桌面 200% 缩放、最窄原生侧栏人工观感与 NVDA 读屏终验** | 3 | 2 | 3.0 | B-005（人工会话） | **2.0（P2 · 环境后置）**：API 与 245px Dock 自动化 E2E 已完成，差人工读屏观感 | ⏸ Partial (B-005) | `pnpm run desktop:acceptance` + NVDA 实测记录 |
| **T-7815** | 功能 | **穿透检索超长结果集渐进虚拟化与 `notebook:` 复合前缀语法** | 3 | 2 | 3.0 | 无 | **2.0（P2 候补）**：当前首屏 12 条分页已将帧耗时控制在 <16ms，按需启动 | 📋 Pool | 1000+ 命中基准测试与复合语法单测 |
| **T-7816** | 功能 | **次级动作画板用户自定义动作置顶与显隐偏好设置** | 2 | 3 | 3.0 | 无 | **2.0（P2 候补）**：当前已有 MRU 最近 5 项前置与选区智能首推 | 📋 Pool | 设置页勾选持久化与画板过滤单测 |
| **T-7817** | 功能 | **命名文档集自定义项目标签分类与按标签筛选** | 2 | 2 | 2.5 | 无 | **1.6（P3 候补）**：低频增强项，排在核心修复之后 | 📋 Pool | 文档集模型归一化与设置页筛选测试 |
| **T-7117** | 集成 | **外部可选服务（ActivityWatch / Gist 真实写权限 / 社区远程目录 / 在线付费 AI）真机联调** | 3 | 2 | 4.0 | B-007~B-011 | **1.5（P3 · 外部阻塞）**：受外部服务/账号凭据及禁止远程操作底线约束 | ⏸ Blocked | 对应服务就绪后单项只读/受控联调 |
| **T-7119** | 功能 | **片段实验室完整 CodeMirror 6 编辑器接入评估** | 3 | 2 | 5.0 | ADR-0129（~669KiB 包体限制） | **1.2（P3 · 暂缓）**：当前轻量行号+括号诊断编辑器已满足需求且包体可控 | ⏳ Deferred | 包体预算与动态分包专项评审 |

---

## 六、 本轮批次（T-7810～T-7814）可复现验收步骤与实测回执

### 6.1 逐项验收步骤与执行结果
1. **T-7810 & T-7812（暂存栈组装、防连点锁、异常隔离、一键撤销与块级样式）**：
   - **复现验收命令**：`node --test tests/t7810-snippet-stack-and-version-closure.test.cjs tests/snippet-stack-ui-and-fold-slicing.test.cjs tests/snippet-stack-model.test.cjs`
   - **实测结果**：17/17 全部通过。验证了连点 3 次「推入日报」仅触发 1 次回调且 `aria-busy="true"`、维度选择 `key` 精确透传、异步抛错安全捕获并渲染 `data-state="error"`、单条移除与清空未锁定后点击 `[data-stack-action="undo"]` 100% 恢复原切片、携带 `objectKind="stack"` 自动激活暂存栈并渲染中文标题 `"连续切片暂存栈"`。
2. **T-7813（四处版本一致与 28 处弹窗标题栏常量收口）**：
   - **复现验收命令**：`node --test tests/dialog-title-version-sync.test.cjs tests/release-version-bump-contract.test.cjs`
   - **实测结果**：7/7 全部通过。验证 `package.json`、`plugin.json`、`README.md` / `README.en-US.md`、`src/constants.ts` / `src/constants.js` 的 `PLUGIN_VERSION` 均为 `0.48.85`，全工程 29 处 `mountPlatformDialogTitleWrap` 100% 消费 `PLUGIN_VERSION_BADGE`。
3. **外科式负向验证（Gate Audit Checklist 合规证明）**：
   - **注入探针 1**：将 `src/constants.js` 的 `PLUGIN_VERSION` 临时改为 `"0.48.84"`，运行 `tests/dialog-title-version-sync.test.cjs`，精确在 `constants.js PLUGIN_VERSION 必须与 package.json 一致` 断言 FAIL；还原后 PASS。
   - **注入探针 2**：将 `src/styles/_snippet-studio.scss` 中 `.sw-studio__tab-pill` 的 `border-radius` 临时注释，运行 `tests/t7810-snippet-stack-and-version-closure.test.cjs`，精确在 `.sw-studio__tab-pill 必须声明全圆角胶囊样式` 断言 FAIL（其余 5 项测试不波及）；还原后 PASS。
4. **T-7814（README 优化、最新截图重拍与全量发布门禁 `verify:release`）**：
   - **复现验收命令**：`pnpm run shots:acceptance && pnpm run readiness:snapshot && pnpm run verify:release`
   - **本地安装验证**：已将上一版 `v0.48.84` 安装包备份至 `.artifacts/rollback/v0.48.84-installed-package.zip`（676,434 B，SHA-256 `78c811be6dc12c5aa425e1eac62e02b0f6c080a13c3c7c5a701d3d267ae6ef45`）与 `.artifacts/rollback/v0.48.84-repo-package.zip`（699,158 B，SHA-256 `2d7e892ced6aa0e3dc59cb5f52ac824f6945b14e2d915c96418b1fd8c45a6ca1`），并将 `v0.48.85` 生产构建产物同步安装至本机思源插件目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch\`，核验 `plugin.json`、`index.js`、`index.css`、`dist/snippet-studio.js`、`i18n/zh-CN.json`、`i18n/en.json` 等全部条目完整且版本号为 `0.48.85`。
