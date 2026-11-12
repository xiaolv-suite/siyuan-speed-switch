# ADR 0539: 第一面板短文档空洞修复、根滚动容器防御性规整与多类型 CSS 专属聚焦预览系统（T-7833）

## 状态
已决断并实施 (Accepted)

## 背景与实测诊断
1. **第一面板短文档下部空白与高度截断**：
   - 经在真实思源独立实例（`http://127.0.0.1:43928/`）中进行 Playwright DOM 深度遍历与几何分析，发现在首屏初次打开切换器时，由于 `notebookListCache` 为 null 触发异步 `loadNotebooks()`，其完成回调中将内部子栏 `.sw__tab-content` 当作滚动根元素再次调用 `renderList()`，导致 `.sw__tab-preview` 发生非预期的双重嵌套，右侧速览窗格被深锁在内部子栏内；
   - 在样式层，`_11-ui-polish.scss` 中 `.speed-switch .sw__tab-preview.sw--with-preview .sw__doc-preview` 曾遗留 `align-self: start; height: 100cqh;`，导致网格项不会纵向撑满父级容器；
   - 当遇到正文较短或空文档时，原有逻辑清空整个窗格仅留一行单薄的提示字样，使下方 600px~1000px 的阅读区域出现大面积死白空洞，且未渲染标题与快捷动作。

2. **片段实验室与片段商店【预览】缺少类型针对性**：
   - 原有片段预览系统主要呈现通用的“演示文档 · 让灵感有自己的样子”正文段落，用户选择“大纲树彩虹线”、“Mac 终端代码块”、“Bento 柔彩 Callout”、“折叠标题微动效”、“表格交替斑马纹”或“段落聚焦呼吸条”等不同品类的 CSS 片段时，样式难以在普通段落中得到直观体现，用户无法清晰辨识该 CSS 到底改变了哪一部分的界面表现。

## 决策与实现（T-7833）
1. **第一面板根容器防御与阅读导轨纵向满高收口**：
   - 在 `renderList` 顶部加入强制防御回溯：`scrollElement = scrollElement.closest(".sw__scroll") || scrollElement`；
   - 在 `renderGroupedList` 中对 `createdMonth`、`notebook` 与 `loadRootNotebookMap` 的异步富化重排统一回溯至 `rootScroll`，彻底清除 `.sw__tab-preview` 二次嵌套隐患；
   - `_11-ui-polish.scss` 全面清除 `align-self: start`，更新为 `grid-row: 1 / -1; align-self: stretch; height: 100%; min-height: 100%; max-height: none;`；
   - 短文档空洞填充：遇到简短或空白文档时，完整保留文档标题头部与精致卡片提示，并在底部通过 `margin-top: auto` 锚定文档元信息栏（估算字数、块数量）与双快捷操作（`复制块引用 📋`、`复制超链接 🔗`），同时在 `loadDocPreview` 中正确写入 `pane.dataset.rootId = rootId`，保证一键复制即时可用。

2. **多类型 CSS 专属聚焦预览系统 (Category-Targeted Hero Showcases)**：
   - `createSnippetPreview`、`buildSnippetPreviewDocument` 与 `buildSceneBody` 贯通 `category` 类别参数与 `analyzeCssCoverage` 正则特征分析；
   - **大纲树 (Outline)**：挂载带 `--indent: 0~3` 的多级对齐节点、展开/折叠三角微图标与彩虹虚线对齐演示区；
   - **代码块 (CodeBlock)**：挂载真实 macOS 终端红黄绿圆点控制钮、右上角语言标识、行内代码与语法高亮 token 演示区；
   - **提示块与引述 (Callout/Quote)**：挂载微质感 Bento 柔彩微底提示卡片与标准引述边条对照演示区；
   - **折叠标题 (Fold/Heading)**：挂载带平滑旋转微箭头（-90° 折叠态）、微光下划线与展开标题对比演示区；
   - **表格 (Table)**：挂载多行交替斑马纹底色、沉浸表头与紧凑单元格内边距演示区；
   - **段落聚焦 (Focus)**：挂载编辑中呼吸高亮主色边条（支持 `tabindex="0" autofocus`、`:focus-within` 与 `.is-focused`）与失焦正常排版双行对照区；
   - **标签徽标 (Tag)**：挂载圆角微底彩色标签、强调胶囊与未读计数演示区。

## 验证与预算
- `dist/index.js` = `1,333,588 B`（上限 `1308 KiB` = `1,339,392 B`，余量 `5,804 B`）；
- `package.zip` = `710,036 B`（上限 `696 KiB` = `712,704 B`，余量 `2,668 B >= 2000 B`）；
- `dist/index.js` 压缩后 `359,801 B`（上限 `362 KiB` = `370,688 B`，余量 `10,887 B`）；
- 编写专项契约与负向测试 `tests/t7833-preview-enhancement-and-height-extension.test.cjs`。
