# ADR 0414：代码片段实验室导出 usercss 支持 @author 与 @license 字段提取与安全校验（T-7519）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续对齐标准 UserCSS / Stylus 格式元数据协议。此前：
1. `buildUsercssHeader` 支持了名称、命名空间、版本号与简要说明（`@description`）；
2. 社区用户经常需要将作者署名（`@author`）与开源许可证（`@license`）附加到导出的样式头部；
3. 需要对作者名称做不可见控制符与换行清洗，同时对许可证名称执行严格的字母数字短横线安全白名单，避免注入非预期字符破坏解析。

## 决策

1. **UserCSS 头部扩展 `@author` 字段**：
   - 支持 `options.author`；
   - 过滤所有 `[\u0000-\u001f\u007f]+` 为空格，首尾裁剪后限制上限 80 字符；
   - 仅当清洗后的作者名非空时输出 `\n@author ${author}`。

2. **UserCSS 头部扩展 `@license` 字段**：
   - 支持 `options.license`；
   - 严格通过 `/^[a-zA-Z0-9_.-]+$/` 正则白名单校验（如 `MIT`、`Apache-2.0`、`GPL-3.0` 等），截断上限 40 字符；
   - 包含非法字符或空白时静默抑制，不输出该行。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 6/6 满分通过，验证作者换行清洗、许可证白名单过滤与静默抑制；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 绿灯。
