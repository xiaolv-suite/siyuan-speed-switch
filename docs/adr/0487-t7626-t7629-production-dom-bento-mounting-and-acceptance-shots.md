# 架构决策记录 0487：T-7626~T-7629 生产 DOM Bento 双层底色装配、深色重音卡实装与真实验收截图闭环

- **状态**：accepted
- **日期**：2026-10-29
- **任务**：T-7626, T-7627, T-7628, T-7629
- **参与者**：小驴开发团队、视觉与感知层自动化验收体系

---

## 一、 背景与动因

在完成设计语言抽象与令牌定义后，需要将“同族极浅底+纯白浮卡”、“深色对比重音块”、“近远复合双层柔影”真正装配到生产界面的 DOM 视口与样式渲染链中，并由真实 Chromium 驱动截图形成可检验的视觉对比证据：
1. **工作台生产视口底色挂载**：`.sw-home` 需显式消费 `--sw-bg-tinted` 极浅同族底色，使卡片在其上能够借助微明度差形成浮起层级；
2. **重点对比块实测装配**：为倒数日（`countdown`）与午夜卡片补齐深色对比重音块，支持钛黑深邃底色、36px 英雄位大字与高光数据青色点缀；
3. **真实 Chromium 验收截图自动化捕获**：覆盖三表面（切换器、工作台、片段实验室）在明暗模式、宽屏、极窄屏（420px）与移动端等全场景实录。

---

## 二、 架构决策与落地实现

### 1. T-7626 生产视口双层结构装配（A 档）
- `src/styles/_05-settings-widgets.scss`：`.sw-home` 显式声明 `background: var(--sw-bg-tinted, var(--sw-page-bg, var(--b3-theme-background)));`；
- `.sw-home__cell` 瓷贴卡片声明 `background: var(--sw-card-float-bg, var(--b3-theme-surface));` 与 `box-shadow: var(--sw-shadow-bento);`。

### 2. T-7627 倒数日深色重音块与主数据字号装配（A 档）
- 倒数日核心数字声明 `font-size: var(--sw-font-stat-hero, 36px); font-weight: 700; font-variant-numeric: tabular-nums;`；
- 支持 `is-hero-card` 深色对比块，底色采用 `--sw-card-accent-dark`（钛黑近黑），文字近白 `#f8fafc`，数据值接入极光青绿高光 `--sw-color-data`；
- 收敛 `_11-ui-polish.scss` 中午夜黑金卡字面阴影为 `--sw-shadow-bento`。

### 3. T-7628 真实 Chromium 验收截图捕获
- 运行 `node tests/capture-acceptance-screenshots.cjs`，完整生成 `acceptance-screenshots/` 下 9 组快照；
- 结合 `tests/chromium-style-smoke.cjs` 验证浅色（14.72:1）与深色（9.99:1）对比度指标。

### 4. T-7629 契约测试与破坏性负向探针
- 新增专项测试 `tests/production-dom-bento-mounting-contract.test.cjs`；
- 包含工作台底色死白破坏性探针拦截与 9 组截图完备性校验。

---

## 三、 验证与证据

- 专项契约测试 `node tests/production-dom-bento-mounting-contract.test.cjs` 5/5 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- 真实 Chromium 样式冒烟测试（Dark/Light 双主题）通过；
- 9 组全场景验收截图成功捕获并落盘 `acceptance-screenshots/`；
- `pnpm exec tsc --noEmit` 零类型错误；
- 可复现构建 3/3 核心产物一致。
