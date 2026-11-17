# ADR 0438：代码片段实验室导出 usercss 支持 @var range 数值区间与单位格式化校验（T-7543）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在 UserCSS 规范中，范围滑块变量通过 `@var range` 声明（如 `@var range fontSize "Font Size" [16, 12, 32, 1, "px"]`）。此前：
1. `buildUsercssHeader` 对 `type === "range"` 变量仅提取扁平的 `default`，缺少对 `[default, min, max, step, units]` 结构化区间参数的格式化支持；
2. 当传入 `range` 数组或包含 `min` / `max` / `step` / `units` 的对象时，缺少数值越界夹持（clamping）与单位合法性校验。

## 决策

1. **UserCSS 头部扩展 `@var range` 区间格式化**：
   - 当 `type === "range"` 时，解析 `v.range` 或 `v.options` 或 `v` 自身属性；
   - 支持数组入参：`[default, min, max, step, units]`；
   - 支持对象入参：`{ default, min, max, step, units }`；
   - 自动验证所有数值为有限数值（`Number.isFinite`），步长大于 0；
   - 边界自愈：若 `min > max` 自动调换，若 `default` 越界自动夹持至 `[min, max]` 区间内；
   - 单位过滤：仅允许纯字母或百分号单位（`^[a-zA-Z%]+$`，如 `px`, `rem`, `em`, `%`），剔除一切非法字符与脚本注入；
   - 规范输出格式：`[${def}, ${min}, ${max}, ${step}${units ? `, "${units}"` : ""}]`。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 12/12 满分通过，验证数组入参、浮点步长、对象入参、越界夹持与单位安全过滤；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
