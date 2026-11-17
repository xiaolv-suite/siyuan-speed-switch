# ADR 0426：代码片段实验室导出 usercss 支持 @preprocessor 预处理器元数据字段提取与枚举安全校验（T-7531）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在标准 UserCSS / Stylus 语法规范中，`@preprocessor` 声明了样式编译所使用的预处理器类型（如 `default`, `uso`, `less`, `stylus`, `sass`, `scss`）。此前：
1. `buildUsercssHeader` 未支持预处理器字段声明；
2. 为防止传入非预期或恶意字符串，必须限制为国际标准 UserCSS 支持的白名单枚举。

## 决策

1. **UserCSS 头部扩展 `@preprocessor` 字段**：
   - 提取 `options.preprocessor`；
   - 规范化转换为小写并匹配标准白名单：`["default", "uso", "less", "stylus", "sass", "scss"]`；
   - 匹配成功时输出 `\n@preprocessor ${preprocessor}`，未匹配或缺省时安全抑制，保持最小标准头部。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 9/9 满分通过，验证预处理器枚举清洗、大小写归一化、非法输入静默抑制与负向探针；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
