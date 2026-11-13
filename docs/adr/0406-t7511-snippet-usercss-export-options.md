# ADR 0406：代码片段实验室导出 usercss 头部配置项键值校验与导出通知加固（T-7511）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）提供了将 CSS 代码片段导出为标准 Stylus/UserCSS 格式文件的能力（通过 `buildUsercssHeader`）。此前：
1. `buildUsercssHeader` 仅接受 `name` 参数，固化了 `@namespace siyuan-speed-switch` 与 `@version 1.0.0`，缺少对可选参数（如自定义命名空间与语义版本）的拓展通道；
2. 当未来或上层调用方传递非预期/包含空格的命名空间或非法格式的版本字符串时，未做严格的白名单校验防溢出；
3. 用户在编辑器中点击“导出”按钮后，虽然触发了本地文件下载，但状态栏未发生任何反馈，用户缺乏明确的操作完成感知。

## 决策

1. **UserCSS 头部构建器参数与白名单校验增强**：
   - `buildUsercssHeader(name, options = {})` 接收可选配置对象；
   - 对 `options.namespace` 进行严格的正则白名单校验（`^[a-z0-9_.-]+$`），不合规或未提供时静默回退至标准默认命名空间 `"siyuan-speed-switch"`，截断长度上限 80 字符；
   - 对 `options.version` 进行严格的语义版本校验（`^\d+\.\d+\.\d+$`），不合规或未提供时回退至 `"1.0.0"`。

2. **导出即时状态提示（setStatus）**：
   - 在 `exportButton` 点击触发 `download` 后，立即调用：
     `setStatus((t("snippetExportDone") || "已导出代码片段：{name}").replace("{name}", draft.name || "snippet"), "ready");`
   - 中英文语言文件补充 `snippetExportDone` 词条，确保视觉反馈清晰直观。

## 验证

- **契约测试**：`tests/snippet-usercss-export-options.test.cjs` 4/4 满分通过，验证 options 参数定制、非法输入安全回退、状态栏提示注入与负向注入拦截；
- **全量测试**：`npm test` 跑通无任何回归。
