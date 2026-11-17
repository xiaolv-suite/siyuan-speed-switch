# ADR 0430：代码片段实验室导出 usercss 支持 @var 变量类型白名单校验与安全转义（T-7535）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在标准 UserCSS / Stylus 语法规范中，用户可配置变量通过 `@var` 指令声明（如 `@var color accent "Accent" #3575f0`）。此前：
1. `buildUsercssHeader` 支持了静态元数据（名称、版本、作者、许可证、URL、预处理器等），但未提供自定义变量声明的参数化构造能力；
2. 为防止传入非预期类型破坏 Stylus 解析器或引入恶意格式，必须对变量类型限制在受支持的标准白名单中。

## 决策

1. **UserCSS 头部扩展 `@var` 变量支持**：
   - 支持 `options.vars`（兼容量名 `options.variables`）；
   - 严格限定类型在 `["color", "text", "number", "select", "checkbox", "range"]` 白名单内；
   - 变量名通过 `/^[a-zA-Z0-9_-]+$/` 合法标识符校验；
   - 标签文本剔除换行与双引号，截断上限 80 字符；
   - 格式化输出 `\n@var ${type} ${name} "${label}" ${default}`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 10/10 满分通过，验证变量类型白名单校验、非法类型安全抑制与负向探针；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
