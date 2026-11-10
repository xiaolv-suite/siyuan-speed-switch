# 架构决策记录 0501：T-7682~T-7685 平台表面导航圆角背景块化、外壳双层微底分层与内描边清零

- **状态**：accepted
- **日期**：2026-10-30
- **任务**：T-7682, T-7683, T-7684, T-7685
- **参与者**：小驴开发团队、平台外壳与表面导航交互治理

---

## 一、 背景与动因

在持续收敛与现代三段式外壳精修中，发现了以下两处微观质感断点：
1. **表面导航激活项残留内描边底横线**：`.sw-platform-surface-nav__item.is-active` 此前仍声明了 `box-shadow: inset 0 -2px 0 var(--sw-platform-accent);`，试图用底边实线表达选中态。这与参考图强调的“活跃项用圆润背景块而非文字变色或线条”的设计规律相违背，呈现出老旧感；
2. **平台外壳外层底色未贯穿**：`.sw-platform-shell` 此前直接取 `--sw-platform-bg`，在浅色模式下未能充分显现出与纯白浮卡（`--sw-card-float-bg`）之间的同族微色相托底反差；
3. **焦点环样式统一**：导航项在键盘获焦时此前使用 2px outline，未收敛至统一发光微光环 `--sw-focus-glow`。

---

## 二、 架构决策与标准落地

### 1. T-7682 平台表面导航激活项背景块化与内描边清零（A 档）
- `src/styles/_platform-shell.scss`：
  - 彻底铲除 `box-shadow: inset 0 -2px 0` 底边内描边；
  - 激活项全面收敛为圆润背景块 `background: var(--sw-platform-accent-soft);` 配微抬升柔影 `box-shadow: var(--sw-shadow-xs);`；
  - 键盘聚焦态接入统一发光焦点环 `--sw-focus-glow`。

### 2. T-7683 平台外壳双层微底分层全贯穿（A 档）
- `.sw-platform-shell` 外壳底色显式声明 `background: var(--sw-bg-tinted, var(--sw-platform-bg));`，保证浅色托底、白卡浮起的双层结构在整个平台外壳生命周期内稳定呈现。

### 3. T-7684 工具提示与深色胶囊气泡微质感（A 档）
- 保持深色胶囊与微触感在平台导航与动作区的自洽。

### 4. T-7685 专项契约测试与破坏性负向探针验证
- 新增专项测试 `tests/surface-nav-pill-block-and-shell-tint-contract.test.cjs`；
- 破坏性负向探针验证导航项若回退为底边内描边必报警退出。

---

## 三、 验证与证据

- 专项契约测试 `node tests/surface-nav-pill-block-and-shell-tint-contract.test.cjs` 3/3 PASS；
- 8 套样式刻度门禁测试全部 100% PASS；
- `pnpm exec tsc --noEmit` 零错误；
- `quality-batch-audit` 50/50 PASS；
- 可复现构建 3/3 核心产物一致。
