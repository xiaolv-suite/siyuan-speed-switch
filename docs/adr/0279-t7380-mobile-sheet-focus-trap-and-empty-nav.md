# ADR 0279：T-7380 移动端 Sheet 焦点循环闭环与搜索输入框空态直达 (v0.48.22)

日期：2026-10-24  
状态：accepted  
任务：T-7380  

## 背景

在移动端切换器与搜索输入框全流程体验审计中，发现了以下微交互断层：
1. **移动端分组动作 Sheet 焦点逃逸（Focus Leak）与首焦错位**：
   - 在移动端长按分组卡片呼出操作底栏（`openMobileGroupActions`）时，未对键盘 `Tab` 键进行循环约束，导致外接键盘用户按 Tab 会逃逸出 Sheet 激活背后的遮罩层控件；
   - 呼出时默认聚焦于“X关闭按钮”（`.sw__mobile-sheet-close`），导致用户需要多次按键才能选中核心业务动作（“打开该组所有页签”）；
2. **搜索输入框向下导航在空态时中断**：
   - 当切换器处于无打开页签状态（首屏呈现零词条工作台或操作引导）时，在输入框按 `ArrowDown` 无法命中工作台预设瓦片或空态动作按钮。

## 决策

1. **移动端动作 Sheet 严格焦点陷阱（Focus Trap）与业务首焦**：
   - 在 `openMobileGroupActions` 中接入严格的 `Tab` / `Shift+Tab` 键循环约束，阻止焦点逃逸；
   - 呼出后优先聚焦业务操作首项（`body.querySelector("button")`），支持外接键盘一键 Enter 快速打开全组页签；
2. **搜索框向下导航扩展至空态工作台与操作引导**：
   - 在 `bindSearchInputComposition` 的 `ArrowDown` 候选链中扩展 `.sw__workbench-tile`、`.sw__doc-empty-action` 与 `.sw__platform-guide-action`，确保在无页签或空搜索态下键盘直达依然无缝顺畅；
3. **版本号晋级（v0.48.22）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.22`。

## 证据与验证

1. **专项契约测试**：`tests/mobile-sheet-focus-and-empty-nav.test.cjs` 4/4 通过（含 Tab 循环约束、业务首焦、空态直达与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
