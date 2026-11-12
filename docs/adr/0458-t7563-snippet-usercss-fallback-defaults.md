# ADR 0458：代码片段实验室导出 usercss 支持通用 @var 自动格式化回退与非法字段清洗（T-7563）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS / Stylus 规范中，导出的头部必须保证每一行 `@var` 声明都具备合法的参数格式与默认值。此前：
1. 当用户或扩展脚本传入不完整、缺失默认值或空值的变量定义对象时，可能导致 `@var <type> <name> "<label>"` 缺少默认值参数，引发 UserStyle 解析器语法报错；
2. 缺乏针对 6 种标准变量类型的兜底合法值推导机制。

## 决策

1. **类型感知安全兜底规则**：
   在 `buildUsercssHeader` 中，若参数解析后 `def` 仍为空，按其声明类型注入合法的标准语法兜底值：
   - `range`: `[0, 0, 100, 1]`
   - `select`: `[]`
   - `color`: `#000000`
   - `checkbox`: `0`
   - `number`: `0`
   - `text`: `""`
2. **语法完整性保证**：
   彻底杜绝 `@var` 空参数导致的下游 Stylus 编译阻断，提高跨生态 UserCSS 样式的导出容错度。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 17/17 满分通过，验证 6 种标准类型全空参数下的安全兜底回退；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
