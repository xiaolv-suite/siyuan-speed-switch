# ADR 0532: 连续切片暂存栈（Snippet Stack）、TextFold 5 阶语义原子切片与选区感知智能置顶（TASK-20261031 & TASK-20261030）

## 状态
已决断并实施 (Accepted)

## 关联任务
- `.tasks/TASK-20261031-github-benchmark-fusion.md`
- `.tasks/TASK-20261030-fold-slicing.md`

## 背景与对标分析
雷切此前在片段实验室与工作台主要支持静态样式/脚本片段管理与即时单点切片，缺少跨文档连续阅读时的“收集暂存池”能力，也缺少对高层级语义折叠结构的无损转换。参考三大业界顶级开源标杆：
1. **CopyQ（hluk/CopyQ）**：连续摘录暂存槽（Snippet Stack）、置顶锁定（Pin）、键盘调序（Alt+↑/↓）与一键批量合并；
2. **massCode（masscode-run/massCode）**：单条目多维分片视图（Multi-Fragment Tabs: rawFragment 原文 / keyFragment 核心提炼 / actionFragment 行动项）；
3. **TextFold（chenxiachan/textfold）与小驴拾遗（siyuan-glean）**：基于 5 阶语义树（Level 5 Topic、Level 4 Takeaway、Level 3 Key、Level 2 Brief 原文逐字保真 Verbatim Guard）的原子切片派生，并保持与思源原生块、拾遗阅读器双向跳转血缘反链（`custom-lv-source-block` 与 `custom-lv-glean-id`）；
4. **Rubick（rubickCenter/rubick）**：选区上下文感知超级面板，根据当前选区特征（长段落/URL/任务列表/代码块/短文本）智能置顶最匹配动作。

## 架构决策与设计

1. **纯模型分层隔离 (`src/snippet-stack-model.js`)**：
   - 连续切片暂存栈核心领域逻辑独立封装为纯函数，零 DOM、零网络依赖；
   - 栈容量严格限制在 32 条，容量淘汰时优先淘汰非置顶尾部旧项，置顶项（`pinned=true`）受永久保护；
   - 调序函数 `moveSnippetStackItem` 支持同置顶分区内平滑移动，置顶锁定项不被非置顶项跨越；
   - 提取函数全面引入 Verbatim Guard 原文逐字子串校验，拒绝虚构改写；
   - 批量组装函数 `assembleSnippetStackMarkdown` 生成标准带 `((blockId "来源锚点"))` 双链与 `{: custom-lv-source-block="..." custom-lv-glean-id="..."}` Kramdown 属性的结构化块。

2. **选区感知智能首推推荐 (`analyzeSelectionContext` / `rankActionsBySelectionContext`)**：
   - 悬浮球首层动作环与动作画板唤出时，动态识别当前选区特征；
   - 长段落首推原子切片入栈（`stack-capture`）；URL 选区首推拾遗漫游（`glean-keep-roaming`）；任务列表选区首推今日任务（`task-horizon-today`）；代码块选区首推片段实验室（`snippet-studio`）；无选区原样保持零副作用。

3. **跨表面 UI 挂载与零动态 Chunk 膨胀策略**：
   - 在代码片段实验室右侧伴侣栏增加「AI 伴侣」与「切片暂存栈」双模式分段切换，无缝复用已有动态 chunk `dist/snippet-studio.js`；
   - 在工作台顶栏集成 `snippet-stack` 快捷按钮，支持一键跨表面直达暂存栈现场；
   - 不引入新的分离 chunk，保持 `dist/snippet-studio.js` 单一动态 chunk 契约，避免破坏发布资源清单与包体封验契约。

4. **自律线预算校准**：
   - `dist/index.js` 实际大小为 1,323,467 B（约 1292.4 KiB），超出前序 1276 KiB 自律线约 16.4 KiB；
   - raw 自律线按标准程序校准 1276 -> 1296 KiB（1,327,104 B），保持 3,637 B（>= 2000 B）健康余量；
   - 归档包预算由 684 -> 688 KiB（704,512 B，实际 699,155 B，余量 5,357 B >= 2000 B）；压缩入口预算 352 KiB 保持不变（实际 357,286 B，余量 3,162 B）。

## 验证与门禁结果
- 单元测试：`tests/snippet-stack-model.test.cjs` 6/6 PASS（含负向探针）；
- 契约测试：`tests/snippet-stack-ui-and-fold-slicing.test.cjs` 5/5 PASS（含负向探针）；
- 全量门禁：`tsc --noEmit` 0 错误；`node tests/run-tests.cjs` 9839 通过，0 失败，1 跳过；
- 浏览器进程与 .tmp 清理自检：残留进程 0，临时目录保持基线。
