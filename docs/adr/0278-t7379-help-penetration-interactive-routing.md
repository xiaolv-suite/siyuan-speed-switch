# ADR 0278：T-7379 穿透检索符号指引（?模式）可交互路由与全弹窗 v0.48.21 闭环

日期：2026-10-24  
状态：accepted  
任务：T-7379  

## 背景

在第一面板穿透检索的帮助与符号指引模式（输入 `?` 或 `？` 唤出）中，系统会列出大纲穿透（`@标题` / `:标题`）、标签检索（`#标签`）、书签直达（`!书签`）、正文穿透（`^关键词`）以及快捷键（`Ctrl+Shift+T`、`⌘K` 等）的速查条目。
然而在 `activateDocResultItem` 的点击/激活链路中，这些条目的虚拟 ID（如 `help-outline`、`help-tag`、`help-bookmark`、`help-block`、`help-undo`）此前未做分流拦截：
1. 用户在搜索结果中点击任一帮助条目，系统误将其作为常规思源文档 ID 发送给 `openDocumentOnDesktop({ rootId: "help-outline" })`；
2. 导致切换器弹窗误关闭，并弹出“打开文档失败”的异常报错提示；
3. 用户无法通过点击帮助条目快速体验对应的模式，功能仅停留于静态文本阅读。

## 决策

1. **`activateDocResultItem` 拦截 `help-*` 虚拟标识**：
   - 彻底阻断向思源内核发起非法的文档打开调用；
2. **符号模式动态回填与自执行路由**：
   - `help-outline`：自动将输入框值置为 `":"`，聚焦并补发检索，即刻呈现大纲模式；
   - `help-tag`：自动将输入框值置为 `"#"`，聚焦并补发检索，即刻呈现标签模式；
   - `help-bookmark`：自动将输入框值置为 `"!"`，聚焦并补发检索，即刻呈现书签模式；
   - `help-block`：自动将输入框值置为 `"^"`，聚焦并补发检索，即刻呈现正文块模式；
   - `help-undo`：直接调用 `undoLastClosedTab(onClose)`，一键完成撤销关闭页签并恢复；
   - 其余指引项：通过 `showMessage` 给出友好引导反馈，不破坏当前界面；
3. **版本号晋级（v0.48.21）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.21`。

## 证据与验证

1. **专项契约测试**：`tests/help-penetration-interactive-routing.test.cjs` 4/4 通过（含针对模式前缀回填、撤销关闭调度与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
