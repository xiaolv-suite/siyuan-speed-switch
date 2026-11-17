# ADR 0290：T-7391 小组件商店搜索框键盘流直达（Enter/Down 键首卡直达、Esc 清空）(v0.48.33)

日期：2026-10-27  
状态：accepted  
任务：T-7391  

## 背景

小组件商店（Home Widget Store）作为第二面板小组件的浏览与发现中心，具备完善的分类筛选与搜索框。
在键盘用户与无障碍深度体验排查中，发现以下微交互断层：
1. **输入搜索词后无法通过键盘直接选择结果**：
   - 用户在搜索框内键入关键词（如“时钟”、“打卡”、“天气”）后，按 `Enter` 回车或 `ArrowDown` 下方向键无任何动作响应；用户必须切换到鼠标去点击左侧目录卡片；
2. **`Escape` 键在有输入时不宜直接关闭整个商店**：
   - 用户在输入搜索词后，习惯按 `Escape` 先撤销清空搜索内容，若直接关闭整个商店对话框则会造成操作意外中断。

## 决策

1. **搜索框输入监听集成首卡直达（`Enter` / `ArrowDown`）**：
   - 在 `home-store-ui.ts` 与 `home-store-ui.js` 中，监听键盘事件；
   - 当用户在非输入法合成态下按下 `ArrowDown` 或 `Enter` 时，自动在 `catalogPane` 检索第一张未隐藏的可见卡片（`.sw-home-store__card:not(.fn__none)`）；
   - 执行 `firstCard.focus({preventScroll: true})` 并触发平滑滚动（`firstCard.scrollIntoView({block: "nearest"})`），使用户可以直接继续使用方向键或回车进行选择/预览；
2. **`Escape` 分级清空**：
   - 存在输入时，按 `Escape` 优先清空搜索并保持商店打开与输入框聚焦；
3. **版本号晋级（v0.48.33）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.33`。

## 证据与验证

1. **专项契约测试**：`tests/home-store-keyboard-navigation.test.cjs` 3/3 通过（含 Enter/Down 键直达、Esc 清空与真实负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
