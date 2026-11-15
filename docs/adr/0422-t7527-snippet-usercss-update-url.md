# ADR 0422：代码片段实验室导出 usercss 支持 @updateURL 自动更新源链接元数据提取与安全校验（T-7527）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在标准 UserCSS / Stylus 样式生态中，用户安装的第三方样式通过头部 `@updateURL` 声明的远端 raw CSS 链接实现自动版本检测与更新。此前：
1. `buildUsercssHeader` 未支持自动更新链接字段；
2. 需要防止注入非 HTTP/HTTPS 协议（如 `ftp:`, `file:`, `javascript:`）或含空格、特殊引号的非法 URL。

## 决策

1. **UserCSS 头部扩展 `@updateURL` 字段**：
   - 提取 `options.updateURL`（兼容量名 `updateUrl`）；
   - 严格通过 `/^https?:\/\/[^\s"'<>]+$/i` 正则校验，仅放行合法的 http/https 协议链接，截断上限 200 字符；
   - 针对非安全协议或非法字符静默安全抑制，不输出该元数据行。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 8/8 满分通过，验证合法 updateURL 提取、非 http 协议抑制与负向探针；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
