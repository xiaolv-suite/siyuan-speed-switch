# 架构决策记录 0492：T-7646~T-7649 5项 UI 待办全面收口、控件网格对齐与光学基线闭环

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7646, T-7647, T-7648, T-7649
- **参与者**：小驴开发团队、视觉与感知层精度收口治理

---

## 一、 背景与动因

在完成全入口功能可用性与真实执行排查后，上一轮整理了 5 项独立的 UI 待办事项（UI-01~UI-05），针对控件高度对齐、光学基线、动效曲线与深色微反光等微观质感：
1. **UI-01（设置页收藏按钮高度）**：行内重命名编辑框与操作按钮存在 2px 视觉高度差；
2. **UI-02（天气小组件单位基线）**：气温数字与右侧摄氏度符号基线沉降，缺少上标感；
3. **UI-03（折叠三角非对称动效）**：分类折叠箭头展开收起使用常规线性 ease，缺少干脆的物理感；
4. **UI-04（快速日记下拉框留白）**：笔记本下拉框内边距过紧（6px），在高分屏下文字略贴边；
5. **UI-05（悬浮球按钮深色微反光）**：更多面板管理按钮在深色悬浮态分界线偏弱。

---

## 二、 架构决策与落地实现

### 1. T-7646 控件高度网格与下拉框 8px 舒适留白（A 档）
- 修复 UI-01：`src/styles/_02-settings.scss` 中的 `.sw-setting__fav-control` 统一显式声明 `min-height: var(--sw-control-h-md, 26px);` 与 `inline-flex` 垂直居中，消除高度差；
- 修复 UI-04：`src/styles/_03-switcher-mobile.scss` 中的 `.sw-journal-prompt__sel select` 统一注入 `padding: var(--sw-space-md, 8px) 10px;` 与 8px 圆角。

### 2. T-7647 天气单位光学上标基线校准（A 档）
- 修复 UI-02：`src/styles/_05-settings-widgets.scss` 中气温大字内部声明 `sup, .sw__unit { font-size: 0.6em; vertical-align: super; margin-left: 2px; }`，实现摄氏度符号与数字顶部的光学齐平。

### 3. T-7648 非对称物理动效与深色微反光切边（A 档）
- 修复 UI-03：`src/styles/_02-settings.scss` 折叠箭头过渡声明 `transition: transform $sw-dur-base var(--sw-ease-out-back, $sw-ease);`；
- 修复 UI-05：`src/styles/_floating-ball-more.scss` 管理按钮悬浮态补齐 `box-shadow: var(--sw-rim-light, inset 0 1px 0 0 rgba(255, 255, 255, 0.1)), var(--sw-shadow-xs);`。

### 4. T-7649 契约测试与破坏性负向探针验证
- 新增专项测试 `tests/ui-backlog-closure-contract.test.cjs`；
- 破坏性负向探针验证日记下拉框零内边距违规报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/ui-backlog-closure-contract.test.cjs` 4/4 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
