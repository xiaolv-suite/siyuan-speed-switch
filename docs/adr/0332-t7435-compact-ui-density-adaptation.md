# 0332. T-7435 思源 3.8.8+ 桌面紧凑模式自适应契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7435

## 背景与上下文

思源笔记自 v3.8.8 起在根节点引入了 `:root[data-ui-density="compact"]` 紧凑模式机制，用户在分屏或小尺寸屏幕下倾向于更致密的信息呈现。
此前雷切各表面（切换器、工作台、片段实验室）的内边距和行高固定为标准桌面尺度，在紧凑模式下卡片与单元格占比偏大，可展示的有效行数受限。

## 架构决策

1. **紧凑模式根选择器自适应**：
   - 在 `src/styles/_platform-shell.scss` 中针对 `:root[data-ui-density="compact"]` 声明：
     - 将平台间距比例整体压缩：`--sw-platform-space-1: 2px`、`--sw-platform-space-2: 4px`、`--sw-platform-space-3: 8px`、`--sw-platform-space-4: 12px`；
     - 顶栏高度压缩至 48px（`--sw-platform-header-height: 48px`）；
     - 切换器卡片 `.sw__card` 内边距缩至 `4px 6px`，最小高度降至 `40px`；
     - 工作台单元格 `.sw-home__cell` 内边距缩至 `4px`；
     - 文档搜索条目 `.sw__doc-item` 纵向内边距缩至 `4px`。
2. **门禁与测试**：
   - 新增 `tests/compact-ui-density-adaptation.test.cjs`；
   - 负向验证：若样式未包含 `:root[data-ui-density="compact"]` 或缺失卡片紧凑声明，断言必须精准红。

## 后果与影响

- 完美响应思源最新桌面紧凑模式标准；
- 显著提升分屏多任务时的工作台与搜索结果信息密度。
