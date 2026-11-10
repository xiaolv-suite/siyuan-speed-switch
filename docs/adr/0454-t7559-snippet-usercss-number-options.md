# ADR 0454：代码片段实验室导出 usercss 支持 @var number 数值参数精度校验与默认值格式化（T-7559）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS / Stylus 规范中，数值型参数通过 `@var number` 声明（如 `@var number columns "Columns" 4`）。此前：
1. `buildUsercssHeader` 对 `type === "number"` 仅作为普通字符串处理，未进行数值有限性校验；
2. 当传入非数字字符串、`NaN` 或注入代码时，未提供格式化验证与默认值安全回退。

## 决策

1. **UserCSS 头部扩展 `@var number` 格式化规范**：
   - 当 `type === "number"` 时，解析 `v.default` 或 `v.value`；
   - 提取 `const num = Number(raw)`；
   - 验证 `Number.isFinite(num)`（涵盖正负整数、浮点数、0 等）；
   - 若数值合法，格式化输出为 `String(num)`；
   - 若数值为 `NaN` 或非法字符串，安全回退至 `"0"`；
   - 规范输出格式：`@var number <name> "<label>" <num>`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 16/16 满分通过，验证整数、浮点数、字符串型数值与非法输入回退；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
