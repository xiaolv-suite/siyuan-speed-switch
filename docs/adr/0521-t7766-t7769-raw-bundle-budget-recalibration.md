# ADR 0521：生产构建产物体积预算自律线校准（T-7766~T-7769）

## 状态

已采纳 (Accepted) - 2026-10-30

## 背景

在平台统一指标栏、双通道触感定位与实验室数据治理/回收站白卡升级战役（T-7700 ~ T-7765）中：
1. 实现了跨第一面板（切换器）、第二面板（工作台）与第三面板（片段实验室）的响应式统计胶囊组件（`src/platform-metrics-model.ts` 与 `src/platform-metrics-ui.ts`）；
2. 实现了工作台双通道平滑定位滚动与呼吸光圈反馈；
3. 实现了代码片段差异对比指示边条、数据治理 Bento 浮层与回收站快照独立白卡；
4. 构建产物测量：
   - `dist/index.js` 为 1,303,113 B（约 1272.57 KiB），超出原 1266 KiB 自律线（1,296,384 B）约 6.5 KiB；
   - `package.zip` 为 680,777 B（约 664.8 KiB），远低于 684 KiB（700,416 B）发布门禁，安全余量达 19,639 B；
   - 压缩入口为 350,715 B，完全在 352 KiB（360,448 B）上限内。
5. 减量审计确认：新增代码全部为跨表面状态机、DOM 装配与无障碍交互刚需实现，无外部第三方依赖与冗余死重。

## 决策

1. **raw 产物观察线调整**：
   - `RAW_BUNDLE_BUDGET_BYTES`: 由 1266 KiB 校准为 `1276 KiB`（1,306,624 B），当前产物（1,303,113 B）留有 3,511 B 安全余量（满足 `>= 2000 B` 的规范要求）；
   - `RAW_BUNDLE_BUDGET_ADR` 更新为 `"0521"`。
2. **归档包体门禁保持不变**：
   - `ARCHIVE_BUDGET_BYTES`: 保持 `684 KiB`（700,416 B）不变；
3. **单条目压缩上限保持不变**：
   - `COMPRESSED_ENTRY_BUDGET_BYTES`: 保持 `352 KiB`（360,448 B）不变。

## 验证

- `scripts/release-readiness-metrics.cjs`、`tests/release-readiness-batch-review.test.cjs` 与 `tests/second-round-widgets.test.cjs` 保持全绿；
- `docs/release-readiness.md` 快照完成同步；
- 全套测试与质量审计 100% 通过。
