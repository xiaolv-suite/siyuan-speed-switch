# ADR 0434：代码片段实验室导出 usercss 支持 @var select 选项数组格式化与校验（T-7539）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS 规范中，下拉单选变量通过 `@var select` 声明（如 `@var select themePreset "Preset" ["dark*", "light"]`）。此前：
1. `buildUsercssHeader` 对所有变量统一走 `String(v.default)` 扁平拼接；
2. 当变量类型为 `select` 且上层传入结构化选项（`options` 数组或对象键值对）时，缺少自动格式化为标准 UserCSS 选项语法的支持。

## 决策

1. **UserCSS 头部扩展 `@var select` 选项格式化**：
   - 当 `type === "select"` 时，优先检查 `options` 字段；
   - 支持字符串数组（`["dark*", "light"]`）格式化为 `["...", "..."]`，保留 `*` 默认标记；
   - 支持对象字典（`{"dark*": "Dark Mode", "light": "Light Mode"}`）格式化为 `{ "key*": "Label" }` 字典；
   - 过滤所有非法换行与注入字符，并截断单项长度防止溢出。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 11/11 满分通过，验证选项数组与对象字典格式化及负向探针；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
