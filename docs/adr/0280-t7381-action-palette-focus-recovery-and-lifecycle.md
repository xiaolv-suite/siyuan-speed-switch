# ADR 0280：T-7381 动作画板焦点精准恢复与全表面 v0.48.23 闭环

日期：2026-10-24  
状态：accepted  
任务：T-7381  

## 背景

在第一面板（切换器）卡片与文档搜索结果项中使用次级动作画板（`⌘K` / `Ctrl+K` 唤出）时，审计发现了以下键盘焦点流断层：
1. 用户在卡片上按 `⌘K` 唤出动作画板，执行复制块超链或按 `Escape` 取消画板；
2. 画板 `dispose` 后从 DOM 中移除遮罩，但此时键盘焦点未返还给原卡片或文档结果行；
3. 焦点丢失至 `document.body`，用户后续敲击方向键或数字键均告失效，必须使用鼠标重新点击才能恢复键盘流。

## 决策

1. **`action-palette-ui` 注入 `returnFocusElement` 焦点恢复机制**：
   - 在 `closePalette` 执行时，若配置了 `returnFocusElement`，安全自动回焦至原目标元素，杜绝焦点漂移；
2. **切换器卡片与文档项双重焦点恢复守卫**：
   - `openCardActionPalette`：在 `closeOverlay` 中安全回焦至触发卡片 `card`，并将 `card` 透传至 `mountActionPalette` 的 `returnFocusElement`；
   - `openActionPaletteForDoc`：在 `closeOverlay` 中安全回焦至文档条目 `item`，并将 `item` 透传至 `mountActionPalette` 的 `returnFocusElement`；
3. **版本号晋级（v0.48.23）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.23`。

## 证据与验证

1. **专项契约测试**：`tests/action-palette-focus-recovery-and-lifecycle.test.cjs` 4/4 通过（含卡片与文档条目焦点双重恢复守卫与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
