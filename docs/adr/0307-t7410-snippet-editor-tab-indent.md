# 0307. T-7410 片段实验室代码编辑器 Tab 键两空格缩进防跳焦契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7410

## 背景与上下文

在第三面板代码片段实验室（`mountSnippetStudio`）中，用户在代码编辑器（Textarea）中编写 CSS 与 JS 片段。
浏览器默认的 Textarea 在按下 `Tab` 键时会将焦点切换至页面下一个表单控件，造成编辑流中断与跳焦困扰。

## 架构决策

1. **Tab 键缩进拦截**：
   - 在 `src/snippet-studio-ui.js` 的 `editor` keydown 监听中：
     - 当捕获非修饰键组合的 `Tab` 键且非输入法拼音候选期时；
     - 阻止浏览器默认跳焦行为；
     - 在当前光标所在位置插入两个空格缩进（`"  "`）；
     - 将光标精确推进 2 个字符（`selectionStart = selectionEnd = start + 2`）；
     - 触发 `changed()` 刷新行号与实时语法沙箱。
2. **门禁与测试**：
   - 新增 `tests/snippet-editor-tab-indent.test.cjs`；
   - 负向验证：若未阻止默认或未插入空格，断言必须精准红。

## 后果与影响

- 极大提升代码片段编辑手感，消除跳焦挫败；
- 保持纯轻量零重型依赖。
