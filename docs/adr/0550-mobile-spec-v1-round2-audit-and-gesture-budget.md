# 0550. 手机端第二轮优化 · 真机教训审计、双球共存避让与切片手势深化预算再校准

- **日期**：2026-11-04
- **状态**：accepted
- **相关任务**：T-7864
- **驱动**：根据手机端真机实测教训，完成 Esc-only 关闭面补齐 ✕ 按钮、悬浮球焦点卡死动态 activeElement 重算、svgIcon 逐字一致性、双球位置避让监听与暂存栈左右切片/下滑 60px 关闭手势深化，包体产生约 4.5 KiB 真实功能增量，按发版与包体自律规范执行产物核验与门限再校准。

## 1. 产物物理度量

经两次无差异可复现构建（`reproducible-build-audit`）及 `readiness-snapshot` 采集，度量如下：

- **未压缩生产主入口**（`dist/index.js`）：`1,412,979` 字节（约 1379.8 KiB）；
- **发行归档压缩包**（`package.zip`）：`746,281` 字节（约 728.8 KiB）；
- **归档内 index.js 压缩条目**：`383,474` 字节（约 374.5 KiB）；
- **样式产物**（`dist/index.css`）：`647,816` 字节（约 632.6 KiB）。

## 2. 增量归因与死重审计

1. **增量来源**：
   - 核心 Dialog 显式装配 `mountPlatformDialogMobileClose`（≥44px 触控目标、`touch-action: manipulation`），解决移动端无物理 Esc 键且原生 Dialog 无关闭按钮的被困通病；
   - 悬浮球引入动态 `isFocused` 与 `recalculateActivityState`，防止子节点移除时 focusout 丢失导致状态永久卡死；
   - `CARD_ICON_SPRITE` 注入 `icon-lv-raikiri` 矢量图标，与 `lvLaunchpad.register` 逐字对齐；
   - 双球共存监听 `lv:launchpad:ball-moved`，重叠 <60px 自动上下错开 80px；
   - 暂存栈卡片水平滑动切换上一片/下一片（6ms 触感 + 标题短暂高亮）与下滑 60px 关闭手势。
2. **死重审计**：
   - 无新增外部依赖；
   - 所有新增手势与监听器均具备被动事件（passive: true）与 `onunload` 幂等清理。

## 3. 门禁预算校准

按 ≥2000 B 安全余量准则微调门限：

| 指标 | 原门限 (ADR 0549) | 实际值 (T-7864) | 新门禁 (ADR 0550) | 余量 |
| :--- | :--- | :--- | :--- | :--- |
| `RAW_BUNDLE_BUDGET_BYTES` | 1380 KiB (1,413,120 B) | 1,428,943 B | **1400 KiB** (1,433,600 B) | +4,657 B |
| `ARCHIVE_BUDGET_BYTES` | 730 KiB (747,520 B) | 750,823 B | **736 KiB** (753,664 B) | +2,841 B |
| `COMPRESSED_ENTRY_BUDGET_BYTES` | 386 KiB (395,264 B) | 387,836 B | **392 KiB** (401,408 B) | +13,572 B |

## 4. 影响与后续

- 更新 `scripts/release-readiness-metrics.cjs`；
- 执行 `readiness-snapshot.cjs` 更新 `docs/release-readiness.md`；
- 本地打包封验，严格离线不 push，不执行 GitHub 发版，等待用户确认后推进。
