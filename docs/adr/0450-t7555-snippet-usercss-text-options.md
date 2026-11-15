# ADR 0450：代码片段实验室导出 usercss 支持 @var text 文本参数转义与多行过滤（T-7555）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS / Stylus 规范中，文本字符串参数通过 `@var text` 声明（如 `@var text fontFamily "Font Family" "Georgia, serif"`）。此前：
1. `buildUsercssHeader` 对 `type === "text"` 的变量未自动补齐双引号包裹；
2. 内部若包含双引号未进行 `\"` 转义，容易闭合 UserCSS 参数声明；
3. 包含换行符（`\n` / `\r`）的多行字符串未被压缩，可能导致头部出现非法断行。

## 决策

1. **UserCSS 头部扩展 `@var text` 格式化规范**：
   - 当 `type === "text"` 时，提取 `v.default` 或 `v.value`（未提供时默认为空串 `""`）；
   - 过滤与转义：
     - 将 `[\u0000-\u001f\u007f\r\n]+` 控制符与换行符替换为单个空格；
     - 将文本内部的双引号 `"` 转义为 `\"`；
     - 截断最大长度至 120 字符防止头部膨胀；
   - 规范输出格式：`@var text <name> "<label>" "<default>"`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 15/15 满分通过，验证常规文本引号包裹、内部双引号转义、多行断行过滤与空默认值安全输出；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
