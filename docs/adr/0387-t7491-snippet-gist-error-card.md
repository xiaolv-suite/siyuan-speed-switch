# ADR 0387：代码片段实验室 Gist 发布异常状态卡片与指数退避重试指引加固（T-7491）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）提供了将代码片段分享并发布为 GitHub Gist 的能力。此前：
1. 当发布因网络超时、凭证受限（401/403）或 GitHub API 速率限制（429）发生失败时，提示仅呈现在底栏单行状态文字中，而 Gist 配置面板内容被直接清空；
2. 用户在右侧操作区缺乏就地、直观的异常解释与针对性解决指引（如区分网络断开 vs Token 缺失 gist 作用域 vs 触发 GitHub 限频）。

## 决策

1. **Gist 操作区内嵌 `.sw-studio__gist-error` 告警卡片**：
   - 在 `src/snippet-studio-ui.js` 的 `publishCurrentGist` 异常捕获中，动态向 `gistPreviewBox` 挂载具有 `role="alert"` 语义的错误反馈卡片；
   - 细化错误归因：对 `gist-access-denied`（403/429）定向提示 GitHub 限频或 Token 权限不足指引，引导用户检查 Token 的 `gist` 勾选项；对常规异常给出网络检查与稍后重试提示。

2. **样式层轻量警告卡片规范**：
   - 在 `src/styles/_snippet-studio.scss` 中声明 `.sw-studio__gist-error` 样式规范，采用错误色柔光背景与微外边框，与片段实验室整体设计语言统一。

## 验证

- **契约测试**：`tests/snippet-gist-error-card.test.cjs` 3/3 满分通过，验证失败卡片构造、限频分流判定、双语词典与 SCSS 声明；
- **负向验证**：修改选择器断言注入故障，确认测试精准拦截，还原后通过。
