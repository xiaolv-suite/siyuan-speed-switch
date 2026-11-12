# ADR 0418：代码片段实验室导出 usercss 支持 @homepageURL 与 @supportURL 元数据提取与安全校验（T-7523）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在标准 UserCSS / Stylus 生态中，样式的来源主页与 Issue 反馈地址通过 `@homepageURL` 与 `@supportURL` 字段声明。此前：
1. `buildUsercssHeader` 未提供 URL 元数据字段支持；
2. 如果直接拼接未经过滤的 URL 参数，可能引入包含空格、换行、引号或危险协议（如 `javascript:`、`data:` 等）的恶意字符串，破坏元数据块甚至诱发 XSS。

## 决策

1. **UserCSS 头部扩展 `@homepageURL` 与 `@supportURL`**：
   - 提取 `options.homepageURL`（兼容量名 `homepageUrl`）与 `options.supportURL`（兼容量名 `supportUrl`）；
   - 严格通过 `/^https?:\/\/[^\s"'<>]+$/i` 正则校验，仅允许合法的 http/https 网络超链接，截断上限 200 字符；
   - 针对 `javascript:`、`data:`、空格、尖括号或非法输入静默安全抑制，不输出该元数据行。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 7/7 满分通过，验证合法 URL 提取、危险伪协议与非法字符安全抑制；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
