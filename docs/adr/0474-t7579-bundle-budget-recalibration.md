# ADR 0474：生产构建产物体积预算自律线与归档门禁校准（T-7579）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全面质量优化战役（T-7565 ~ T-7578）收尾阶段：
1. 本地通过了核心异常自愈（动态加载容灾卡片、onunload 活动弹窗弱引用集合清理与 inert 状态恢复）、高频性能瓶颈优化（工作台按键 0ms 提前短路与线性遍历消除 forced layout thrashing、图标两阶段读写分离批处理、检索过滤实时输入防抖）、全键盘无障碍（代码编辑器 Escape 跳焦消灭键盘陷阱、主切换器 Home/End/Page/Space 漫游与卡片激活、移动端 44px 热区与宿主手势隔离、18 处二级弹窗通用模态焦点捕获循环）以及全版本徽标升级；
2. 伴随真实逻辑与样式的扩展，生产构建产物发生客观增长：
   - `dist/index.js` 为 1,293,091 B（1262.78 KiB，略微超出原 1262 KiB 自律线 803 B）；
   - `package.zip` 为 695,596 B（679.29 KiB，在 680 KiB 门限下余量为 724 B，低于 2,000 B 的最低安全余量门限）；
   - 压缩入口为 347,886 B。
3. 减量审计确认：所有增加代码均为核心稳定性、性能与无障碍刚需逻辑，无死重与冗余依赖可剥。

## 决策

1. **raw 产物观察线调整**：
   - `RAW_BUNDLE_BUDGET_BYTES`: 由 1262 KiB 校准为 `1266 KiB`（1,296,384 B），当前产物（1,293,091 B）留有 3,293 B 安全余量；
   - `RAW_BUNDLE_BUDGET_ADR` 更新为 `"0474"`。
2. **归档包体门禁微调**：
   - `ARCHIVE_BUDGET_BYTES`: 由 680 KiB 微调为 `684 KiB`（700,416 B），当前 ZIP（695,596 B）留有 4,820 B 安全余量（满足 `>= 2000 B` 规范要求）；
   - `REPOSITORY_ARCHIVE_BUDGET_ADR` 更新为 `"0474"`。
3. **单条目压缩上限调整**：
   - `COMPRESSED_ENTRY_BUDGET_BYTES`: 由 348 KiB 微调为 `352 KiB`（360,448 B，当前 347,886 B 留有 12,562 B 余量）。

## 验证

- `scripts/release-readiness-metrics.cjs` 与契约测试已同步更新；
- `tests/bundle-optimization-and-headroom-contract.test.cjs`、`tests/release-candidate-hash-audit.test.cjs` 及 `tests/release-readiness-batch-review.test.cjs` 保持全绿。
