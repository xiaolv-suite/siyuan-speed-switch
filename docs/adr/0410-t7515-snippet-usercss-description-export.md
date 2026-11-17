# ADR 0410：代码片段实验室导出 usercss 支持 @description 说明字段提取与安全转义（T-7515）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在代码片段实验室（Snippet Studio）导出 UserCSS 样式文件时：
1. 现有 Stylus / UserCSS 生态规范支持 `@description` 字段展示片段用途说明；
2. 此前 `buildUsercssHeader` 未支持说明元数据，无法将片段的简述信息固化到导出头中；
3. 若传入的说明中含有换行或不可见控制符，若直接拼入头部会破坏 Stylus 解析器的单行元数据读取协议。

## 决策

1. **UserCSS 头部扩展 `@description` 字段**：
   - `buildUsercssHeader(name, options)` 支持 `options.description`；
   - 过滤所有 `[\u0000-\u001f\u007f]+` 控制字符与换行符为单个空格，去除首尾空白并截断至最多 240 字符；
   - 仅当清洗后的说明文本非空时，追加 `\n@description ${desc}`；若未提供或为空白，则完全不输出该行，保持最小干净头部与历史契约兼容。

2. **导出生态兼容保持**：
   - 导入去头正则 `USERCSS_HEADER_RE` 保持通配 `/* ==UserStyle==[\s\S]*?==/UserStyle== */`，无缝支持带 `@description` 的头部双向往返。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 5/5 满分通过，验证说明字段提取、换行过滤、空值抑制与非法版本负向探针；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 绿灯。
