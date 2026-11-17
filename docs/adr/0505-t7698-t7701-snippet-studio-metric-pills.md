# ADR 0505：代码片段实验室微胶囊指标条与双向过滤联动（T-7698~T-7701）

## 背景与诉求

在统一多表面（切换器、工作台、片段实验室）现代化外壳演进中，第三面板（代码片段实验室 Snippet Studio）顶栏原本仅承载单薄的状态文字，缺乏全局资产概览：
- 用户进入实验室时，无法即时感知库中已注册片段总数、启用率以及 CSS 与 JS 的结构分布；
- 左侧目录虽然具备单项类型过滤按钮，但缺少顶栏维度的全局状态互锁联动；
- 指标胶囊需服从统一的工业质感：999px 全圆角软胶囊、等宽数字排版（`tabular-nums`）、青绿数据语义色（`.is-data-accent`），并在小屏或窄容器（<= 640px）下优雅自动隐藏，绝不挤压核心操作区。

## 架构决策与设计

1. **片段统计纯函数模型（T-7698）**：
   - 在 `src/snippet-studio-model.js` 中声明纯函数 `calculateSnippetStats(snippets)`，实时统计 `total`、`enabled`、`cssCount`、`jsCount`，输入异常安全兜底；
   - 声明 `buildSnippetMetricPills(stats, labels)`，构造 `all`、`enabled`、`css`、`js` 四项微胶囊数据契约，其中 `enabled` 明确标注 `isDataAccent: true`。

2. **顶栏挂载与双向联动（T-7699）**：
   - 在 `src/snippet-studio-ui.js` 的 `titleLine` 区域常驻追加 `<div class="sw-studio__metrics-pills" role="toolbar">`；
   - 在 `renderLibrary` 每次数据流转时触发 `updateMetricsPills` 刷新；
   - 过滤联动互锁：
     - 点击指标胶囊直接驱动 `libraryFilter`（`all` / `enabled` / `css` / `js`），并执行 `renderLibrary()`；
     - 扩展 `renderLibrary` 支持 `libraryFilter === "enabled"` 精确过滤所有已启用的片段；
     - 左侧分类按钮切换时，顶栏微胶囊激活态同步高亮。

3. **微胶囊样式与响应式折叠（T-7700）**：
   - 在 `src/styles/_snippet-studio.scss` 中声明 `.sw-studio__metrics-pills` 与 `.sw-studio__metric-pill`；
   - 锁定数字排版为 `font-variant-numeric: tabular-nums`，消除数字晃动；
   - 悬浮微抬升 `-0.5px`，点击轻触缩放 `scale(0.97)`，聚焦呈现 `--sw-focus-glow`；
   - `@media (max-width: 640px)` 下声明 `display: none !important` 优雅自适应。

4. **契约测试与负向验证（T-7701）**：
   - 新增专项测试 `tests/snippet-studio-metrics-and-filter-contract.test.cjs`；
   - 注入破坏性负向验证探针：当已启用胶囊数据语义色丢失或等宽数字约束被破坏时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-metrics-and-filter-contract.test.cjs` 4/4 PASS（含负向探针）；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
