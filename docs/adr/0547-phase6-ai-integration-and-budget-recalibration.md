# ADR 0547: AI 全面接入、切片智能编织与包体预算再校准

- **状态**：accepted
- **日期**：2026-11-03
- **关联任务**：`TASK-20261103-phase6-ai-integration-and-command-center`
- **关联 ADR**：ADR 0546（小驴罗盘顶栏收敛）、ADR 0545（全生态统一通知系统与联合灾备）

---

## 1. 背景与目标

在小驴全生态 Epoch 7 Phase 6 改造战役中，雷切全面接入全生态统一 AI 网关（`lvAi`）与今日作战大盘基础设施（Protocol v1.5.0）：
1. **单切片 AI 精炼**：在连续切片暂存栈中，为每张切片装配【AI 精炼】能力，调用统一网关秒级提炼核心要点（`keyFragment`）与行动项（`actionFragment`）；
2. **多切片智能编织合成**：一键将暂存栈中的多段零散切片笔记融会贯通，由大模型整合成逻辑严整、结构清晰的专题笔记并一键导出/复制；
3. **外部极速穿透直达**：通过罗盘总线 `lvLaunchpad.executeAction` 支持 Quicker 等外部工具穿透调用双栏、三栏、切片暂存与智能编织；
4. **全生态今日作战大盘**：提供量化指标获取接口 `lvActivity.getDailyStats()`，实时聚合全家桶产出。

---

## 2. 生产落地与技术选型

1. **标准核心库接入**：升级至 `src/libs/lv-notice-kit.ts` (Protocol v1.5.0)，具备 `getDailyStats` 与 `executeAction`；
2. **暂存栈 UI 双重 AI 赋能**：
   - 卡片操作条挂载 `ai-refine` 按钮，点击即时触发精炼并将结果写回核心分片；
   - 组装操作区挂载 `ai-synthesize` 按钮，一键融汇全部切片生成专题长文；
3. **主类行动调度增强**：`handleQuickAction` 具备模糊匹配与容错自愈，完整承接双栏、三栏、切片、捕获与编织等二级行动。

---

## 3. 包体预算再校准

引入大模型切片精炼与专题编织合成管线后，生产产物如下：
- `dist/index.js`: 1,372,615 B（约 1340.5 KiB）
- `package.zip`: 734,251 B（约 717.0 KiB）
- `compressed index.js`: 372,486 B（约 363.8 KiB）

校准自律线：
- `RAW_BUNDLE_BUDGET_BYTES`: 由 1340 KiB -> 1346 KiB（1,378,304 B，留有 5,689 B >= 2000 B 健康余量）；
- `ARCHIVE_BUDGET_BYTES`: 由 718 KiB -> 720 KiB（737,280 B，留有 3,029 B >= 2000 B 健康余量）；
- `COMPRESSED_ENTRY_BUDGET_BYTES`: 由 372 KiB -> 374 KiB（382,976 B，留有 10,490 B 健康余量）；
- `RAW_BUNDLE_BUDGET_ADR`: 钉为 `"0547"`。
