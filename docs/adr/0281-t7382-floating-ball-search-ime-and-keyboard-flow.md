# ADR 0281：T-7382 悬浮球更多面板搜索框 IME 守卫、键盘流直达与全表面 v0.48.24 闭环

日期：2026-10-24  
状态：accepted  
任务：T-7382  

## 背景

在悬浮球（Floating Ball）展开的更多动作面板（More Drawer Panel）交互审计中，发现了以下关键输入体验断层：
1. **中文输入法（IME）合成冲突与误关闭**：
   - 更多面板搜索框 `searchInput` 缺少 `compositionstart` / `compositionend` 状态管理，拼音字母中间态高频触发全列表重滤；
   - 用户在输入框打拼音过程中按 `Escape` 试图撤销候选窗口时，事件冒泡至 `container` 的 `handleKeydown`，直接误触发了 `closeMore()`，导致整个更多面板意外关闭；
2. **键盘流断层**：
   - 搜索框中按 `ArrowDown` 无法向下导航到首个可见动作项；
   - 搜索框中按 `Enter` 无法直接运行首个匹配动作，必须用鼠标点击。

## 决策

1. **输入法（IME）合成管理与防误关守卫**：
   - `searchInput` 接入 `compositionstart` 与 `compositionend` 状态监听，中间态阻断 `filterRows`；
   - `handleKeydown` 头部注入 `if (event.isComposing || event.keyCode === 229) return;` 保护，杜绝输入法撤销时误关闭面板；
2. **Escape 键分级响应**：
   - 优先清空输入框内容（`searchInput.value = ""` 并重刷完整列表），阻止面板关闭；第二下 Escape 才关闭抽屉；
3. **`ArrowDown` 与 `Enter` 键盘流直达**：
   - 按 `ArrowDown`：平滑聚焦首个可见动作项按钮；
   - 按 `Enter`：一键触发首个可见动作项点击执行；
4. **版本号晋级（v0.48.24）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.24`。

## 证据与验证

1. **专项契约测试**：`tests/floating-ball-search-ime-and-keyboard-flow.test.cjs` 5/5 通过（含 IME 状态、防误关、Escape 分级、键盘直达与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
