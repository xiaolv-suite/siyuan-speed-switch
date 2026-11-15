# 0548. 隔离真机 E2E 全方位审查、通知浮层栈 Esc 仲裁加固与缺陷闭环

- **日期**：2026-11-04
- **状态**：accepted
- **相关任务**：T-7860
- **驱动**：用户指令全面通过 `pnpm e2e:isolated` 对近期加入的各项功能、UI、交互进行全方位审查，审查修复潜在 Bug 并确保全绿。

## 1. 背景与核心根因

在近期完成了全生态统一规范（通知中心、写锁、AI活动流、灾备、罗盘、AI编织、穿透搜索等）全量接入后，通过执行 `pnpm e2e:isolated` 进行真实思源内核端到端全面走查，捕获到以下阻断与隐患：

1. **统一通知栈捕获阶段 Esc 劫持破坏全局模态关闭**：
   `src/libs/lv-notice-kit.ts` 在初始化时无条件向 `lvSurfaceStack` 压入 `lv-notice-active-card`，并在 window 的捕获阶段（`capture: true`）直接拦截 `Escape` 键。当页面存在任何通知（包含自动淡出的微胶囊 `capsule` 提示如“1 modules failed to refresh”或“已收藏”）时，用户在弹窗、健康监控列表（`home-health-diagnostics`）或快速指引弹窗（`guideDialog`）中按 Escape，原本期望关闭顶层 Dialog，却被 `lv-notice-active-card` 拦截并执行 `stopImmediatePropagation()` 彻底吞噬按键，导致所有依赖 Esc 退出的宿主/插件弹窗必须按两次才能关闭，严重破坏交互体验。
2. **第二面板（工作台）Receipt 区域与编辑态选择器冲突**：
   在生态流接入后，工作台 Receipt 栏新增了 `Ecosystem Stream` 按钮，导致 `tests/e2e/workbench-information.spec.mjs` 中 `receipt.locator("button")` 命中 2 个元素违反 Playwright 严格模式；同时表面导航切换返回工作台时，前置未彻底清理的 DOM 容器导致 `root.locator(...)` 产生多重实例匹配。
3. **天气卡片浅色模式白底白字与响应式折叠断言失效**：
   在引入 Bento 浅色毛玻璃白卡（`rgba(255, 255, 255, 0.75)`）后，天气卡片的大字温度值 `.sw__home-stat-value` 继承了白字（`#fff`），产生严重低对比度（1.25，低于 WCAG AA 3.0 门限）；且移动端（<=600px）缺少向 2 列响应式折叠的媒体查询规则。
4. **动态分块网络监听在预加载/缓存场景下的死等超时**：
   `tests/e2e/snippet-studio-entry.spec.mjs` 使用未设超时的 `waitForResponse` 监听静态 chunk，在浏览器已缓存时会永久死等 120s 导致工作区连接雪崩；且自动化进程清理脚本 `cleanup-e2e-artifacts.cjs` 未包含 `SiYuan-Kernel.exe` 测试实例，进程异常终止时易产生端口占用的孤儿内核。

## 2. 决策与架构调整

1. **精细化通知浮层生命周期（`syncNoticeSurface`）**：
   - 明确**微胶囊（`mode === "capsule"`）为轻量非阻断通知，绝对不拦截键盘 Escape 键**，不进入 `lvSurfaceStack`；
   - 仅在 `activePackets` 中真正存在需要键盘交互或重点展示的卡片（`mode !== "capsule"`）时，动态挂载至 `lvSurfaceStack`；所有卡片关闭后自动移出栈；
   - 彻底解除普通通知气泡对底层/高层思源 Dialog 及切换器界面的按键劫持。
2. **选择器与生命周期强化**：
   - 工作台 Receipt 区域收敛为精确类名 `.sw-home__receipt-details`；
   - 导航恢复工作台时统一锚定最新活动的 `.sw-home` 实例（`.last()`）；
   - 测试用例结束后显式清理弹出的二级子弹窗（如 `.sw-home-store`）。
3. **天气卡片双模色彩与移动端响应式加固**：
   - `.sw-home__cell[data-module-id="external-weather-open-meteo"] .sw__home-stat-value` 声明深浅模式高对比度色彩（浅色模式 `#0369a1` 对比度 4.74，深色模式 `#e0f2fe` 对比度 8.61）；
   - 声明 `@media (max-width: 600px)` 自动折叠为 2 列（`repeat(2, minmax(0, 1fr))`）。
4. **自动化生命周期与专项新增功能 E2E 归口**：
   - `scripts/cleanup-e2e-artifacts.cjs` 统一纳入带有 `SiYuan-SpeedSwitch-E2E` 标记的测试孤儿内核，通过 Node 原生 `process.kill(pid, "SIGKILL")` 毫秒级回收；
   - `tests/e2e/snippet-studio-entry.spec.mjs` 增设 5s 容错兜底并以真机 DOM 可见性为最终裁决；
   - 新增 `tests/e2e/ecosystem-features-browser-audit.spec.mjs` 全生态新增功能（罗盘/AI编织/穿透搜索/灾备/生态流）真实浏览器深度审计，正式纳入 `e2e:isolated` 发版门禁。

## 3. 验证结果

- **真实隔离思源 E2E 门禁（`pnpm e2e:isolated`）**：14 大 Spec 包含的 24 项真实真机端到端全链路用例 **24/24 100% 全绿通过**（耗时 1.5 分钟）；
- **全量单元与契约测试（`pnpm test`）**：9909 项测试 100% 全绿（0 fail, 1 skipped）；
- **5 套 Chromium 冒烟测试**：`test:smoke`、`test:smoke:layout`、`test:smoke:browser`（含深浅模式 WCAG AA 对比度）、`test:smoke:floating-ball`、`test:smoke:surface-switch` 全部 100% 绿灯；
- **发版质量与集成审计**：`quality:audit` 50/50 PASS，`integration:audit` 50/50 PASS；
- **产物可复现构建**：`repro:audit` 3/3 产物绝对一致。
