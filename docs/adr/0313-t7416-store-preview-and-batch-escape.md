# 0313. T-7416 组件商店预览弹窗 Escape 回焦与批量模式 Escape 阶梯退出契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7416

## 背景与上下文

在小组件商店中，有两个关键分支交互：
1. **组件预览弹窗（`openStoreWidgetPreview`）**：此前未在弹窗容器级别显式捕获 `Escape` 按键，当焦点落在不可捕获原生关闭的主题节点时，可能导致无法全键盘顺畅关闭并回焦触发按钮；
2. **批量模式（`storeBatchMode`）**：用户通过 `Ctrl+B` 进入批量添选模式后，若按 `Escape` 键，此前会直接冒泡试图关闭整个商店弹窗，丢失了当前浏览位置与会话。

## 架构决策

1. **预览弹窗 Escape 显式关闭与回焦**：
   - 在 `src/home-store-ui.ts` 与 `src/home-store-ui.js` 的 `openStoreWidgetPreview` 中：
     - 为 `dialog.element` 挂载 `Escape` keydown 监听，触发 `dialog.destroy()`；
     - 销毁时解绑监听并将焦点安全归还给 `opener` 触发按钮。
2. **批量模式 Escape 阶梯退出**：
   - 在 `onStoreKeydown` 顶层监听中：
     - 当捕获 `Escape` 且处于 `storeBatchMode` 时，阻止事件冒泡与默认关闭；
     - 重置 `storeBatchMode = false` 与清空已选列表，重新执行 `renderStore()` 回退至普通目录模式。
3. **门禁与测试**：
   - 新增 `tests/store-preview-and-batch-escape.test.cjs`；
   - 负向验证：若批量模式 Escape 缺少 storeBatchMode 守卫导致无条件清空，断言必须精准红。

## 后果与影响

- 修复小组件商店在批量模式下的全键盘意外退出问题；
- 遵循阶梯式 Escape 标准心智模型。
