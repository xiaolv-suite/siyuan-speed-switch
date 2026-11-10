# ADR 0476：持久化落盘加固、词法前缀保护、国际化收敛与极窄侧栏适配（T-7585~T-7588）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全方位深度复审评估报告提出首批核心优化建议后，针对四大关键痛点进行实装落地：
1. **持久化落盘时序（P0）**：`onunload` 卸载时 `this.flushPendingSaves()` 在生命周期末尾缺少 `try...catch` 异常保护与安全等待，宿主可能在异步请求完成前终止沙箱上下文，导致最后时刻的配置与组件排版发生丢失。
2. **待办前缀词法歧义（P1）**：`parsePenetrationQuery` 过去只要 `text.startsWith("-")` 无论后续内容均直接判定为 `SEARCH_MODES.TASK`，导致用户在进行类似 `-周报 项目` 这种以排除项开头的多词布尔检索时，被误判为待办任务模式，破坏了第一面板的页签布尔排除语法。
3. **概念与国际化收敛（P1）**：第三面板在文档中称“代码片段实验室”，但 `zh-CN.json` 写为“片段工作室”；工作台编辑模式下的“📐 自动对齐”按钮与提示标题硬编码为中文，破坏了双语环境的一致性。
4. **侧栏与移动端极窄场景（P1）**：思源右侧 Dock 栏在收缩至 280px 极窄模式时，顶栏搜索框与触发器易发生换行折行；移动端纯图标历史按钮物理尺寸为 28px，手持触控容易误触或漏击。

## 决策

1. **持久化落盘异常隔离加固（T-7585）**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `onunload` 生命周期末尾，将 `await pendingSaves;` 包裹在独立的 `try...catch` 块中，并记录脱敏告警，既保障卸载前落盘等待，又杜绝异步失败阻断宿主卸载流程。
2. **多词布尔排除词法保护（T-7586）**：
   - 优化 `src/penetration-search-model.js`：若输入以 `-` 开头但后续存在空格及正向关键词（如 `-周报 项目`），识别为多词布尔检索，精准放行至 `SEARCH_MODES.DOC` 走 `parseSearchQuery`；纯单词待办（如 `-开会`）和显式 `task:` / `[ ]` 保持待办任务模式不变。
3. **官方概念统一与 i18n 字典收敛（T-7587）**：
   - `src/i18n/zh-CN.json` 与 `src/index.ts` 统一将第三面板标题标准化为“片段实验室”；
   - 提取工作台自动对齐按钮为标准多语言键：`homeAutoAlign` 与 `homeAutoAlignHint`，并在中英文 JSON 中补齐定义，彻底消除代码内中文硬编码。
4. **侧栏 280px 断点与移动端 44px 热区补齐（T-7588）**：
   - 在 `src/styles/_07-sidebar-panel-store.scss` 增加 `@container (max-width: 280px)` 极窄响应式断点，搜索框通栏展现、隐藏多余文本标签、卡片全宽单列；
   - 在 `src/styles/_03-switcher-mobile.scss` 为移动端纯图标历史按钮通过 `::before` 扩展至 44×44px 最小触控热区（WCAG 2.5.5）。

## 验证

- 新增专项契约测试 `tests/core-resilience-and-ux-optimization.test.cjs`，5/5 满分通过（包含正向逻辑与负向注入探针）；
- 全量单元与契约测试通过（9,617 项测试，0 fail）；
- 14 道发布总门禁 `pnpm run verify:release` 100% PASS；
- 产物与运行态目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/` 已完成直通同步。
