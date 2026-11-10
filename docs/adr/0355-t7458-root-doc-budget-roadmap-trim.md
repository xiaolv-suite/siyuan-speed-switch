# ADR 0355：T-7458 根目录文档预算治理与历史账本精简（ROADMAP.md 瘦身回落）

## 背景与动机

小驴雷切根目录建立了严格的文档预算与归档治理门禁（ADR 0051 / `tests/root-doc-budget.test.cjs`）：
1. 根目录 Markdown 文件数量上限为 11；
2. 单个 Markdown 文件最大体积严格限制在 150 KiB（153,600 字节）以内；
3. 全部根目录文档总大小不超过 300 KiB（307,200 字节）。

随着近期连续完成数十个高质量特性交付（T-7393~T-7456），`ROADMAP.md` 顶部引言块不断追加历史阶段的长篇流水账，导致文件物理体积膨胀至 156,105 字节，超出 150 KiB 预算门限 2,505 字节，触发门禁精准红。

## 架构决策与实现

1. **历史账本归纳与指针治理**：
   - 遵循“历史任务由 `docs/archive/` 永久封存、当期开发由 `docs/dev-plan-*.md` 记录、对外演进由 `docs/CHANGELOG.md` 披露”的单一事实源原则；
   - 将 `ROADMAP.md` 顶部累赘的历史长篇流水摘要精简为高层里程碑索引与 ADR 指针引用；
   - 保证兼容历史测试 `tests/empty-syntax-polish-and-roadmap-outlook.test.cjs` 的演进基线断言（`v0.48.33` 与最新版本 `v0.48.55` 并存）。
2. **体积与预算实测**：
   - 精炼后 `ROADMAP.md` 物理大小从 156,105 字节降至 147,147 字节（143.7 KiB）；
   - 距离 150 KiB（153,600 字节）门禁线拥有 6,453 字节（约 6.3 KiB）安全余量；
   - 根目录总 Markdown 大小为 290,493 字节，完全处于 300 KiB 预算以内。

## 验证与证据

1. `tests/root-doc-budget.test.cjs`：4/4 满分全绿，单文件与总预算测试均通过；
2. `tests/empty-syntax-polish-and-roadmap-outlook.test.cjs`：4/4 满分全绿（含真实负向验证探针）。
