# ADR 0390：内置片段库新增任务列表核选弹跳微动效与粗体文本柔光阴影 CSS 片段（T-7494）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）致力于持续精细化思源文档的阅读与编辑微质感。此前：
1. 点击任务列表复选框时，原生缺少交互弹性物理反馈，完成待办时缺乏瞬时愉悦感；
2. 粗体文本（`strong`）在常规正文中与普通文字仅有字重差异，在暗色或低对比度主题下视觉跳脱度不足。

## 决策

1. **新增 `swss-builtin-taskbounce`（任务勾选弹性缩放动效）**：
   - 目标选择器：`.protyle-wysiwyg [data-subtype="t"] > .protyle-action:active`；
   - 采用 `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性贝塞尔曲线，点击时触发轻盈的 `scale(0.85)` 缩放微动效，松手即刻回弹，极具手感。

2. **新增 `swss-builtin-boldaccent`（粗体文本主题主色与柔光阴影）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="strong"]`；
   - 运用主题主色 `var(--b3-theme-primary)` 与柔和文字微阴影（`text-shadow: 0 0 1px ...`），使笔记中的核心论点在速览时跃然纸上。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 42 项；
   - 双语语言文件齐备并登记至死 key 静态扫描白名单。

## 验证

- **契约测试**：`tests/builtin-snippets-taskbounce-boldaccent.test.cjs` 3/3 满分通过，验证选择器零冲突、作用域隔离与双语映射；
- **负向验证**：修改分类断言注入故障，确认测试精准拦截，还原后通过。
