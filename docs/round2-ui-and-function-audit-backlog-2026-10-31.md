# 小驴雷切（Lv Speed Switch）全表面 UI 审查与全入口功能实测待办清单（2026-10-31 第二轮纯排查）

- **排查日期**：2026-10-31
- **排查基线**：`v0.48.85`（commit `f03b89ee`）
- **排查原则**：本轮**只排查不开发**，源码、样式与测试零修改；结合 `ui-ux-pro-max` 设计智能准则、Chrome Headless 多倍率缩放（100% / 125% / 150% 及 245px / 375px 窄视口）真实渲染测量与全量一/二/三级入口代码走查生成本清单。
- **统计总览**：
  - **UI 审查共查出：9 条**（`UI-01` ～ `UI-09`）
  - **功能实现共查出：11 条**（`FN-01` ～ `FN-11`，其中 **9 条为可修复缺陷/半成品**，**2 条判定为受平台限制无法实现**）
  - **同根因合并去重后入池待办：14 条**（`B-01` ～ `B-14`，每条均包含可复现问题描述、解决方案、整数成本与风险说明）

---

## 一、 全界面一/二/三级功能入口盘点与五环链路验证总表

覆盖主界面、二级弹窗/抽屉、三级子菜单/配置窗共 **8 大域 118 项入口**，逐一核验「输入 → 处理 → 持久化 → 重载后仍在 → 异常后可恢复」五环链路：

| 域与层级 | 入口范围（含按钮/菜单/命令/快捷键/设置/拖拽/右键） | 判定结论 | 异常点与对应待办编号 |
| :--- | :--- | :---: | :--- |
| **1. 宿主全局入口（一级/二级）** | 顶栏统一按钮（左键切换器/右键四表面菜单）、右侧栏 Dock、移动端顶栏按钮、命令面板 8 条命令（`⌥⇧S`、`⌥⇧P` 等）、URL Scheme、面包屑按钮 | 已实现且可用 | `this.app` 未就绪时命令枚举存在空指针风险（见 `FN-04` / `B-02`） |
| **2. 平台统一外壳 Chrome（一级/二级）** | 表面切换分段控件、状态徽标、上下文面包屑、快速开始指南弹窗、设置弹窗、关闭按钮、跨表面统计指标栏（每面板 4 指标药丸） | 已实现且可用 | 顶栏按钮装饰性 `<svg>` 缺少 `aria-hidden="true"`（见 `UI-06` / `B-08`） |
| **3. 第一面板：切换器与穿透搜索（一/二/三级）** | 搜索框、清空钮、8 枚多模态穿透药丸（`全部/@/^/#/!/-/ >/?`）、筛选菜单 `swSearchFilter` 与路径三级子菜单 `swSearchPath`、保存搜索编辑弹窗、近期搜索胶囊、空态智能辅助栏、排序与分组下拉、收藏下拉与三级右键菜单/分组弹窗、最近记录下拉与三级菜单、卡片悬停 4 把手、卡片右键菜单 `swCardMenu`、次级动作画板 `Action Palette`（23 项动作）、34% 阅读预览窗格与预览内查找条 | 部分条目存在半成品/缺陷 | ① `>` 命令模式 `commonBridge.search` 异步返回无代际校验且列表项不可键盘聚焦/回车（`FN-06` / `B-13`）；<br>② 收藏分组三级弹窗 `openGroupDialog` / `openFavoriteGroupDialog` 缺品牌标题栏、缺 `Esc` 关闭与焦点封闭、420px 固定宽在手机端溢出（`UI-03` & `FN-07` / `B-05`）；<br>③ 穿透徽标硬编码色值（`UI-05` / `B-07`） |
| **4. 第二面板：工作台与 58 组件（一/二/三级）** | 顶栏（编辑布局 `Ctrl+B`、刷新全部、切片暂存栈、组件商店）、编辑横幅（场景预设 4 项、自动对齐、撤销/重做、恢复默认、清空全部确认弹窗、完成）、卡片拖拽/长按/拉伸/尺寸菜单、标题栏双击与 `F/C/M` 快捷键、右键菜单、健康监控弹窗、58 款小组件内部交互 | **9 个生态组件存在严重半成品** | ① **9 个生态桥接组件右侧数值完全未渲染、点击/打勾断链、写死“点击复制”无实现、异常伪装为 `ready`**（`FN-01`~`FN-03` / `B-01`）；<br>② 「自动对齐」未记入撤销历史且产出非法宽度 `w=6`（`FN-05` / `B-12`）；<br>③ 清空确认弹窗缺品牌标题栏与 FAB 避让（`B-05`） |
| **5. 组件商店与配置表单（二/三级）** | 商店搜索框、分类标签栏、来源/网络/可用性筛选 chips、密度/排序、批量多选底栏、右侧详情内联预览、独立预览三级弹窗、尺寸瓦片、添加/移除按钮、前置依赖指南三级弹窗 `openHomeWidgetGuide`、组件配置三级弹窗 `openHomeConfigForm` | 关键按钮缩放受阻 | ① 125%/150% 缩放下商店右侧详情「添加到工作台」主按钮被挤出可视区底部，需滚动才可见（`UI-02` / `B-04`）；<br>② `openHomeWidgetGuide` 缺品牌标题栏、焦点封闭与 `activeDialogs` 回收（`B-05`） |
| **6. 第三面板：代码片段实验室（一/二/三级）** | 数据菜单（备份导出、恢复及三级预览弹窗、撤销恢复）、目录树与分组管理（新建/重命名/折叠/删除/拖拽归组）、内置 76 片段商店抽屉、代码编辑器（行号/括号诊断/格式化/三模式导入弹窗/UserCSS 导出/保存与冲突弹窗/删除）、双栏沙箱预览、回收站抽屉、Gist 面板与恢复弹窗、AI 伴侣与 Diff 选择性接受、连续切片暂存栈 | 缩放截断与静默失败 | ① **125% 缩放（1024×640）下「保存」按钮掉至 `y=1247px` 被 `overflow:hidden` 裁切不可达，编辑器仅剩 54px 高**（`UI-01` / `B-03`）；<br>② 跨表面 `objectId` 未命中或反链块缺失时静默吞掉无提示（`FN-08` / `B-14`）；<br>③ TextFold 抽屉输入框缺可见标签（`UI-07` / `B-09`） |
| **7. 全局悬浮球与快捷动作（一/二/三级）** | 悬浮球拖拽/吸附/半隐、单击/双击/长按/四向快滑、首层 6 动作环（选区智能首推）、更多动作二级抽屉（搜索/数字键 `1~9`/右键固定槽绑定/开关）、快速捕获弹窗 `openQuickCapture`、模板选择器 `openTemplatePicker`、首次日记本弹窗 `promptForJournalNotebook` | 二级弹窗存在缺口 | ① 快速捕获弹窗双标题重复、输入框无圆角/内边距/焦点环、固定 288px 高裁切底部按钮（`UI-04` / `B-06`）；<br>② 模板选择器无初始焦点、无方向键/Esc 关闭、插入失败无提示（`B-05` & `B-14`）；<br>③ 首次日记本弹窗 `loadNotebooks` 无 `.catch` 且 `<select>` 无标签（`B-09` & `B-14`） |
| **8. 设置中心（10 标签页与三级弹窗）** | 全局设置搜索框与过滤 chips、外观、行为、面板、收藏、快捷动作、悬浮球预览舞台、文档集（含版本差异弹窗与恢复报告）、日记、移动端、存储（含配置包差异弹窗）、底部保存回执与撤销 | 空指针崩溃缺陷 | `this.app` 未定义时 `openSetting()` 在构建快捷动作页 `getPluginCommands()` 处抛出未捕获 `TypeError`，导致后 5 个标签页白屏中断（`FN-04` / `B-02`） |

---

## 二、 受平台限制无法实现的条目说明（共 2 条）

以下 2 条经源码与宿主边界核实，属于**受平台限制无法实现**，不列入开发修改队列，保留现有安全替代方案：

1. **`FN-10`：片段实验室预览沙箱内实时执行并无痕卸载任意 JS 片段**
   - **限制来源**：思源笔记运行于单窗口 Electron / WebView 同源上下文中，插件级 JS 片段往往直接操作 `window.siyuan`、挂载全局 `document` 监听器或启动定时器；Web 平台不存在可在同窗口执行宿主级副作用后再一键无痕回滚内存状态的机制（见 ADR 0078 / ADR 0222）。
   - **当前替代方案**：实验室在属性区明确展示安全能力说明，对 JS 片段提供语法括号诊断、AI 静态规则审查与草稿保存；用户保存至思源原生片段后，通过原生片段开关启用并重载 UI 生效。
2. **`FN-11`：工作台「标签」小组件点击后在思源原生标签侧栏树中精确高亮并展开目标子标签**
   - **限制来源**：思源公开插件 API 仅暴露 `dock.toggleModel("tag", true)` 用于展开标签 Dock 面板，未公开传入目标标签路径并驱动原生树节点选中的方法（见 ADR 0196）。
   - **当前替代方案**：点击标签组件条目可唤醒原生标签 Dock；若需直接查看并定位某标签下的笔记块，可在第一面板切换器中输入 `#标签名` 通过穿透检索直达对应块。

---

## 三、 UI 与功能排查合并去重待办池（共 14 条，按优先级降序）

### 优先级量化计算规则
- **计算公式**：`优先级得分 = (影响面 × 频率) / 成本`
- **影响面（1～5 整数）**：1=单一低频边角、2=单个次级弹窗、3=单个主面板局部、4=跨面板或多组件核心体验、5=主流程阻塞/崩溃/整类组件失效。
- **频率（1～5 整数）**：1=极少触发、2=低频配置、3=中频操作、4=高频日常使用、5=每次打开面板/使用组件必现。
- **成本（1～3 整数）**：1=小（局部几行至几十行修改，单文件或少量样式/属性补齐）、2=中（跨 2～4 个模块协同修改并更新契约测试）、3=大（涉及多组件数据结构或复杂响应式重构）。

---

### `B-01`【缺陷】工作台 9 个生态桥接小组件右侧数值未渲染、点击/打勾断链、占位假文案与异常伪装为 `ready`
- **合并来源**：`FN-01`、`FN-02`、`FN-03`（同一根因：`src/home-external-adapters.ts` 数据字段约定与 `src/home-view.js` 渲染/归一化契约错位）
- **问题描述（可复现）**：
  - **位置**：`src/home-external-adapters.ts:450-684`、`src/home-view.js:112-141, 770, 835`、`src/index.ts:9064-9135`
  - **操作步骤**：在第二面板工作台添加并查看 `checkin-daily-streaks`（每日习惯连击）、`exam-daily-summary`（备考今日概览）、`cards-due-summary`（闪卡待复习数）、`home-expiry-reminders`（家庭效期提醒）、`sireader-recent`（最近阅读）、`simedia-active`（正在播放）、`knowledge-funnel`（渐进知识蒸馏漏斗）、`common-quick-palette`（高频常用语）、`task-horizon-today`（今日任务视界）9 个小组件，尝试查看右侧数值、点击条目或勾选任务。
  - **当前表现**：
    1. `home-view.js:770` 规定仅 3 个时钟/引言组件渲染 `item.value`（其余组件将 `item.value` 视为隐藏的跳转块 ID，可见副文本须放在 `item.secondary`），而上述 9 个生态组件全部把数值（如 `"20 题"`、`"90%"`、`"12 张"`、`"45%"`、媒体标题）写在了 `item.value` 上，导致**界面上只显示左侧名称，右侧数值 100% 空白不显示**；
    2. `normalizeHomeViewResult`（`home-view.js:112`）清洗条目时丢弃了 `item.id`、`item.blockId`、`item.source`，导致 `task-horizon-today` 勾选复选框时因拿不到 `source` 和 `blockId` **100% 报错回滚**，点击任务行或 `sireader-recent` 书目行 **100% 无反应**；
    3. `knowledge-funnel` 第 3 行将 `"action:riffCard"` 写在 `item.command` 而 `handleHomeItemAction`（`index.ts:9127`）只检查 `item.value === "action:riffCard"`，点击无反应；且当外部插件未安装或抛错时静默 `catch {}` 显示 `0 篇/0 条/0 张` 假正常态；
    4. `common-quick-palette`（565 行）写死 `value: "点击复制"` 却无任何复制实现；`glean-later-list` 与 `contacts-upcoming` 条目无点击跳转；全部生态组件 `catch` 分支返回 `status: "ready"` 而非 `"error"`。
  - **期望表现**：9 个生态组件右侧数值通过 `secondary` 正常显示；点击书目、剪藏、任务、闪卡行能真实跳转或触发对应命令，点击常用语能真实复制内容到剪贴板，勾选 `task-horizon-today` 任务能真实调用 `setTaskStatus`；插件未安装时返回明确空/受阻说明，接口抛错时返回 `status: "error"` 供健康回执条统计与重试。
- **解决方案**：
  1. 在 `src/home-external-adapters.ts`（及 `.js` 镜像）中，将 9 个生态组件的展示型副文本统一放入 `secondary` 字段，将目标块 ID / 动作指令放入 `value`（或 `command`）；
  2. 在 `src/home-view.js` 的 `normalizeHomeViewResult` 中安全透传经清洗的 `id`、`blockId`、`source`；在 `src/index.ts` 的 `handleHomeItemAction` 中支持 `item.command === "action:riffCard"` 与常用语复制动作（如 `copy:` 前缀或桥接调用）；
  3. 将各生态组件 `catch` 分支的 `status: "ready"` 修正为 `status: "error"`，并在 `knowledge-funnel` 无任何可用桥接时给出明确提示。
- **成本**：**中（2）** —— 涉及 `home-external-adapters.ts/.js`、`home-view.js`、`index.ts/.js` 三处协同修改及对应契约测试更新。
- **风险**：部分既有测试（如 `tests/ecosystem-integration-directive.test.cjs` 或组件快照测试）可能断言了旧的 `item.value` 字段或 `status: "ready"`，修改时需同步核对相关测试断言。
- **优先级计算**：影响面 **5**（9 个核心生态小组件功能与数值展示失效）× 频率 **5**（每次打开工作台必现）÷ 成本 **2** = **`12.50`（P0 · 第一批首项）**。

---

### `B-02`【缺陷】`this.app` 未定义时 `getPluginCommands()` 空指针崩溃导致设置中心与命令搜索中断
- **合并来源**：`FN-04`
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:6642, 6679`、`src/index.js:5280, 5322, 5625, 13221`
  - **操作步骤**：在宿主早期生命周期、独立面板环境或 `this.app` 尚未注入 `plugins` 数组的场景下，调用 `openSetting()` 打开设置中心，或在切换器输入 `>` 进入命令模式，或加载工作台 `plugin-commands` 小组件。
  - **当前表现**：`getPluginCommands()` 第 6642 行直接执行 `(this.app as ...).plugins`（缺少 `this.app?.plugins` 可选链），Chrome 实测直接抛出未捕获异常 `TypeError: Cannot read properties of undefined (reading 'plugins')`，导致 `openSetting()` 在构建第 5 个标签页（`quickActions`）时崩溃中断，后续 `floatingBall`、`documentSets`、`journal`、`mobile`、`storage` 5 个标签页及设置搜索索引全部无法生成。
  - **期望表现**：当 `this.app` 或 `this.app.plugins` 为 `undefined`/`null` 时安全返回空数组 `[]`，设置中心全部 10 个标签页与命令模式均正常渲染不崩溃。
- **解决方案**：在 `src/index.ts:6642, 6679` 及 `src/index.js:5280, 5322, 5625, 13221` 等所有读取 `this.app.plugins` 的位置统一改为 `this.app?.plugins` 可选链访问，并补充空 `this.app` 下的 `openSetting()` 回归测试。
- **成本**：**小（1）** —— 仅需在 `index.ts` 与 `index.js` 的 6 处属性访问补齐可选链。
- **风险**：无副作用，纯防御性空指针加固。
- **优先级计算**：影响面 **5**（导致设置中心半数标签页与命令模式直接崩溃）× 频率 **4**（打开设置或命令模式即触发）÷ 成本 **1** = **`20.00`（P0 · 第一批最高优）**。

---

### `B-03`【体验/缺陷】片段实验室在 125% / 150% 系统缩放下编辑区被挤压至 54px 且「保存」主按钮被裁切不可达
- **合并来源**：`UI-01`
- **问题描述（可复现）**：
  - **位置**：`src/styles/_snippet-studio.scss:29, 170-179, 250-340`、`src/styles/_11-ui-polish.scss:1680-1760`
  - **操作步骤**：在常见笔记本屏幕（如 1280×800 开启 Windows 125% 系统缩放，等效 CSS 视口 `1024×640`；或 150% 缩放，等效视口 `853×533`）下打开第三面板「代码片段实验室」。
  - **当前表现**：
    1. 在 125% 缩放（`1024×640`）下，因视口宽度 `1024px > 960px` 未触发窄屏纵向滚动布局，`.sw-studio` 根容器 `overflow: hidden`，中栏 `.sw-studio__main` 上方双栏预览区占用了大部分高度，导致下方 `.sw-studio__editor` 代码编辑框高度被挤压至仅 **`54px`**（仅够显示 2 行代码），而左侧下排属性区底部的核心「保存（`snippetSave`）」按钮掉到 **`y = 1247px`**（超出 `640px` 视口底边 `607px`），且因外层 `overflow: hidden` 无滚动条，**用户完全看不到也点不到「保存」按钮**；
    2. 在 150% 缩放（`853×533`）下，单列流总高达 `1426px`，「保存」按钮位于 `y = 1416px`，需向下滚动近 3 个屏幕高度才能保存。
  - **期望表现**：在 125% 与 150% 系统缩放及短视口（高度 `<= 720px`）下，中栏预览区与编辑区合理分配比例（编辑区最小高度不少于 `140px`），中栏 `.sw-studio__main` 与属性区支持独立纵向滚动（`min-height: 0; overflow-y: auto`），且「保存」等核心主动作在编辑器工具栏或粘性底栏首屏直接可达。
- **解决方案**：
  1. 在 `src/styles/_snippet-studio.scss` 中为 `.sw-studio__main` 和 `.sw-studio__details` 增加 `min-height: 0; overflow-y: auto;` 独立滚动保护，防止被外层 `.sw-studio { overflow: hidden }` 死锁裁切；
  2. 增加短视口媒体查询 `@media (max-height: 720px)`：自动收紧 `.sw-studio__preview` 默认高度占比，保障 `.sw-studio__editor` 最小可用高度，并将 `.sw-studio__commands`（含「保存」按钮）设为 `position: sticky; bottom: 0` 粘性可见。
- **成本**：**小（1）** —— 仅涉及 `_snippet-studio.scss` 与 `_11-ui-polish.scss` 布局滚动及粘性底栏样式调整。
- **风险**：需注意 `_11-ui-polish.scss` 既有契约测试对 `.sw-studio` 选择器的断言，确保不破坏桌面大屏（1440×900）下的既有四栏比例。
- **优先级计算**：影响面 **4**（125%/150% 缩放下实验室无法正常写代码和点击保存）× 频率 **4**（Windows 笔记本 125%/150% 缩放极其普遍）÷ 成本 **1** = **`16.00`（P0 · 第一批）**。

---

### `B-04`【体验】组件商店在 125% / 150% 系统缩放下右侧详情窗格「添加到工作台」主按钮需滚动才可见
- **合并来源**：`UI-02`
- **问题描述（可复现）**：
  - **位置**：`src/home-store-ui.ts:520-615`、`src/styles/_08-home-store-cards.scss:350-460`
  - **操作步骤**：在 125%（等效 `1024×640`）或 150%（等效 `853×533`）系统缩放下打开「组件商店」，点击左侧任意组件查看右侧详情窗格 `.sw-home-store__detail`。
  - **当前表现**：Chrome 实测显示，右侧详情窗格从上往下依次渲染标题、实时内联预览框、尺寸选择瓦片、来源与前置条件卡片，最后才放置操作行 `.sw-home-store__actions`（「+ 添加到工作台」按钮）；在 125% 缩放下按钮底边超出详情容器底边 `181px`，150% 下超出 `334px`，每次添加组件都必须手动滚动右侧窗格到底部。
  - **期望表现**：主操作按钮「+ 添加到工作台 / 移除 / 配置」在详情窗格内始终首屏可见（固定在详情窗格底部 `position: sticky; bottom: 0` 或置于详情头部右侧）。
- **解决方案**：在 `src/styles/_08-home-store-cards.scss` 中将 `.sw-home-store__detail .sw-home-store__actions` 设置为 `position: sticky; bottom: 0; z-index: 2;` 并配半透明毛玻璃托底与上边框，使操作按钮在任何缩放倍率下始终常驻详情窗格底端可见。
- **成本**：**小（1）** —— 仅需在 `_08-home-store-cards.scss` 为 `.sw-home-store__actions` 增加粘性定位与背景托底样式。
- **风险**：需确认移动端商店底部 Sheet（`.sw-home-store__detail`）下粘性操作栏不会遮挡尺寸选择瓦片。
- **优先级计算**：影响面 **3**（组件商店核心添加动作）× 频率 **4**（125%/150% 缩放下每次挑选组件均触发）÷ 成本 **1** = **`12.00`（P0 · 第一批）**。

---

### `B-05`【缺陷/体验】8 个二级/三级弹窗缺失统一品牌标题栏、焦点封闭、FAB 避让、`onunload` 回收及窄屏防溢出
- **合并来源**：`UI-03`、`FN-07`
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:3011`（`openHomeWidgetGuide`）、`3167`（`openQuickCapture`）、`3497`（`promptForJournalNotebook`）、`6735`（`openTemplatePicker`）、`7635`（`openHostListDialog`）、`12026`（`openGroupDialog`）、`12074`（`openFavoriteGroupDialog`）、`src/second-panel-ui.ts:688`（`clearConfirmDialog`）
  - **操作步骤**：分别打开上述 8 个二级/三级弹窗，按 `Tab` 键循环焦点、按 `Escape` 键、观察标题栏与悬浮球位置，或在 375px 手机视口下打开收藏分组弹窗。
  - **当前表现**：
    1. 8 个弹窗均未调用 `mountPlatformDialogTitleWrap`，导致缺少统一品牌图标/版本徽标、缺少 `role="dialog"` / `aria-modal="true"` 与 `trapDialogFocus`（按 `Tab` 键焦点直接穿透到背景页面）；
    2. 其中 6 个弹窗未调用 `this.suspendFABForDialog()` 且未登记入 `this.activeDialogs`（弹窗打开时悬浮球遮挡弹窗，插件卸载时残留孤儿 DOM）；
    3. `openGroupDialog`（12042 行）与 `openFavoriteGroupDialog`（12087 行）硬编码 `width: "420px"`，在 375px 手机屏幕上横向溢出视口 45px，且缺少 `Escape` 关闭与关闭后焦点恢复；
    4. `openTemplatePicker`（6735 行）与 `openHostListDialog`（7635 行）打开后无初始焦点、无上下方向键导航与 `Escape` 关闭；
    5. `openQuickCapture`（3189 行）在宿主 Dialog 标题栏下方又重复渲染了一行内部 `.sw-quick-capture__header` 标题“快速记录”。
  - **期望表现**：全工程所有二级/三级 Dialog 100% 统一挂载 `mountPlatformDialogTitleWrap` 与 `mountPlatformDialogCloseHint`，具备焦点封闭、`Escape` 退出、关闭后焦点回归、`suspendFABForDialog()` 避让、`activeDialogs` 卸载回收，且宽度统一使用 `min(420px, 92vw)` 防止窄屏溢出。
- **解决方案**：
  1. 为上述 8 个弹窗补齐 `mountPlatformDialogTitleWrap(..., PLUGIN_VERSION_BADGE, ...)`、`mountPlatformDialogCloseHint`、`this.suspendFABForDialog()` 与 `this.activeDialogs` 注册/销毁移除；
  2. 将 `openGroupDialog`、`openFavoriteGroupDialog`、`clearConfirmDialog` 的固定像素宽度改为 `min(420px, 92vw)` / `min(360px, 92vw)`；
  3. 为 `openGroupDialog`、`openFavoriteGroupDialog`、`openTemplatePicker`、`openHostListDialog` 补齐初始焦点、方向键/Escape 监听与 `opener?.focus()` 恢复；简化 `openQuickCapture` 内部重复标题文本。
- **成本**：**中（2）** —— 涉及 `src/index.ts`、`src/second-panel-ui.ts`（及 `.js` 镜像）中 8 处弹窗的标准化装配与契约测试更新。
- **风险**：需注意 `tests/t7001-settings-fields-contract.test.cjs` 与 `tests/surface-close-contract.test.cjs` 对 `.sw-quick-capture__close` 按钮的既有选择器断言，保留关闭按钮类名钩子不变。
- **优先级计算**：影响面 **4**（覆盖 8 个二级/三级弹窗的视觉、无障碍与生命周期）× 频率 **4**（常用二级交互）÷ 成本 **2** = **`8.00`（P1 · 第二批）**。

---

### `B-12`【缺陷】工作台「自动对齐」按钮未记入撤销历史、产出非法网格宽度 `w=6` 且仅识别单一组件形态
- **合并来源**：`FN-05`
- **问题描述（可复现）**：
  - **位置**：`src/second-panel-ui.ts:870-900`、`src/second-panel-ui.js:850-880`
  - **操作步骤**：进入第二面板工作台编辑模式（`Ctrl+B`），点击编辑横幅上的「📐 自动对齐」按钮，随后尝试点击横幅上的「撤销」按钮，或打开任意组件的尺寸切换菜单查看当前勾选项。
  - **当前表现**：
    1. 点击「自动对齐」前后未调用 `prepareLayoutMutation()` 与 `commitLayoutMutation(state)`，导致此次批量改写不会进入 `layoutHistory` 栈，用户无法撤销恢复原有布局；
    2. 代码将普通组件宽度硬设为 `entry.w = 6` 且未更新 `entry.size`，而 `HOME_WIDGET_SIZES`（`src/constants.ts:222`）定义的 7 档合法宽度只有 `2 / 4 / 8 / 12`（无 `w=6`），导致组件尺寸状态与 7 档规格脱节；
    3. 仅用 `entry.instanceId?.includes("calendar")` 识别全幅组件（新建实例的 `instanceId` 未必含模块名，且忽略了 `checkin-year-heatmap`、`database-table`、`database-board` 等宽幅组件）。
  - **期望表现**：点击「自动对齐」前记录布局快照并推入 `layoutHistory`，支持一键「撤销 / 重做」；对齐时结合 `state.instances` 解析真实 `moduleId` 与组件支持的合法 7 档尺寸（如 3 列并排 `small/medium` `w=4`、双宽 `wide` `w=8`、全幅 `full` `w=12`）并同步更新 `entry.size`。
- **解决方案**：
  1. 在 `autoAlignButton` 点击回调开头调用 `prepareLayoutMutation()`，保存后调用 `commitLayoutMutation(state)`；
  2. 通过 `state.instances` 查找每个布局项的真实 `moduleId`，按 `resolveHomeTileDefaultSize(moduleId)` 或 12 列整除规则（`w=4` 三拼 / `w=8 + w=4` 组合 / `w=12` 全幅）分配合法的 `size`、`w`、`h`。
- **成本**：**小（1）** —— 逻辑集中在 `second-panel-ui.ts/.js` 的 30 行内。
- **风险**：需检查是否有测试断言了旧的 `entry.w = 6` 数值。
- **优先级计算**：影响面 **3**（工作台编辑态布局对齐与撤销能力）× 频率 **3**（编排工作台时使用）÷ 成本 **1** = **`9.00`（P1 · 第二批）**。

---

### `B-13`【缺陷】切换器 `>` 命令模式异步常用语搜索无代际防乱序守卫且结果项无法用键盘选中激活
- **合并来源**：`FN-06`
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:5880-5905`、`src/index.js:4745-4770`
  - **操作步骤**：在切换器搜索框输入 `>关键词` 触发 `commonBridge.search(q)`，快速连续修改输入词或删掉 `>` 切回普通搜索，或用键盘上下方向键尝试选中“小驴常用”分组下的结果项。
  - **当前表现**：
    1. `commonBridge.search(q).then(...)` 返回时仅检查了 `box.isConnected`，未核对当前搜索框的值是否仍为 `>${q}`，导致慢响应返回时会把过期结果重复追加到当前列表中；
    2. 渲染出的 `.sw__command-item` 是普通 `<div>`，未设置 `tabIndex = 0`、未设置 `role="option"`、未绑定 `keydown` 的 `Enter` / `ArrowUp` / `ArrowDown`，纯键盘用户完全无法聚焦或触发常用语复制；且硬编码了中文 `"小驴常用"` 与 `"常用语"`。
  - **期望表现**：异步返回时严格校验当前搜索框值仍匹配发起请求时的命令查询且移除旧的 `.sw__command-group--common` 防重复；条目采用 `<button type="button" class="sw__command-item b3-list-item">` 或补齐 `tabIndex = 0` 与键盘方向键/Enter 事件流，文案接入双语 `i18n`。
- **解决方案**：在发起 `commonBridge.search(q)` 前记录当前输入框快照，回调中校验 `searchInput?.value.trim() === rawQuery` 并先清理已有 `.sw__command-group--common`；将 `itemEl` 改为可聚焦元素并接入命令列表的上下方向键与 `Enter` 激活链。
- **成本**：**小（1）** —— 仅涉及 `src/index.ts:5880-5905`（及 `index.js`）约 25 行代码。
- **风险**：无外部依赖风险。
- **优先级计算**：影响面 **3**（切换器命令模式键盘流与状态正确性）× 频率 **3**（命令检索场景）÷ 成本 **1** = **`9.00`（P1 · 第二批）**。

---

### `B-06`【体验】快速捕获弹窗输入框样式缺失、固定高度 288px 裁切底部按钮及跨面板搜索框尺寸不统一
- **合并来源**：`UI-04`
- **问题描述（可复现）**：
  - **位置**：`src/styles/_08-home-store-cards.scss:12-65`、`src/index.ts:3170-3173`、`src/styles/_02-settings.scss`
  - **操作步骤**：打开「快速记录（`openQuickCapture`）」弹窗观察输入框外观并向下拉高 `textarea`，同时对比切换器（38px 高）、设置页（30px 高）、组件商店（32px 高）的搜索框外观。
  - **当前表现**：
    1. Chrome 实测 `.sw-quick-capture__input` 计算样式为 `borderRadius: "0px"`, `padding: "2px"`, `border: "1px solid rgb(118,118,118)"`，无圆角、无舒适内边距、聚焦无 `--sw-focus-glow` 光环；且弹窗高度硬编码为 `288px`，一旦输入多行或拉高 `textarea`（`resize: vertical`），底部的「保存」按钮与键位提示立即被裁切在弹窗外；
    2. 各面板主搜索框高度（30px / 32px / 38px）与圆角（8px / 10px）未对齐统一控件令牌 `--sw-radius-control`（10px）与标准搜索框高度（34px～36px）。
  - **期望表现**：`.sw-quick-capture__input` 具备统一的 10px 圆角、`8px 10px` 内边距、白卡浮起底色与 `:focus` 发光微环，弹窗采用自适应高度（`min-height: 288px; max-height: 80vh`）避免裁切底部按钮；跨面板搜索框统一圆角与内边距规范。
- **解决方案**：在 `src/styles/_08-home-store-cards.scss` 中补齐 `.sw-quick-capture__input` 的 Bento 输入框样式并限制 `max-height: 160px`，在 `src/index.ts:3173` 移除死锁的 `288px` 固定高度或允许内容区弹性自适应；统一设置页搜索框圆角至 `var(--sw-radius-control, 10px)`。
- **成本**：**小（1）** —— 局部 SCSS 与 Dialog 参数调整。
- **风险**：需保持既有快速捕获契约测试 `tests/t7001-settings-fields-contract.test.cjs` 通过。
- **优先级计算**：影响面 **3**（快速捕获弹窗与跨面板搜索框一致性）× 频率 **3**（中高频输入入口）÷ 成本 **1** = **`9.00`（P1 · 第二批）**。

---

### `B-14`【缺陷】首次日记本弹窗加载失败无恢复、模板插入失败及反链/片段定位未命中时静默吞掉无提示
- **合并来源**：`FN-08`、`FN-09`
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:3511-3514, 6758-6761`、`src/snippet-stack-ui.js:770`、`src/snippet-studio-ui.js:4135-4142`
  - **操作步骤**：
    1. 未配置默认日记本时点击「日记」弹出选择框，若内核 `/api/notebook/lsNotebooks` 超时或报错，观察下拉框状态；
    2. 在「插入模板」弹窗点击某模板，若 `/api/template/render` 返回错误，观察界面反馈；
    3. 在切片暂存栈点击已删除块的 `((blockId))` 反链，或从工作台点击已删除的代码片段 chip 进入实验室。
  - **当前表现**：
    1. `promptForJournalNotebook` 中 `this.loadNotebooks().then(...)` 无 `.catch()` 分支，失败时下拉框永远卡在禁用态“加载中…”且无重试入口；
    2. `openTemplatePicker` 中 `insertHostTemplate` 返回 `false` 时仅恢复按钮可点，不弹任何错误提示；
    3. 暂存栈 `onOpenBlock` 返回 `false` 或抛错被 `.catch(() => {})` 吞掉，实验室 `objectId` 未找到目标片段时静默忽略，用户点击后毫无反馈。
  - **期望表现**：上述 4 处失败路径均给出明确的用户可感知错误状态或 `showMessage` / `setStatus` 提示，日记本加载失败时提供重试或错误文案。
- **解决方案**：为 `promptForJournalNotebook` 增加 `.catch()` 与失败状态选项/重试；在 `insertHostTemplate` 失败时调用 `showMessage(..., "error")`；在暂存栈 `onOpenBlock` 返回 `false` 及实验室 `objectId` 未命中时调用 `setStatus(..., "error")`。
- **成本**：**小（1）** —— 4 处错误处理分支补齐，每处 5～10 行代码。
- **风险**：无兼容风险。
- **优先级计算**：影响面 **3**（4 条用户操作路径的异常可恢复性）× 频率 **2**（异常/边界场景触发）÷ 成本 **1** = **`6.00`（P1 · 第二批）**。

---

### `B-07`【技术债/体验】穿透检索徽标与工作台来源健康胶囊硬编码十六进制颜色，深色模式下对比度不足 4.5:1
- **合并来源**：`UI-05`
- **问题描述（可复现）**：
  - **位置**：`src/styles/_11-ui-polish.scss:1289-1311`、`src/styles/_06-widgets-store.scss:454, 615-632`、`src/styles/_12-r54-surface-adapter.scss:584`
  - **操作步骤**：切换至深色主题（Dark Mode），在第一面板输入 `:标题` 或 `^正文` 查看结果行右侧的 `.sw__doc-source.is-heading` / `.is-block` 胶囊，或在工作台查看 `.sw__home-source-health` 胶囊。
  - **当前表现**：
    1. `.sw__doc-source.is-heading` 硬编码 `#7c68d5`，`.is-block` 硬编码 `#3575f0`；在深色表面 `#2a2a2a` 上，`#3575f0` 10px 小字对比度仅 `3.6:1`（未达 WCAG AA 4.5:1 标准）；
    2. `.sw__home-source-health.is-fresh / .is-cached / .is-stale` 硬编码 `#3b9861`、`#2f8150`、`#4f79bd`、`#3f68a9`、`#d58932`、`#aa6418` 及字面量阴影 `0 2px 6px rgba(0,0,0,0.08)`，未复用 `--sw-color-accent`、`--sw-color-data`、`--sw-platform-warning` 与 `--sw-shadow-xs` 令牌。
  - **期望表现**：全部替换为语义令牌与 `color-mix(..., var(--b3-theme-on-background))` 亮暗自适应派生色，确保浅色与深色模式下文本对比度均 `>= 4.5:1`。
- **解决方案**：将 `_11-ui-polish.scss:1289-1311` 与 `_06-widgets-store.scss:454, 615-632` 中的硬编码色值迁移至 `--sw-color-accent`、`--sw-color-data`、`--sw-platform-success/warning` 与 `--sw-shadow-xs`。
- **成本**：**小（1）** —— 纯 SCSS 令牌替换。
- **风险**：需运行 `tests/chromium-style-smoke.cjs` 确认深浅色对比度采样全部通过。
- **优先级计算**：影响面 **3**（搜索结果与组件商店/工作台徽标可读性）× 频率 **3**（深色模式常用表面）÷ 成本 **2**（需兼顾多主题对比度校验） = **`4.50`（P2 · 第三批）**。

---

### `B-08`【体验】按钮文案混用彩色 Emoji 充当图标，且 60+ 处装饰性 `<svg>` 缺少 `aria-hidden="true"` 与固有尺寸兜底
- **合并来源**：`UI-06`
- **问题描述（可复现）**：
  - **位置**：`src/second-panel-ui.ts:651, 683, 771, 845, 873`、`src/home-external-adapters.ts:459, 643-645, 665`、`src/action-palette-ui.js:135`、`src/index.ts:806, 817, 842, 4808-4854`、`src/settings-sections.ts:822, 906, 955, 1111, 1137, 2879`
  - **操作步骤**：打开工作台编辑模式查看「📐 自动对齐」按钮，或使用读屏软件（NVDA / VoiceOver）遍历切换器顶栏按钮、工作台工具栏按钮、动作画板列表项与设置页图标按钮。
  - **当前表现**：
    1. 「自动对齐」按钮及部分生态组件行标签直接使用彩色 Emoji（`📐`、`📚`、`✂️`、`🎴`）充当结构性图标，在不同系统字体下渲染不一且无法随主题着色；
    2. 全仓 60+ 处位于可见按钮文本旁或拥有 `aria-label` 的按钮内部的装饰性 `<svg>` 未声明 `aria-hidden="true"`，导致读屏器重复播报未命名图形；且 `second-panel-ui.ts:651, 683, 771, 845` 等处的 `<svg>` 缺少 `width="14" height="14"` 固有尺寸属性兜底。
  - **期望表现**：所有结构性操作按钮统一使用 `<svg width="14" height="14" aria-hidden="true"><use xlink:href="#icon..."/></svg>` 矢量图标，清除按钮文案中的装饰性 Emoji；全仓装饰性 `<svg>` 100% 携带 `aria-hidden="true"`。
- **解决方案**：将 `homeAutoAlign` 按钮改为 `<svg width="14" height="14" aria-hidden="true"><use xlink:href="#iconLayout"/></svg>` 加纯文本标签；批量为 `index.ts`、`second-panel-ui.ts`、`mobile-switcher-ui.ts`、`settings-sections.ts`、`action-palette-ui.js` 中的装饰性 `<svg>` 补齐 `aria-hidden="true"` 与固有宽高属性。
- **成本**：**中（2）** —— 涉及多文件 SVG 模板字符串的批量规范化与双语文案同步。
- **风险**：需检查是否有契约测试用精确字符串匹配了 `"📐 自动对齐"` 或特定 `innerHTML` 片段。
- **优先级计算**：影响面 **3**（全平台视觉专业度与读屏无障碍）× 频率 **3**（全表面常驻控件）÷ 成本 **2** = **`4.50`（P2 · 第三批）**。

---

### `B-09`【体验】二级/三级抽屉与弹窗中的多处表单输入控件缺少可见 `<label>`，且收藏分组 `<datalist>` 存在重复 DOM ID
- **合并来源**：`UI-07`
- **问题描述（可复现）**：
  - **位置**：`src/snippet-stack-ui.js:240-260`、`src/index.ts:3533, 12032-12033, 12077-12078`
  - **操作步骤**：
    1. 在切片暂存栈展开「TextFold 语义切片」导入抽屉，在输入文字后观察 3 个输入框；
    2. 打开首次选择默认日记本弹窗 `promptForJournalNotebook`，用读屏器聚焦 `<select>`；
    3. 打开收藏分组弹窗 `openGroupDialog` 或 `openFavoriteGroupDialog`。
  - **当前表现**：
    1. TextFold 导入抽屉的 `foldTextarea`、`foldBlockInput`、`foldGleanInput` 仅设置了 `placeholder` 而无可见 `<label>`，一旦填入内容后用户便无法分辨两个单行输入框分别代表“默认来源块 ID”还是“关联拾遗 ID”；
    2. `createJournalSelect`（`src/index.ts:3533`）创建的 `<select>` 既无 `<label>` 也无 `aria-label`；
    3. `openGroupDialog` 与 `openFavoriteGroupDialog` 均硬编码了 `<datalist id="sw__group-list">`，且输入框仅有 `placeholder` 无可见 `<label>`。
  - **期望表现**：表单输入控件配備清晰紧凑的可见 `<label>`（或字段标题）及 `aria-label`，确保输入内容后字段含义依然一目了然；动态生成的 `<datalist>` 使用唯一 ID。
- **解决方案**：为 TextFold 导入抽屉的元字段增加紧凑 `<label>` 包装，为 `createJournalSelect` 补齐 `sel.setAttribute("aria-label", this.i18n.journalChoose)`，为收藏分组弹窗补齐可见 `<label>`。
- **成本**：**小（1）** —— 3 处局部 DOM 结构补充。
- **风险**：无副作用。
- **优先级计算**：影响面 **2**（3 个次级表单的易用性与无障碍）× 频率 **2**（低中频表单操作）÷ 成本 **1** = **`4.00`（P2 · 第三批）**。

---

### `B-10`【体验】模板选择器列表项与命令模式分组折叠标题缺少完整的九态交互反馈（加载态、`aria-expanded`、`:focus-visible`）
- **合并来源**：`UI-08`
- **问题描述（可复现）**：
  - **位置**：`src/index.ts:5910-5928, 6750-6764`、`src/styles/_03-switcher-mobile.scss`
  - **操作步骤**：
    1. 在切换器输入 `>` 进入命令模式，用 `Tab` 键聚焦分组标题 `.sw__command-group-toggle` 或点击折叠；
    2. 打开「插入模板」弹窗 `.sw-template-picker`，用键盘聚焦或点击某个模板项。
  - **当前表现**：
    1. `.sw__command-group-toggle` 设置了 `role="button"` 和 `tabIndex = 0`，但折叠/展开时未更新 `aria-expanded="true|false"`，且未添加旋转箭头指示与明显的 `:focus-visible` 焦点环；
    2. `.sw-template-picker__item` 点击异步渲染模板期间仅设置 `button.disabled = true`，未设置 `aria-busy="true"` 与加载态视觉样式，且缺少 `:active` 微缩放与 `:focus-visible` 发光环。
  - **期望表现**：`.sw__command-group-toggle` 同步维护 `aria-expanded` 与折叠指示；`.sw-template-picker__item` 补齐悬停、按下、聚焦、`aria-busy` 加载态与禁用态样式。
- **解决方案**：在 `src/index.ts:5917` 的 `applyCollapsed` 中同步设置 `heading.setAttribute("aria-expanded", String(!collapsed))`；在 `6757` 行点击模板时设置 `button.setAttribute("aria-busy", "true")` 并在 SCSS 中补齐 `:focus-visible` 与 `:active` 规则。
- **成本**：**小（1）** —— 约 15 行属性与样式补齐。
- **风险**：无风险。
- **优先级计算**：影响面 **2**（次级列表与折叠头状态完整性）× 频率 **2**（命令与模板场景）÷ 成本 **1** = **`4.00`（P2 · 第三批）**。

---

### `B-11`【技术债】移动端排序遮罩与实验室预览探针残留内联 `z-index: 2147483647` 与内联边距样式
- **合并来源**：`UI-09`
- **问题描述（可复现）**：
  - **位置**：`src/mobile-switcher-ui.ts:427-429`、`src/mobile-switcher-ui.js:409-411`、`src/snippet-studio-preview.js:313`
  - **操作步骤**：在移动端切换器点击「排序」按钮打开 `.sw__sort-overlay`，检查 DOM 节点的 `style` 属性。
  - **当前表现**：`mobile-switcher-ui.ts:429` 直接在 JS 中写死 `overlay.style.zIndex = "2147483647"`（最大 32 位整数），脱离了 `_00-tokens.scss` 的层级令牌体系；`snippet-studio-preview.js:313` 使用了内联 `style="margin:20px 0 16px;border-top:1px dashed var(--b3-border-color);padding-top:12px"`（含非刻度间距 `20px`）。
  - **期望表现**：移除 JS 内联层级与非刻度间距，收敛至 SCSS 规则与标准层级/间距令牌（如 `--sw-space-xl: 16px` / `--sw-space-2xl: 24px`）。
- **解决方案**：将 `.sw__sort-overlay` 的 `position: fixed; inset: 0; z-index` 移入 `_03-switcher-mobile.scss`；将预览探针分隔线样式移入预览沙箱样式表并改用 `16px / 24px` 标准间距刻度。
- **成本**：**小（1）** —— 2 处内联样式外迁。
- **风险**：需确认 `tests/mobile-sort-modal.test.cjs` 是否直接断言了 `overlay.style.zIndex`。
- **优先级计算**：影响面 **2**（样式令牌规范度）× 频率 **1**（内部实现整洁度）÷ 成本 **1** = **`2.00`（P2 · 第三批）**。

---

## 四、 后续开发轮次分批执行建议（可直接按批取用）

每批控制在 **4～5 项**（单轮开发+完备测试+负向验证可稳妥收口的体量），遵循**“先修崩溃与功能半成品 → 再修缩放截断与跨端弹窗闭环 → 最后清偿令牌与无障碍技术债”**的顺序：

### 第一批（P0 必做 · 崩溃消除、生态组件半成品消伪与 125%/150% 缩放核心按钮可达，共 4 项）
1. **`B-02`（优先级 20.00 · 成本小）**：修复 `getPluginCommands()` 等 6 处 `this.app?.plugins` 空指针崩溃，保障 `openSetting()` 全部 10 个标签页与命令模式在任何宿主时序下 100% 稳定。
2. **`B-03`（优先级 16.00 · 成本小）**：修复片段实验室在 125% / 150% 系统缩放下编辑区被压至 54px 及「保存」主按钮被 `overflow: hidden` 裁切不可见的问题，补齐独立滚动与粘性操作栏。
3. **`B-01`（优先级 12.50 · 成本中）**：全面修复工作台 9 个生态桥接小组件的右侧数值隐藏（`value` $\rightarrow$ `secondary`）、`normalizeHomeViewResult` 字段剥离导致的 `task-horizon-today` 打勾报错与书目/剪藏点击不跳转、`knowledge-funnel` 第 3 行命令断链、`common-quick-palette` 点击复制实装，以及 `catch` 分支错误状态如实上报。
4. **`B-04`（优先级 12.00 · 成本小）**：将组件商店右侧详情窗格的「+ 添加到工作台」主操作栏设为 `position: sticky; bottom: 0` 常驻可见，消除 125%/150% 缩放下的必滚痛点。

### 第二批（P1 重点 · 工作台对齐撤销、命令模式竞态与 8 个二/三级弹窗规范化，共 5 项）
1. **`B-12`（优先级 9.00 · 成本小）**：修复工作台「自动对齐」按钮未写入 `layoutHistory` 无法撤销及产出非法宽度 `w=6` 的问题。
2. **`B-13`（优先级 9.00 · 成本小）**：为切换器 `>` 命令模式异步常用语搜索补齐代际/查询词核对、防重复挂载及完整键盘焦点/方向键/Enter 激活支持。
3. **`B-06`（优先级 9.00 · 成本小）**：补齐快速捕获弹窗 `.sw-quick-capture__input` 的 Bento 圆角/内边距/发光焦点环样式，解除 `288px` 死锁高度，并对齐跨面板搜索框尺寸规范。
4. **`B-05`（优先级 8.00 · 成本中）**：为剩余 8 个二级/三级弹窗统一补齐 `mountPlatformDialogTitleWrap`、焦点封闭 `trapDialogFocus`、`Escape` 关闭、焦点回归、`suspendFABForDialog()`、`activeDialogs` 回收及 `92vw` 窄屏防溢出保护。
5. **`B-14`（优先级 6.00 · 成本小）**：补齐首次日记本弹窗加载失败重试、模板插入失败提示、暂存栈反链与实验室 `objectId` 未命中时的明确用户反馈。

### 第三批（P2 收口 · 色彩令牌、Emoji 矢量替换、表单可见标签与九态细节打磨，共 5 项）
1. **`B-07`（优先级 4.50 · 成本中）**：将穿透检索徽标与工作台来源健康胶囊中的硬编码色值迁移至统一语义令牌，确保深色模式对比度 `>= 4.5:1`。
2. **`B-08`（优先级 4.50 · 成本中）**：将按钮中的彩色 Emoji 替换为标准 SVG 矢量图标，并为全仓 60+ 处装饰性 `<svg>` 补齐 `aria-hidden="true"` 与固有尺寸兜底。
3. **`B-09`（优先级 4.00 · 成本小）**：为 TextFold 导入抽屉、日记本选择弹窗与收藏分组弹窗的输入控件补齐可见 `<label>` 与唯一 `datalist` ID。
4. **`B-10`（优先级 4.00 · 成本小）**：补齐命令模式分组折叠头的 `aria-expanded` 与模板选择器列表项的 `aria-busy` 加载态及 `:focus-visible` 焦点环。
5. **`B-11`（优先级 2.00 · 成本小）**：将移动端排序遮罩内联 `zIndex` 与预览探针内联边距收敛至 SCSS 令牌。
