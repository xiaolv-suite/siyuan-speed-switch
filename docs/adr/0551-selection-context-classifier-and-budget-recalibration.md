# 0551. 选区上下文纯函数分类器（Selection Context Classifier）与生态动作智能置顶预算再校准

- **日期**：2026-11-05
- **状态**：accepted
- **相关任务**：T-7866
- **驱动**：落实「断点消除战役」之 Selection Context Classifier，构建零 DOM/零网络纯函数分类器，智能识别 url / code / concept / general 四类划选特征，在悬浮球首层与次级动作画板中将「🔖 收录拾遗」「🔤 存入常用」「🎴 生成闪卡」「✂️ 切入暂存栈」生态动作智能置顶第 1 位并加「⚡ 推荐」微光标；支持目标插件未安装置灰与调用失败静默复制降级；新增功能引起包体轻微增长，按发版规范执行产物核验与预算门限再校准。

## 1. 产物物理度量

经两次无差异可复现构建（`reproducible-build-audit`）及 `readiness-snapshot` 采集，度量如下：

- **未压缩生产主入口**（`dist/index.js`）：`1,437,502` 字节（约 1403.8 KiB）；
- **发行归档压缩包**（`package.zip`）：`754,011` 字节（约 736.3 KiB）；
- **归档内 index.js 压缩条目**：`390,720` 字节（约 381.6 KiB）；
- **样式产物**（`dist/index.css`）：`649,318` 字节（约 634.1 KiB）。

## 2. 增量归因与死重审计

1. **增量来源**：
   - 新增 `src/selection-context-classifier.js` 纯函数模块，实现单行 URL 正则、多行代码语法密度、6~120 字概念定义标点与通用文本分级判定算法；
   - 动作画板与悬浮球动作列表动态集成 `rankActionsWithSelectionPromotion`，智能置顶首位并加挂微标；
   - 悬浮球执行器与画板执行器新增跨插件动作调用（拾遗/常用/闪卡/暂存），并实现未安装插件置灰与调用失败自动降级为复制选区 + 微胶囊提示；
   - 补充专用样式 `.sw__palette-item-badge--recommend` 与 `.sw__floating-ball-action.is-recommended`；
   - 补充全套单测 `tests/selection-context-classifier.test.cjs`。
2. **死重审计**：
   - 零新增第三方 npm 依赖，分类器与排序逻辑纯函数无副作用；
   - 降级逻辑与剪贴板回退完全复用既有离线工具。

## 3. 门禁预算校准

按 ≥2000 B 安全余量准则微调门限：

| 指标 | 原门限 (ADR 0550) | 实际值 (T-7866) | 新门禁 (ADR 0551) | 余量 |
| :--- | :--- | :--- | :--- | :--- |
| `RAW_BUNDLE_BUDGET_BYTES` | 1400 KiB (1,433,600 B) | 1,437,502 B | **1408 KiB** (1,441,792 B) | +4,290 B |
| `ARCHIVE_BUDGET_BYTES` | 736 KiB (753,664 B) | 754,011 B | **740 KiB** (757,760 B) | +3,749 B |
| `COMPRESSED_ENTRY_BUDGET_BYTES` | 392 KiB (401,408 B) | 390,720 B | **394 KiB** (403,456 B) | +12,736 B |

## 4. 影响与后续

- 更新 `scripts/release-readiness-metrics.cjs`；
- 执行 `readiness-snapshot.cjs` 更新 `docs/release-readiness.md`；
- 本地打包封验，严格离线不 push，不执行 GitHub 发版，等待用户确认后推进。
