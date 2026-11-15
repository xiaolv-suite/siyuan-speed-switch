# ADR 0394：代码片段实验室诊断抽屉快捷键展开与规则计数角标加固（T-7499）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）提供了针对 CSS 规则与选择器覆盖率的静态诊断抽屉（`.sw-studio__diagnostics`）。此前：
1. 诊断总览头部仅有一长串统计描述文字，在折叠态下缺乏醒目的总规则/问题数字角标；
2. 缺乏全局快捷键，用户在编写 CSS 时若想查看具体未匹配的选择器行号，必须移开双手用鼠标点击展开 summary。

## 决策

1. **诊断总规则与错误计数角标回显**：
   - 在 `src/snippet-studio-ui.js` 的诊断分析管线中，汇总 `counts.hit + counts.miss + counts.unknown + diagnostics.errors.length` 为 `totalFindings`；
   - 绑定至 `diagnosticsSummary.dataset.findings`；
   - 在 `src/styles/_snippet-studio.scss` 中通过 `&[data-findings]::after` 伪类渲染右浮动半透明药丸数字角标，紧凑清晰。

2. **诊断抽屉快捷开闭热键**：
   - 在根容器按键监听中，绑定 `Ctrl/Cmd + Shift + D` 或 `Alt + D`；
   - 非组合输入法状态下直接切换 `diagnosticsDetails.open`，实现全键盘沉浸式样式审查。

## 验证

- **契约测试**：`tests/snippet-diagnostics-toggle-badge.test.cjs` 3/3 满分通过，验证计数属性计算、快捷按键切换与 SCSS 伪类样式；
- **负向验证**：修改选择器伪类属性断言注入故障，确认测试精准拦截，还原后通过。
