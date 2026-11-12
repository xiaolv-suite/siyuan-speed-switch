# 架构决策记录 0494：T-7654~T-7657 搜索模式药丸栏同构镜像对齐与工作台编辑态质感强化

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7654, T-7655, T-7656, T-7657
- **参与者**：小驴开发团队、同构一致性与工作台交互治理

---

## 一、 背景与动因

在代码同构审计与工作台微观体验核查中，发现了以下两处细节优化点：
1. **多模态药丸栏同构镜像键盘导航缺失**：在 TS 源码（`src/index.ts`）中已经实现了药丸栏的完整键盘循环游走（ArrowLeft/Right/Down/Home/End 与输入框 ArrowUp 回切），但在纯 JS 同构镜像（`src/index.js`）中遗漏了事件挂载与清理，导致非打包运行时键盘导航失效；
2. **工作台编辑态虚线边框突兀生硬**：编辑态下的网格卡片使用了生硬的固定透明度虚线，缺少悬停态的高光响应与平滑过渡。

---

## 二、 架构决策与标准落地

### 1. T-7654 纯 JS 同构镜像键盘全循环流转对齐（A 档）
- 在 `src/index.js` 补齐 `setupSearchModeChips` 的全部键盘导航监听：
  - 药丸栏左右箭头循环焦点流转；
  - 向上箭头从输入框跳入当前激活药丸；
  - 向下箭头从药丸栏安全返回输入框；
  - 卸载清理函数中同步注销 `onSearchKeyDown`。

### 2. T-7655 工作台编辑态虚线微质感优化（A 档）
- `src/styles/_05-settings-widgets.scss`：编辑态 `.sw-home__grid--editing .sw-home__cell` 统一引用 `--sw-color-accent` 动态派生色，增加悬停高光与 `outline-color` 平滑过渡。

### 3. T-7656 多表面激活与聚焦类平滑化（A 档）
- 优化激活与选中状态的过渡时延，保持即时响应与零延迟。

### 4. T-7657 契约测试与破坏性负向探针验证
- 新增专项测试 `tests/mode-chips-isomorphism-and-edit-chrome-contract.test.cjs`；
- 验证纯 JS 同构镜像若丢失键盘导航监听必定精准报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/mode-chips-isomorphism-and-edit-chrome-contract.test.cjs` 3/3 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
