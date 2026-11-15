# ADR 0446：代码片段实验室导出 usercss 支持 @var color 颜色格式化与校验（T-7551）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS / Stylus 规范中，颜色参数通过 `@var color` 声明（如 `@var color primaryColor "Primary" #3575f0`）。此前：
1. `buildUsercssHeader` 对 `type === "color"` 仅通过通用字符串替换，缺少颜色格式合法性校验；
2. 当传入包含分号、脚本或非法格式的默认值时，可能导致导出的 UserStyle 样式头被破坏或引入语法错误。

## 决策

1. **UserCSS 头部扩展 `@var color` 格式化与合法性验证**：
   - 当 `type === "color"` 时，提取 `v.default` 或 `v.value`；
   - 验证格式：
     - 十六进制颜色：3、4、6、8 位十六进制（`^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`）；
     - 函数型颜色：`rgb(...)`、`rgba(...)`、`hsl(...)`、`hsla(...)`；
     - 命名颜色与关键字：长度 <= 25 的合法纯英文字符串（如 `transparent`, `currentColor`, `red` 等）；
   - 异常防护：对非法、包含分号或注入字符的颜色值，自动安全回退为 `#000000`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 14/14 满分通过，验证十六进制、函数型、命名颜色与非法输入安全回退；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
