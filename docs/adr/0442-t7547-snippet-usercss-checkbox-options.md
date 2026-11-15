# ADR 0442：代码片段实验室导出 usercss 支持 @var checkbox 布尔开关格式化与默认值校验（T-7547）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS / Stylus 规范中，布尔复选开关通过 `@var checkbox` 声明（如 `@var checkbox enableGlow "Enable Glow" 1`）。此前：
1. `buildUsercssHeader` 对 `type === "checkbox"` 变量若传入布尔型 `false` 或缺少默认值，仅依赖扁平的 `v.default` 字符串转换；
2. 缺少针对布尔真假（`true` / `false`、`1` / `0`、`"on"` / `"off"`）到标准 `1` / `0` 的规范化映射，未提供安全默认值 `0` 回退。

## 决策

1. **UserCSS 头部扩展 `@var checkbox` 规范化格式化**：
   - 当 `type === "checkbox"` 时，解析 `v.default`、`v.value` 或 `v.checked`；
   - 判定真值规则：`raw === true || raw === 1 || raw === "1" || String(raw).toLowerCase() === "true" || String(raw).toLowerCase() === "on"`；
   - 规范输出 `1`（激活）或 `0`（关闭）；
   - 若未提供默认值，自动安全回退为 `0`；
   - 最终格式：`@var checkbox <name> "<label>" <1|0>`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 13/13 满分通过，验证数字、布尔、别名及默认值回退；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
