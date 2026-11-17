# ADR 0517：日历标记点极光青绿数据语义色、连击待办大数字等宽字形（T-7750~T-7753）

## 背景与诉求

工作台（Workbench，第二面板）汇聚了日历、连击、待办等高频信息卡片：
- 六周日历组件（`journal-calendar`）中的日记标记点（`.sw__home-calendar-marker`）此前使用普通主题色，未能与参考图两色分工标准中的正向数据语义色（`--sw-color-data`）对齐，且悬停时缺少微光呼吸反馈；
- 写作连击（`writing-streak`）、习惯连击（`checkin-streak`）与今日任务（`today-tasks`）的大数字未显式声明 `font-variant-numeric: tabular-nums`，在数字跳变或更新时存在字符抖动；
- 打卡与任务双拼 Bento 瓦片的主数字未充分融合数据语义色。

## 架构决策与设计

1. **日历标记点极光青绿数据语义色与悬浮微光（T-7750）**：
   - 在 `src/styles/_09-store-preview-polish.scss` 中将 `.sw__home-calendar-marker` 背景接入 `var(--sw-color-data, var(--sw-home-accent, var(--b3-theme-primary)))`；
   - 保持 4px 真实物理尺寸不变，在单元格 hover 与聚焦时注入 `transform: translateX(-50%) scale(1.25);` 与弥散微光阴影。

2. **连击与待办大数字等宽字形防抖动（T-7751）**：
   - 在 `src/styles/_08-home-store-cards.scss` 中为 `checkin-streak`、`writing-streak`、`checkin-today` 与 `today-tasks` 的大数字 `.sw__home-stat-value` 显式锁定 `font-variant-numeric: tabular-nums;`；
   - 杜绝数字动态跳变引起的界面排版微抖动。

3. **打卡与任务双拼 Bento 瓦片数据语义色柔和融合（T-7752）**：
   - 将 `today-tasks` 与 `checkin-today` 大数字前景色升级为 `var(--sw-color-data, #7c68d5)`，与顶栏指标栏的数据语义色保持全局呼应。

4. **契约测试与负向验证（T-7753）**：
   - 新增专项测试 `tests/calendar-marker-and-stat-hero-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当日历标记点丢失数据语义色或大数字丢失等宽排版时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/calendar-marker-and-stat-hero-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 16 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
