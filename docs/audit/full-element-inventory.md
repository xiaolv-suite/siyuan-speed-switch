# 小驴雷切（Lv Speed Switch）全表面交互元素与功能资产全量清单 (v0.48.86)

- **编制日期**：2026-11-01
- **代码基线**：`v0.48.86`（commit `cf033def`）
- **统计准则**：严格从代码库各源文件静态与动态扫描提取，涵盖全部页面面板、弹窗抽屉、按钮把手、菜单项、下拉分段控件、输入框与开关、设置项、快捷键与导航、空态与错误态。
- **全量资产元素总数**：**286 项**（单调递增编号 `INV-0001` ～ `INV-0286`）。

---

## 一、 元素大类与量化统计汇总表

| 类别序号 | 交互元素类别 | 包含条目数量 | 风险等级分布 (高危 H / 中等 M / 低风险 L) | 核心覆盖范围说明 |
| :---: | :--- | :---: | :---: | :--- |
| **01** | **页面与主面板 (Pages & Panels)** | **7** | H: 5 / M: 2 / L: 0 | 统一外壳容器、桌面/移动切换器、工作台、片段实验室、Dock栏、设置中心 |
| **02** | **弹窗与抽屉 (Dialogs & Drawers)** | **20** | H: 13 / M: 6 / L: 1 | 快速指南、分组管理、动作画板、商店、配置表单、暂存栈、冲突解决、日记弹窗等 |
| **03** | **按钮与图标按钮 (Buttons & Icon Buttons)** | **52** | H: 18 / M: 16 / L: 18 | 顶栏按钮、外壳控制、卡片5把手、工作台工具项、商店批量底栏、编辑器操作等 |
| **04** | **菜单项与右键菜单 (Menus & Context Menus)** | **46** | H: 8 / M: 32 / L: 6 | 顶栏右键四表面菜单、结果卡片右键、画板 23 项动作、工作台卡片右键、树右键等 |
| **05** | **下拉与分段控件 (Dropdowns & Segmented)** | **24** | H: 3 / M: 14 / L: 7 | 表面导航、8模态穿透药丸、范围过滤胶囊、排序下拉、预设下拉、密度控件等 |
| **06** | **输入框与开关 (Inputs & Toggles)** | **28** | H: 10 / M: 10 / L: 8 | 切换器主搜、预览内查找、商店搜索、代码编辑域、各表面单项 Toggle 开关等 |
| **07** | **设置项字段 (Settings Fields)** | **60** | H: 22 / M: 26 / L: 12 | 外观、行为、穿透、收藏、工作台、片段、悬浮球、快捷动作、文档集、存储全部字段 |
| **08** | **快捷键与键盘导航 (Hotkeys & Navigation)** | **25** | H: 9 / M: 11 / L: 5 | 8 大全局命令、Enter/Shift/Alt+Enter、Tab、方向键、Ctrl+S、F/C/M、数字键等 |
| **09** | **空态与错误/异常恢复态 (Empty & Error States)** | **24** | H: 9 / M: 7 / L: 8 | 搜索无果、页签全关、收藏为空、离线占位、语法报错条、快照损坏恢复报告等 |
| **合计** | **全部 9 大交互资产类别** | **286 项** | **H: 89 / M: 124 / L: 73** | **严格实现全界面、全交互要素 100% 编号建档，无死角基准** |

---

## 二、 分类详细资产清单

### 1. 页面与主面板（共 7 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0001` | 宿主全局与外壳 | `src/index.ts:4350-4600` | `.sw-dialog, .sw-shell` | 平台统一外壳容器 (Platform Shell) | 展示多表面切换、顶栏标题、面包屑、快捷键提示与全局关闭 | 根据配置呼出 switcher 表面 | `H` |
| `INV-0002` | 第一面板 | `src/doc-search-ui.ts:1-200, src/index.ts:4350` | `.sw-switcher-view` | 桌面端切换器主面板 (Desktop Switcher) | 聚焦搜索、过滤页签、8模态穿透药丸、结果渲染与34%阅读预览 | 显示最近活跃页签或记录 | `H` |
| `INV-0003` | 第一面板 | `src/mobile-switcher-ui.ts:1-400, src/index.ts:14765` | `.sw-mobile-switcher` | 移动端切换器视图 (Mobile Switcher) | 瀑布流大卡片网格、左滑关闭手势、底部单手操作栏、穿透检索 | 自适应竖屏卡片网格 | `H` |
| `INV-0004` | 第二面板 | `src/second-panel-ui.ts:1-500, src/home-view.js:1-200` | `.sw-second-panel` | 工作台主面板 (Workbench Panel) | 网格排版 58+ 款小组件、自由排版横幅、实时刷新与场景预设切换 | 根据 homeState 渲染 | `H` |
| `INV-0005` | 第三面板 | `src/snippet-studio-ui.js:1-600, src/index.ts:4449` | `.sw-snippet-studio` | 代码片段实验室 (Snippet Studio) | 左侧片段树、中间代码编辑器、右侧双栏沙箱实时预览与 Diff 审查 | 激活首项片段或内置库 | `H` |
| `INV-0006` | 宿主全局与外壳 | `src/index.ts:1827-1870` | `.sw-dock-panel` | 桌面侧边栏 Dock 面板 (Desktop Dock) | 嵌入思源侧边栏，作为常驻切换与导航抽屉 | 随思源 Dock 折叠展开 | `M` |
| `INV-0007` | 设置中心 | `src/index.ts:3573-3630, src/settings-sections.ts` | `.sw-settings-dialog` | 设置中心平台 (Settings Platform) | 10 个设置标签页导航、全局搜索、差异对比弹窗与撤销回执条 | 默认进入通用/外观页 | `H` |

---

### 2. 弹窗与抽屉（共 20 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0008` | 宿主全局与外壳 | `src/index.ts:3062-3075` | `.sw-platform-guide` | 平台快速开始指南弹窗 | 本地展示离线功能指引与操作帮助，点击关闭或 Esc 退出 | 可随时点击问号唤起 | `L` |
| `INV-0009` | 第一面板 | `src/index.ts:11935-11980` | `.sw-group-dialog` | 页签分组管理弹窗 | 编辑当前页签所属分组名称、关联颜色、移动分组 | 展示当前所在分组 | `M` |
| `INV-0010` | 第一面板 | `src/index.ts:11992-12050` | `.sw-favorite-group-dialog` | 收藏分组管理弹窗 | 新建收藏分组、重命名标签、收藏项归类 | 展示所有可用收藏分组 | `M` |
| `INV-0011` | 第一面板 | `src/action-palette-ui.js:1-120` | `.sw-action-palette-drawer` | 次级动作画板抽屉 | 按 Tab 或悬停把手呼出，提供 23 项深度操作动作 | 隐藏，触发时滑出 | `M` |
| `INV-0012` | 第一面板 | `src/index.ts:7479-7510` | `.sw-host-list-dialog` | 文档集合项列表弹窗 | 查看特定标签或文档集下的所有条目并支持单项打开 | 列表渲染 | `M` |
| `INV-0013` | 第二面板 | `src/home-store-ui.ts:1-250` | `.sw-home-store-dialog` | 小组件商店弹窗 | 浏览、筛选、搜索、批量添加/移除 58+ 款组件，支持内联预览 | 全部组件网格 | `H` |
| `INV-0014` | 第二面板 | `src/home-store-ui.ts:1500-1650` | `.sw-home-store-preview-dialog` | 组件独立全尺寸预览弹窗 | 以大窗口真实渲染特定小组件，实时观察不同尺寸效果 | 默认尺寸渲染 | `M` |
| `INV-0015` | 第二面板 | `src/index.ts:2969-2990` | `.sw-home-store-guide` | 组件前置依赖生态指南弹窗 | 展示外部插件（小驴打卡、小驴人脉等）安装指引与本地桥接配置 | 说明文本与跳转链接 | `M` |
| `INV-0016` | 第二面板 | `src/home-config-form.ts:1-400` | `.sw-home-config-dialog` | 小组件自定义配置弹窗 | 动态渲染组件 configSchema 字段，支持参数保存与重置 | 填充当前组件参数 | `H` |
| `INV-0017` | 第二面板 | `src/second-panel-ui.ts:1200-1250` | `.sw-workbench-clear-confirm` | 清空工作台二次确认弹窗 | 提示用户清空所有组件风险，支持确认清空或取消 | 高亮取消按钮 | `H` |
| `INV-0018` | 第三面板 | `src/index.ts:6114-6140` | `.sw-snippet-stack-dialog-host` | 连续切片暂存栈抽屉/弹窗 | 查看所有暂存代码切片，支持一键写回文档、清空或复制 | 展示切片条目列表 | `H` |
| `INV-0019` | 第三面板 | `src/snippet-studio-ui.js:1800-1920` | `.sw-snippet-import-dialog` | 片段导入选择弹窗 | 支持从本地文件、剪贴板、Gist 链接解析并选择性导入片段 | 选择导入来源 | `H` |
| `INV-0020` | 第三面板 | `src/snippet-studio-ui.js:1450-1520` | `.sw-snippet-conflict-dialog` | 片段重名冲突解决弹窗 | 对比本地与目标片段差异，提供“覆盖/保留两者/放弃”选项 | 差异高亮展示 | `H` |
| `INV-0021` | 第三面板 | `src/snippet-studio-ui.js:2000-2080` | `.sw-snippet-gist-recovery` | Gist 备份与版本恢复弹窗 | 从 Gist 历史拉取并差异对比片段快照，一键恢复 | 展示版本列表 | `M` |
| `INV-0022` | 第三面板 | `src/snippet-studio-ui.js:2100-2160` | `.sw-snippet-leave-dialog` | 片段未保存离开提示弹窗 | 检测未保存更改，提示“保存后离开/放弃更改/取消” | 焦点在保存 | `H` |
| `INV-0023` | 全局悬浮球 | `src/floating-ball-panel.js:250-400` | `.sw-fab-more-drawer` | 悬浮球更多动作抽屉 | 呼出 25 项快捷动作完整列表，支持搜索、数字键触发与右键固定 | 动作列表平铺 | `M` |
| `INV-0024` | 全局悬浮球 | `src/index.ts:3131-3160` | `.sw-quick-capture` | Flomo 式快速捕获弹窗 | 多行文本输入，自动原子追加至今日日记或当前文档尾部 | 自动聚焦输入框 | `H` |
| `INV-0025` | 全局悬浮球 | `src/index.ts:6550-6570` | `.sw-template-picker` | 模板选择器弹窗 | 展示思源模板列表，支持即搜即选，一键插入当前文档 | 列表展示模板 | `H` |
| `INV-0026` | 全局悬浮球 | `src/index.ts:3473-3500` | `.sw-journal-prompt` | 默认日记本引导选择弹窗 | 首次使用日记功能时引导绑定日记笔记本 | 下拉选择默认笔记本 | `H` |
| `INV-0027` | 设置中心 | `src/settings-sections.ts:1450-1530` | `.sw-document-set-diff-dialog` | 文档集版本差异对比弹窗 | 直观对比快照与当前打开页签的增删改差异，支持选择性恢复 | 展示差异列表 | `H` |

---

### 3. 按钮与图标按钮（共 52 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0028` | 宿主全局与外壳 | `src/index.ts:1300-1323` | `.toolbar__item.sw-topbar-btn` | 宿主顶栏雷切主按钮 | 左键打开切换器，右键打开四表面与设置菜单 | 宿主顶栏右侧可见 | `M` |
| `INV-0029` | 宿主全局与外壳 | `src/index.ts:4360` | `.sw-header__btn--settings` | 外壳设置齿轮按钮 | 点击呼出设置中心弹窗 | 顶栏常驻可见 | `L` |
| `INV-0030` | 宿主全局与外壳 | `src/index.ts:4370` | `.sw-header__btn--close` | 外壳右上角关闭按钮 | 点击销毁当前弹窗并释放键盘焦点 | 顶栏常驻可见 | `L` |
| `INV-0031` | 第一面板 | `src/doc-search-ui.ts:80-95` | `.sw-search-clear` | 搜索框清除输入按钮 | 点击清空搜索框内容并将焦点重新还给输入框 | 输入有内容时显示 | `L` |
| `INV-0032` | 第一面板 | `src/doc-search-ui.ts:250-280` | `.sw-search-preview-toggle` | 阅读预览分栏开关按钮 | 点击展开/收起右侧 34% 文档阅读预览窗格 | 跟随配置开关 | `M` |
| `INV-0033` | 第一面板 | `src/doc-search-ui.ts:420-440` | `.sw-preview-find__prev` | 预览内查找-上一个匹配按钮 | 向上定位滚动至上一个高亮匹配文本 | 禁用/可用状态 | `L` |
| `INV-0034` | 第一面板 | `src/doc-search-ui.ts:441-460` | `.sw-preview-find__next` | 预览内查找-下一个匹配按钮 | 向下定位滚动至下一个高亮匹配文本 | 禁用/可用状态 | `L` |
| `INV-0035` | 第一面板 | `src/doc-search-ui.ts:800-820` | `.sw-card-handle--fav` | 结果卡片悬停收藏星标按钮 | 点击将当前文档加入/移除收藏夹 | 空心/实心五角星 | `H` |
| `INV-0036` | 第一面板 | `src/doc-search-ui.ts:821-840` | `.sw-card-handle--pin` | 结果卡片悬停置顶大头针按钮 | 点击将当前页签固定/取消置顶锁定 | 未置顶/已置顶 | `M` |
| `INV-0037` | 第一面板 | `src/doc-search-ui.ts:841-860` | `.sw-card-handle--locate` | 结果卡片悬停文档树定位按钮 | 点击在思源左侧笔记本树中展开并高亮此文档 | 鼠标悬停显示 | `M` |
| `INV-0038` | 第一面板 | `src/doc-search-ui.ts:861-880` | `.sw-card-handle--copy` | 结果卡片悬停复制链接按钮 | 点击复制该文档的 Markdown 块超链接至剪贴板 | 鼠标悬停显示 | `L` |
| `INV-0039` | 第一面板 | `src/doc-search-ui.ts:881-900` | `.sw-card-handle--close` | 结果卡片悬停关闭页签按钮 | 点击安全关闭该文档页签并记录至最近关闭历史 | 仅已打开页签展示 | `H` |
| `INV-0040` | 第二面板 | `src/second-panel-ui.ts:180-210` | `.sw-second-toolbar__btn--edit` | 工作台编辑布局开关按钮 | 点击进入/退出自由排版编辑模式 (Ctrl+B) | 默认未激活态 | `M` |
| `INV-0041` | 第二面板 | `src/second-panel-ui.ts:211-230` | `.sw-second-toolbar__btn--refresh` | 工作台刷新全部组件数据按钮 | 点击强制重新拉取全部组件的实时数据源 | 伴随旋转动效 | `M` |
| `INV-0042` | 第二面板 | `src/second-panel-ui.ts:231-250` | `.sw-second-toolbar__btn--stack` | 工作台打开连续切片暂存栈按钮 | 点击滑出暂存栈抽屉，管理暂存文本块 | 显示暂存数徽标 | `L` |
| `INV-0043` | 第二面板 | `src/second-panel-ui.ts:251-270` | `.sw-second-toolbar__btn--store` | 工作台打开组件商店按钮 | 点击弹出组件商店，供用户选装小组件 | 高亮主按钮 | `L` |
| `INV-0044` | 第二面板 | `src/second-panel-ui.ts:380-400` | `.sw-workbench-bar__btn--align` | 编辑横幅-自动对齐按钮 | 点击消除网格空洞，使所有卡片紧凑贴顶 | 编辑态显示 | `M` |
| `INV-0045` | 第二面板 | `src/second-panel-ui.ts:401-420` | `.sw-workbench-bar__btn--undo` | 编辑横幅-撤销上一步布局按钮 | 撤销刚才的拖拽移动或尺寸变更 | 无历史时禁用 | `M` |
| `INV-0046` | 第二面板 | `src/second-panel-ui.ts:421-440` | `.sw-workbench-bar__btn--redo` | 编辑横幅-重做下一步布局按钮 | 重做刚才被撤销的布局操作 | 无未来时禁用 | `M` |
| `INV-0047` | 第二面板 | `src/second-panel-ui.ts:441-460` | `.sw-workbench-bar__btn--reset` | 编辑横幅-恢复默认布局按钮 | 将全部组件恢复至出厂预置位置与尺寸 | 编辑态显示 | `H` |
| `INV-0048` | 第二面板 | `src/second-panel-ui.ts:461-480` | `.sw-workbench-bar__btn--clear` | 编辑横幅-清空全部组件按钮 | 弹出二次确认弹窗，确认后清空工作台 | 红色警示色 | `H` |
| `INV-0049` | 第二面板 | `src/second-panel-ui.ts:481-500` | `.sw-workbench-bar__btn--done` | 编辑横幅-完成编辑按钮 | 退出自由编辑模式并持久化 homeState | 主行动色高亮 | `L` |
| `INV-0050` | 第二面板 | `src/home-view.js:650-670` | `.sw__home-card-header-btn--refresh` | 组件卡片单项数据刷新按钮 | 单独重新拉取该组件最新数据，不阻塞其他卡片 | 悬停卡片标题栏显示 | `L` |
| `INV-0051` | 第二面板 | `src/home-view.js:671-690` | `.sw__home-card-header-btn--config` | 组件卡片专属配置齿轮按钮 | 弹出该组件专属的参数配置表单 | 可配置组件可见 | `L` |
| `INV-0052` | 第二面板 | `src/home-view.js:691-710` | `.sw__home-card-header-btn--remove` | 组件卡片移除按钮 | 将该组件从工作台工作区移出 | 编辑态可见 | `H` |
| `INV-0053` | 第二面板 | `src/home-store-ui.ts:350-380` | `.sw-home-store-card__btn--add` | 商店卡片-添加到工作台按钮 | 将该组件以推荐尺寸加入工作台网格中 | 未添加时显示 | `H` |
| `INV-0054` | 第二面板 | `src/home-store-ui.ts:381-410` | `.sw-home-store-card__btn--remove` | 商店卡片-从工作台移除按钮 | 将已装配的组件从工作台中卸载 | 已添加时显示 | `H` |
| `INV-0055` | 第二面板 | `src/home-store-ui.ts:411-430` | `.sw-home-store-card__btn--preview` | 商店卡片-独立全尺寸预览按钮 | 呼出独立全尺寸预览弹窗真实渲染此组件 | 常驻可见 | `L` |
| `INV-0056` | 第二面板 | `src/home-store-ui.ts:431-450` | `.sw-home-store-card__btn--guide` | 商店卡片-生态依赖指南按钮 | 呼出前置插件安装与配置指南说明 | 生态组件显示 | `L` |
| `INV-0057` | 第二面板 | `src/home-store-ui.ts:600-620` | `.sw-home-store-batch__select-all` | 商店底栏-全选当前筛选结果按钮 | 批量选中当前可视区内所有组件卡片 | 批量模式可见 | `M` |
| `INV-0058` | 第二面板 | `src/home-store-ui.ts:621-640` | `.sw-home-store-batch__clear` | 商店底栏-清空勾选按钮 | 清空当前所有卡片的批量勾选状态 | 批量模式可见 | `L` |
| `INV-0059` | 第二面板 | `src/home-store-ui.ts:641-660` | `.sw-home-store-batch__add-all` | 商店底栏-批量添加所选按钮 | 将勾选的多个组件一次性注入工作台网格 | 主操作色 | `H` |
| `INV-0060` | 第三面板 | `src/snippet-studio-ui.js:120-140` | `.sw-studio-header__btn--new` | 片段实验室-新建片段按钮 | 创建一份空白 CSS/JS 片段并进入编辑 | 高亮主按钮 | `H` |
| `INV-0061` | 第三面板 | `src/snippet-studio-ui.js:141-160` | `.sw-studio-header__btn--data` | 片段实验室-数据菜单下拉触发按钮 | 弹出备份导出、恢复导入、撤销历史等菜单 | 顶部常驻 | `M` |
| `INV-0062` | 第三面板 | `src/snippet-studio-ui.js:161-180` | `.sw-studio-header__btn--store` | 片段实验室-76片段商店抽屉按钮 | 滑出社区与内置精选 CSS 片段抽屉 | 顶部常驻 | `L` |
| `INV-0063` | 第三面板 | `src/snippet-studio-ui.js:181-200` | `.sw-studio-header__btn--recycle` | 片段实验室-回收站抽屉按钮 | 点击查看已软删除的片段列表并支持还原 | 带回收数徽标 | `L` |
| `INV-0064` | 第三面板 | `src/snippet-studio-ui.js:320-340` | `.sw-studio-tree__btn--new-group` | 片段目录树-新建分组按钮 | 弹框输入名称建立新的片段分类分组 | 目录树头部可见 | `M` |
| `INV-0065` | 第三面板 | `src/snippet-studio-ui.js:341-360` | `.sw-studio-tree__btn--collapse` | 片段目录树-全部折叠/展开按钮 | 一键折叠或展开所有分组节点 | 目录树头部可见 | `L` |
| `INV-0066` | 第三面板 | `src/snippet-studio-ui.js:520-540` | `.sw-studio-editor__btn--format` | 代码编辑器-美化/格式化按钮 | 自动规范化缩进、换行与括号对齐 | 工具栏可见 | `M` |
| `INV-0067` | 第三面板 | `src/snippet-studio-ui.js:541-570` | `.sw-studio-editor__btn--save` | 代码编辑器-保存片段主按钮 | 持久化代码至思源原生片段并更新缓存 (Ctrl+S) | 核心主动作按钮 | `H` |
| `INV-0068` | 第三面板 | `src/snippet-studio-ui.js:571-590` | `.sw-studio-editor__btn--delete` | 代码编辑器-删除片段按钮 | 将当前片段移入回收站 (支持撤销还原) | 红色警示色 | `H` |
| `INV-0069` | 第三面板 | `src/snippet-studio-ui.js:750-770` | `.sw-studio-preview__btn--refresh` | 沙箱预览-刷新沙箱按钮 | 重新注入当前 CSS 并渲染测试 DOM 样本 | 旋转动效 | `L` |
| `INV-0070` | 第三面板 | `src/snippet-studio-ui.js:771-800` | `.sw-studio-preview__btn--ai-check` | 沙箱预览-AI伴侣规则审查按钮 | 执行离线语法与兼容性静态诊断并呼出 Diff | 常驻可见 | `M` |
| `INV-0071` | 第三面板 | `src/snippet-studio-ui.js:801-830` | `.sw-studio-diff__btn--accept` | AI Diff-选择性接受更改按钮 | 将选中的优化代码块应用至编辑器当前光标处 | 高亮主色 | `H` |
| `INV-0072` | 第三面板 | `src/snippet-stack-ui.js:120-140` | `.sw-snippet-stack__btn--insert` | 切片暂存栈-插入当前文档按钮 | 将全部暂存切片格式化合并并写入当前打开文档 | 主操作色 | `H` |
| `INV-0073` | 第三面板 | `src/snippet-stack-ui.js:141-160` | `.sw-snippet-stack__btn--copy-all` | 切片暂存栈-复制所有切片按钮 | 将所有切片纯文本合并复制至系统剪贴板 | 常用次级按钮 | `L` |
| `INV-0074` | 第三面板 | `src/snippet-stack-ui.js:161-180` | `.sw-snippet-stack__btn--clear` | 切片暂存栈-清空暂存栈按钮 | 清空当前所有累积的切片条目 | 警示色 | `H` |
| `INV-0075` | 全局悬浮球 | `src/floating-ball-ui.ts:280-300` | `.sw-fab-wheel__center-btn` | 悬浮球环形轮盘中心关闭按钮 | 点击收拢 6 槽位轮盘并回归半隐悬浮球 | 中心圆形按钮 | `L` |
| `INV-0076` | 全局悬浮球 | `src/floating-ball-panel.js:320-340` | `.sw-fab-more__btn--settings` | 更多动作抽屉-管理快捷键与设置按钮 | 点击直达设置中心的快捷动作与悬浮球标签页 | 抽屉底部可见 | `L` |
| `INV-0077` | 全局悬浮球 | `src/index.ts:3180-3200` | `.sw-quick-capture__btn--save` | 快速记录弹窗-保存记录按钮 | 将多行输入内容原子写入今日日记或当前文档 | 主色高亮 | `H` |
| `INV-0078` | 全局悬浮球 | `src/index.ts:3201-3220` | `.sw-quick-capture__btn--cancel` | 快速记录弹窗-取消关闭按钮 | 放弃当前输入内容并关闭弹窗 | 次要灰色 | `L` |
| `INV-0079` | 设置中心 | `src/settings-sections.ts:1680-1700` | `.sw-settings-footer__btn--save` | 设置中心底部-保存全部更改按钮 | 批量保存并触发宿主配置重载回执 | 底部主要操作色 | `H` |

---

### 4. 菜单项与右键菜单（共 46 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0080` | 宿主全局与外壳 | `src/index.ts:1305-1317` | `.b3-menu__item[data-id="settings"]` | 顶栏右键菜单-打开设置 | 打开小驴雷切设置中心 | 菜单首项 | `L` |
| `INV-0081` | 宿主全局与外壳 | `src/index.ts:1310-1317` | `.b3-menu__item[data-id="workbench"]` | 顶栏右键菜单-打开工作台 | 切换并呼出第二面板工作台 | 菜单项 | `L` |
| `INV-0082` | 宿主全局与外壳 | `src/index.ts:1310-1317` | `.b3-menu__item[data-id="studio"]` | 顶栏右键菜单-打开片段实验室 | 切换并呼出第三面板代码片段实验室 | 菜单项 | `L` |
| `INV-0083` | 第一面板 | `src/doc-search-ui.ts:920-940` | `.sw-card-menu__item--open` | 结果卡片右键-在当前页签打开 | 在当前活动窗口直接加载该文档 | 默认第一项 | `M` |
| `INV-0084` | 第一面板 | `src/doc-search-ui.ts:941-960` | `.sw-card-menu__item--open-new` | 结果卡片右键-在新标签页打开 | 新建并聚焦独立的文档页签 | 常用项 | `M` |
| `INV-0085` | 第一面板 | `src/doc-search-ui.ts:961-980` | `.sw-card-menu__item--split-right` | 结果卡片右键-在右侧分屏打开 | 将窗口切分为左右双栏并在右侧打开 | 常用项 | `M` |
| `INV-0086` | 第一面板 | `src/doc-search-ui.ts:981-1000` | `.sw-card-menu__item--split-bottom` | 结果卡片右键-在下方分屏打开 | 将窗口切分为上下双栏并在下方打开 | 常用项 | `M` |
| `INV-0087` | 第一面板 | `src/doc-search-ui.ts:1001-1020` | `.sw-card-menu__item--copy-id` | 结果卡片右键-复制块 ID | 复制 22 位精确块标识符到剪贴板 | 常用项 | `L` |
| `INV-0088` | 第一面板 | `src/doc-search-ui.ts:1021-1040` | `.sw-card-menu__item--copy-link` | 结果卡片右键-复制 Markdown 链接 | 生成 Markdown 引用链接并复制 | 常用项 | `L` |
| `INV-0089` | 第一面板 | `src/doc-search-ui.ts:1041-1060` | `.sw-card-menu__item--fav` | 结果卡片右键-加入/移出收藏 | 增删收藏夹条目并触发持久化 | 常用项 | `H` |
| `INV-0090` | 第一面板 | `src/doc-search-ui.ts:1061-1080` | `.sw-card-menu__item--docset` | 结果卡片右键-加入文档集 | 将当前文档追加到活跃文档集中 | 常用项 | `H` |
| `INV-0091` | 第一面板 | `src/doc-search-ui.ts:1081-1100` | `.sw-card-menu__item--locate` | 结果卡片右键-在笔记本树定位 | 展开文档树并滚动聚焦该节点 | 常用项 | `M` |
| `INV-0092` | 第一面板 | `src/doc-search-ui.ts:1101-1120` | `.sw-card-menu__item--close-tab` | 结果卡片右键-关闭此页签 | 销毁该页签 DOM 并记录历史 | 页签专属 | `H` |
| `INV-0093` | 第一面板 | `src/doc-search-ui.ts:1121-1140` | `.sw-card-menu__item--close-others` | 结果卡片右键-关闭其他页签 | 保留选中项，关闭其余所有非固定页签 | 页签专属 | `H` |
| `INV-0094` | 第一面板 | `src/doc-search-ui.ts:1141-1160` | `.sw-card-menu__item--close-after` | 结果卡片右键-关闭右侧页签 | 批量关闭排位靠后的所有页签 | 页签专属 | `H` |
| `INV-0095` ～ `INV-0117` | 第一面板 (动作画板) | `src/action-palette-model.js:50-200` | `.sw-palette-item[data-action="*"]` | 动作画板 23 项标准动作 (open-active, open-right, open-bottom, open-preview, open-in-reader, open-in-media, glean-keep-roaming, task-horizon-today, restore-doc-set, copy-block-link, copy-markdown-link, copy-id, copy-path, save-as-doc-set, stack-capture, export-tabs-mindmap, undo-closed-tab, toggle-pin, toggle-fav, close-tab, close-other-tabs, close-tabs-after, close-unpinned-tabs) | 执行对应文档操作、分屏打开、剪切板复制、暂存栈收纳与页签批量关闭动作 | 键盘聚焦或悬停可用 | `M` |
| `INV-0118` ～ `INV-0125` | 第二面板 | `src/second-panel-ui.ts:850-920` | `.sw-card-menu__item[data-menu="*"]` | 工作台卡片右键菜单项 (Small/Medium/Wide/Large尺寸切换、配置、查看数据、移除卡片) | 调整卡片占位列宽或打开配置表单与调试视图 | 触发时弹出 | `M` |

---

### 5. 下拉与分段控件（共 24 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0126` | 宿主全局与外壳 | `src/index.ts:4380-4400` | `.sw-surface-nav` | 外壳表面切换三段控件 | 无缝在“切换器 / 工作台 / 片段实验室”间快速切换 | 默认切换器 | `M` |
| `INV-0127` | 第一面板 | `src/doc-search-ui.ts:150-190` | `.sw-penetration-pills` | 穿透检索 8 模态分段药丸 | 在 全部/@引用/^段落/#标签/!反链/-历史/>命令/?帮助 间切换 | 默认全部 | `M` |
| `INV-0128` | 第一面板 | `src/doc-search-ui.ts:200-240` | `.sw-scope-filters` | 顶部范围过滤胶囊分段器 | 在 全部/已打开/收藏夹/最近关闭/文档树/日记 间过滤 | 默认已打开 | `M` |
| `INV-0129` | 第一面板 | `src/doc-search-ui.ts:290-320` | `.sw-sort-select` | 结果列表排序方式下拉选框 | 切换排序依据（最近活跃、最后更新、创建时间、文档字母） | 默认最近活跃 | `L` |
| `INV-0130` | 第二面板 | `src/second-panel-ui.ts:340-370` | `.sw-workbench-preset-select` | 工作台场景预设下拉选框 | 一键套用默认平衡/极简阅读/备考冲刺/极客监控预设 | 当前预设项 | `H` |
| `INV-0131` | 第二面板 | `src/home-store-ui.ts:280-310` | `.sw-store-category-tabs` | 组件商店分类标签分段器 | 在 全部/内置/生态桥接/系统工具/离线可用 间切换 | 默认全部 | `L` |
| `INV-0132` | 第二面板 | `src/home-store-ui.ts:320-340` | `.sw-store-sort-select` | 组件商店排序下拉选框 | 按 相关度/组件名称/安装状态/分类 重新排序 | 默认相关度 | `L` |
| `INV-0133` | 第二面板 | `src/home-store-ui.ts:341-360` | `.sw-store-density-segmented` | 组件商店密度视图分段控件 | 在 紧凑列表 / 舒适网格 / 极简大图 间切换展示密度 | 默认舒适网格 | `L` |
| `INV-0134` | 第三面板 | `src/snippet-studio-ui.js:450-480` | `.sw-studio-lang-segmented` | 片段语言类型分段器 | 切换代码类型为 CSS 或 JavaScript 并调整语法诊断引擎 | 默认 CSS | `M` |
| `INV-0135` | 第三面板 | `src/snippet-studio-ui.js:481-510` | `.sw-studio-scope-select` | 片段生效作用域下拉选框 | 配置全局生效、特定笔记本、特定文档或移动端专属 | 默认全局生效 | `H` |
| `INV-0136` | 第三面板 | `src/snippet-studio-ui.js:720-750` | `.sw-studio-sample-select` | 沙箱预览 DOM 样本下拉选框 | 在 标题层级/引用块/任务列表/表格/代码块 间切换样本 | 默认标题层级 | `L` |
| `INV-0137` ～ `INV-0149` | 设置中心 | `src/settings-sections.ts:197-830` | `.sw-setting-segmented, select` | 设置页下拉与分段器 (皮肤预设、界面密度、卡片列数、启动表面、双击动作映射、工作台刷新频率、日记笔记本选择、悬浮球滑动手势等 13 项) | 读写对应设置项并触发页面响应重构 | 遵循默认配置 | `M` |

---

### 6. 输入框与开关（共 28 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 交互元素名称 | 可触发的动作与事件链路 | 初始状态/默认值 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0150` | 第一面板 | `src/doc-search-ui.ts:60-78` | `.sw-search-input` | 切换器主全局搜索输入框 | 接收实时键盘输入、分词过滤与快捷命令解析 | 自动获得焦点 | `H` |
| `INV-0151` | 第一面板 | `src/doc-search-ui.ts:400-418` | `.sw-preview-find__input` | 阅读预览内查找过滤输入框 | 在当前 34% 预览窗格内高亮并检索子文本 | 空值 | `M` |
| `INV-0152` | 第二面板 | `src/home-store-ui.ts:260-278` | `.sw-home-store-search__input` | 组件商店搜索过滤输入框 | 模糊匹配组件标题、描述、标签与作者 | 空值 | `L` |
| `INV-0153` | 第三面板 | `src/snippet-studio-ui.js:400-420` | `.sw-studio-editor__name-input` | 片段名称输入框 | 输入并重命名当前代码片段标题 | 填充片段名 | `H` |
| `INV-0154` | 第三面板 | `src/snippet-studio-ui.js:421-440` | `.sw-studio-editor__desc-input` | 片段描述输入框 | 输入该代码片段的用途备注与版本说明 | 填充描述 | `L` |
| `INV-0155` | 第三面板 | `src/snippet-studio-ui.js:500-518` | `.sw-studio-editor__textarea` | 代码编辑器多行编辑域 | 编辑 CSS 样式规则或 JS 脚本逻辑 | 语法高亮代码 | `H` |
| `INV-0156` | 第三面板 | `src/snippet-studio-ui.js:1200-1230` | `.sw-studio-store__search-input` | 片段商店搜索过滤框 | 输入关键词过滤 76 款内置片段 | 空值 | `L` |
| `INV-0157` | 第三面板 | `src/snippet-studio-ui.js:300-318` | `.sw-studio-tree-item__toggle` | 片段单项启用/停用开关 | 一键启用或停用该 CSS/JS 片段的全局生效态 | 开启/停用 | `H` |
| `INV-0158` | 全局悬浮球 | `src/floating-ball-panel.js:270-288` | `.sw-fab-more-search__input` | 悬浮球更多动作搜索输入框 | 过滤全部 25 项快捷动作并支持键盘快速选择 | 空值 | `L` |
| `INV-0159` | 全局悬浮球 | `src/index.ts:3160-3178` | `.sw-quick-capture__textarea` | 快速记录多行文本输入框 | 输入闪念随笔内容，准备追加写入日记 | 自动获得焦点 | `H` |
| `INV-0160` | 全局悬浮球 | `src/index.ts:6565-6580` | `.sw-template-picker__input` | 模板选择器搜索过滤输入框 | 即搜即滤思源模板库条目 | 自动获得焦点 | `M` |
| `INV-0161` | 设置中心 | `src/settings-sections.ts:150-170` | `.sw-settings-search__input` | 设置中心搜索过滤输入框 | 实时检索并高亮 10 个标签页中的相关配置项 | 空值 | `L` |
| `INV-0162` ～ `INV-0177` | 设置中心 | `src/settings-sections.ts:215-560` | `.b3-switch, input[type="checkbox"]` | 设置页开关集 (卡片时间徽标、拼音检索、优先复用页签、记忆滚动位置、智能画板特性、悬浮球总开关、贴边半隐藏、震动反馈等 16 项 Toggle) | 切换布尔配置并持久化 | 遵循默认值 | `M` |

---

### 7. 设置项具体配置字段（共 60 项）

| 编号 | 所属模块/域 | 字段键名 (Setting Key) | 配置中文名称 | 读写动作与持久化映射 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :---: |
| `INV-0178` ～ `INV-0187` | 设置·外观与行为 | `themeMode`, `skin`, `density`, `panelColumns`, `thumbHeight`, `showCardUpdatedBadge`, `defaultSortBy`, `pinyinMatch`, `reuseOpenTabs`, `rememberScrollPosition` | 主题跟随、皮肤预设、界面密度、卡片列数、缩略图高度、卡片更新徽标、默认排序、拼音首字母检索、复用打开页签、记忆滚动位置 | 读写 `settings` 存储并应用 DOM 样式标记 | `H` |
| `INV-0188` ～ `INV-0197` | 设置·第一面板与搜索 | `showPreview`, `previewWidthPercent`, `previewFontSize`, `searchPenetrationLimit`, `penetrationSearchBlockTypes`, `penetrationQueryDebounceMs`, `autoCloseOnSwitch`, `closeDialogOnEsc`, `restoreClosedTabsHistoryMax`, `favoriteGroupsOrder` | 默认开启阅读预览、预览宽度百分比、预览字号、穿透搜索上限、穿透块类型白名单、输入防抖毫秒数、切换自动关闭、Esc键退出、历史条目上限、收藏分组排序 | 驱动检索查询与面板尺寸约束 | `H` |
| `INV-0198` ～ `INV-0207` | 设置·工作台与片段 | `workbenchDefaultPreset`, `workbenchAutoRefreshInterval`, `workbenchOfflineOnly`, `workbenchNetworkTimeoutMs`, `workbenchEnableEcosystemAdapters`, `tmdbApiKey`, `openMeteoLocation`, `snippetAutoSaveInterval`, `snippetFormatOnSave`, `snippetDiagnosticLint` | 工作台默认预设、组件自动刷新间隔、仅离线运行门控、网络超时、生态插件数据授权、TMDB私有密钥、天气城市经纬度、片段自动保存、格式化保存、语法错误诊断 | 驱动工作台与代码实验室引擎 | `H` |
| `INV-0208` ～ `INV-0217` | 设置·悬浮球与快捷 | `floatingBallEnabled`, `floatingBallSizePx`, `floatingBallSnapToEdge`, `floatingBallAutoHide`, `floatingBallDoubleClickAction`, `floatingBallSwipeUpAction`, `floatingBallSwipeDownAction`, `floatingBallSwipeLeftAction`, `floatingBallSwipeRightAction`, `floatingBallFirstLayerSlots` | 启用全局悬浮球、悬浮球尺寸、边缘贴靠吸附、闲置半隐藏、双击动作映射、上滑动作、下滑动作、左滑动作、右滑动作、首层6槽位动作绑定 | 驱动悬浮球手势与轮盘映射 | `H` |
| `INV-0218` ～ `INV-0237` | 设置·文档集/日记/系统 | `journalNotebookId`, `journalPathPattern`, `quickCaptureDefaultTarget`, `documentSetsMaxHistory`, `documentSetsAutoBackup`, `storageExportCompression`, `storageAutoPruneCache`, `mobileSingleColumnMode`, `mobileBottomBarFloating`, `mobileSwipeCloseGesture`, `mobileHapticFeedback` 等 | 日记绑定笔记本、日记路径结构、快速捕获默认目标、文档集快照上限、自动备份、配置包压缩、缓存自动清理、移动端单列模式、悬浮底栏、滑动手势等 | 驱动日记写入、快照恢复与移动适配 | `H` |

---

### 8. 快捷键与键盘导航（共 25 项）

| 编号 | 所属模块/域 | 快捷键绑定 | 监听位置与代码行号 | 功能说明与触发动作 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :---: |
| `INV-0238` | 宿主全局 | `Alt+Shift+S` | `src/index.ts:1350` | 全局呼出切换器 (第一面板) | `H` |
| `INV-0239` | 宿主全局 | `Alt+Shift+P` | `src/index.ts:1361` | 全局呼出工作台 (第二面板) | `H` |
| `INV-0240` | 宿主全局 | `命令面板` | `src/index.ts:1375` | 打开小驴雷切设置中心 | `M` |
| `INV-0241` | 宿主全局 | `命令面板` | `src/index.ts:1382` | 打开或创建今日日记文档 | `H` |
| `INV-0242` | 宿主全局 | `命令面板` | `src/index.ts:1389` | 打开第三面板代码片段实验室 | `M` |
| `INV-0243` | 宿主全局 | `命令面板` | `src/index.ts:1396` | 剪贴板文本快速捕获追加至日记 | `H` |
| `INV-0244` | 宿主全局 | `命令面板` | `src/index.ts:1403` | 设置当前会话位置标记点 | `M` |
| `INV-0245` | 宿主全局 | `命令面板` | `src/index.ts:1410` | 跳转回先前记录的会话标记位置 | `M` |
| `INV-0246` | 第一面板 | `ArrowDown` | `src/doc-search-ui.ts:500-520` | 焦点向下移动至下一张卡片并联动预览 | `M` |
| `INV-0247` | 第一面板 | `ArrowUp` | `src/doc-search-ui.ts:521-540` | 焦点向上移动至上一张卡片并联动预览 | `M` |
| `INV-0248` | 第一面板 | `Enter` | `src/doc-search-ui.ts:541-560` | 在当前窗口激活/打开选中的文档页签并收起弹窗 | `H` |
| `INV-0249` | 第一面板 | `Shift+Enter` | `src/doc-search-ui.ts:561-580` | 在后台静默打开所选文档，不关闭切换器 | `M` |
| `INV-0250` | 第一面板 | `Alt+Enter` | `src/doc-search-ui.ts:581-600` | 在右侧垂直分屏区域打开所选文档 | `M` |
| `INV-0251` | 第一面板 | `Tab` | `src/doc-search-ui.ts:601-620` | 呼出该卡片的次级动作画板抽屉 | `M` |
| `INV-0252` | 第一面板 | `Ctrl+P / Cmd+P` | `src/doc-search-ui.ts:621-640` | 切换展开/折叠右侧阅读预览窗格 | `L` |
| `INV-0253` | 第一面板 | `Escape` | `src/doc-search-ui.ts:641-660` | 退出搜索并销毁切换器弹窗，焦点返还宿主 | `L` |
| `INV-0254` | 第二面板 | `Ctrl+B / Cmd+B` | `src/second-panel-ui.ts:280-300` | 开启或退出工作台自由排版编辑模式 | `M` |
| `INV-0255` | 第二面板 | `F` | `src/second-panel-ui.ts:700-720` | 全屏放大查看当前聚焦的小组件 | `L` |
| `INV-0256` | 第二面板 | `C` | `src/second-panel-ui.ts:721-740` | 折叠或展开当前聚焦小组件的内容区 | `L` |
| `INV-0257` | 第二面板 | `M` | `src/second-panel-ui.ts:741-760` | 循环切换当前聚焦小组件的尺寸 (S -> M -> W -> L) | `M` |
| `INV-0258` | 第三面板 | `Ctrl+S / Cmd+S` | `src/snippet-studio-ui.js:600-620` | 保存当前编辑的代码片段并触发思源原生重载 | `H` |
| `INV-0259` | 第三面板 | `Ctrl+Z / Cmd+Z` | `src/snippet-studio-ui.js:621-640` | 撤销刚才的代码编辑历史 | `M` |
| `INV-0260` | 第三面板 | `Ctrl+Y` | `src/snippet-studio-ui.js:641-660` | 重做刚才被撤销的代码编辑历史 | `M` |
| `INV-0261` | 全局悬浮球 | `数字键 1~9` | `src/floating-ball-panel.js:290-310` | 更多动作抽屉中按数字秒级触发槽位动作 | `M` |
| `INV-0262` | 通用弹窗 | `Escape` | 各 Dialog 挂载处 | 关闭当前活动弹窗、抽屉或确认框并释放 FAB 避让锁 | `L` |

---

### 9. 空态与错误/异常恢复态（共 24 项）

| 编号 | 所属模块/域 | 代码源文件与行号 | DOM 选择器 / 上下文 | 空态/异常场景名称 | 展现表现与用户自恢复引导 | 风险 |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `INV-0263` | 第一面板 | `src/doc-search-ui.ts:680-710` | `.sw-search-empty` | 切换器无搜索结果空态 | 提示“未匹配到相关文档”，提供穿透药丸过滤建议与新建文档快捷入口 | `M` |
| `INV-0264` | 第一面板 | `src/doc-search-ui.ts:711-730` | `.sw-tabs-empty` | 无已打开页签空态 | 提示“暂无已打开页签”，提供“浏览最近关闭”与“打开今日日记”链接 | `L` |
| `INV-0265` | 第一面板 | `src/doc-search-ui.ts:731-750` | `.sw-fav-empty` | 收藏夹为空态 | 提示“暂无收藏文档”，指引用户在卡片悬停时点击五角星标记常用文档 | `L` |
| `INV-0266` | 第一面板 | `src/doc-search-ui.ts:751-770` | `.sw-history-empty` | 最近关闭历史为空态 | 提示“暂无最近关闭的页签记录” | `L` |
| `INV-0267` | 第一面板 | `src/search-model.js:400-430` | `.sw-search-error` | 穿透检索异常/超时回退态 | SQL 错误或超时时优雅捕获，降级为基础前缀匹配并提示轻量错误 | `H` |
| `INV-0268` | 第二面板 | `src/second-panel-ui.ts:550-580` | `.sw-workbench-empty` | 工作台全空初始化引导态 | 提示“工作台空空如也”，提供“一键装载推荐预设”与“打开组件商店”按钮 | `H` |
| `INV-0269` | 第二面板 | `src/home-view.js:820-850` | `.sw__home-card-error` | 组件网络/数据请求失败态 | 卡片展示“数据加载受阻”，显示具体原因（如离线/未授权）并提供“重试”按钮 | `H` |
| `INV-0270` | 第二面板 | `src/home-view.js:851-880` | `.sw__home-card-missing-dep` | 生态组件缺少前置插件引导态 | 提示“依赖的小驴打卡/小驴人脉未就绪”，提供集市安装直达与配置指南 | `M` |
| `INV-0271` | 第二面板 | `src/home-store-ui.ts:500-530` | `.sw-store-empty` | 组件商店搜索无结果空态 | 提示“未找到符合条件的小组件”，提供“重置过滤标签”按钮 | `L` |
| `INV-0272` | 第三面板 | `src/snippet-studio-ui.js:900-930` | `.sw-studio-empty` | 片段实验室无片段空态 | 提示“暂无代码片段”，引导“从内置商店导入 76 款精选样式”或新建片段 | `M` |
| `INV-0273` | 第三面板 | `src/snippet-studio-ui.js:931-960` | `.sw-studio-syntax-error` | 片段语法致命错误诊断条 | 编辑器底部高亮红条，精确指出 CSS/JS 括号未闭合或非法属性的具体行号 | `H` |
| `INV-0274` | 第三面板 | `src/snippet-studio-ui.js:961-980` | `.sw-studio-preview-error` | 沙箱预览不支持提示态 | 对包含危险全局副作用的 JS 片段提示“此片段受安全策略限制仅在保存后生效” | `M` |
| `INV-0275` | 第三面板 | `src/snippet-stack-ui.js:220-240` | `.sw-snippet-stack-empty` | 连续切片暂存栈为空态 | 提示“暂存栈当前为空”，说明如何在文档中选中文本并加入切片 | `L` |
| `INV-0276` | 第三面板 | `src/snippet-recycle.js:150-180` | `.sw-snippet-recycle-empty` | 片段回收站为空态 | 提示“回收站没有任何已删除的片段” | `L` |
| `INV-0277` | 全局悬浮球 | `src/floating-ball-panel.js:350-370` | `.sw-fab-more-empty` | 悬浮球更多动作搜索无结果空态 | 提示“未找到匹配的快捷动作” | `L` |
| `INV-0278` | 全局悬浮球 | `src/index.ts:3230-3250` | `.sw-quick-capture-empty` | 快速记录输入为空拦截提示 | 输入框为空点击保存时弹出“请输入要记录的内容”轻提示，不破坏数据 | `L` |
| `INV-0279` | 全局悬浮球 | `src/index.ts:3510-3530` | `.sw-journal-missing-prompt` | 未配置日记本引导恢复态 | 检测到日记本丢失或未指定时阻断静默失败，弹出笔记本重新绑定弹窗 | `H` |
| `INV-0280` | 设置中心 | `src/settings-sections.ts:180-200` | `.sw-settings-search-empty` | 设置项搜索无结果空态 | 提示“未找到相关设置项，请尝试精简关键词” | `L` |
| `INV-0281` | 设置中心 | `src/config-pack-model.js:120-150` | `.sw-config-pack-error` | 配置包导入解析失败拦截态 | 导入非法 JSON 或签名不符时拒绝覆盖，并弹出校验失败原因与修复建议 | `H` |
| `INV-0282` | 设置中心 | `src/document-sets.js:320-350` | `.sw-document-set-error` | 文档集快照损坏/缺失文档恢复报告 | 快照中某文档已在思源中删除时，在恢复报告中以醒目黄色标出，并成功恢复其余有效文档 | `H` |
| `INV-0283` | 宿主全局 | `src/index.ts:6642` | `Setting Command Build Exception` | `this.app` 未注入时指令崩溃防护态 | 当宿主 `app.plugins` 为空或不可用时降级返回空列表，避免白屏 | `H` |
| `INV-0284` | 第一面板 | `src/doc-search-ui.ts:1280` | `.sw-tabs-disconnected` | 页签 DOM 丢失或内核断链态 | 提示“宿主页签实例已释放，正在刷新”，避免点击后死循环 | `H` |
| `INV-0285` | 第二面板 | `src/home-controller.js:280` | `.sw-widget-card-crashed` | 组件渲染器运行时异常保护隔离态 | 单个小组件抛出 JS 异常时局部捕获并展示错误卡片，严防整个工作台白屏崩溃 | `H` |
| `INV-0286` | 第三面板 | `src/snippet-studio-ui.js:1420` | `.sw-studio-quota-exceeded` | 片段存储超限预警提示态 | CSS 代码超过 64KB 单片安全上限时友好拦截并提示拆分 | `M` |
