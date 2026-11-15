# ADR 0358：T-7461 工作台 Bento 瓦片小组件在极窄容器下的文本裁剪、防挤压与自适应微质感加固

## 背景与上下文

小驴雷切第二面板工作台采用了现代科技感的双拼 Bento 瓦片网格架构（ADR 0217）。在桌面端与常规平板视口下，Bento 瓦片展现出极佳的微质感与信息密度。
然而，在移动设备极窄视口（例如竖屏宽度 <= 360px）或窄侧栏紧凑 Dock 极端容器中，双列强制并排会导致每个瓦片可用宽度缩窄至 140px~160px，容易出现小组件长标题被换行截断、次级胶囊被挤压变形、统计数值文字溢出等视觉缺陷，降低了界面的精品感。

## 架构决策与实现

1. **超窄视口（<=360px）优雅单列回退**：
   在 `src/styles/_12-r54-surface-adapter.scss` 的 `@container sw-r54-surface (max-width: 360px)` 容器查询分支中，将移动端工作台双拼 Bento 网格自动平滑回退为单列展开：
   ```scss
   @container sw-r54-surface (max-width: 360px) {
       .sw-home.sw-home--mobile .sw-home__grid {
           grid-template-columns: 1fr !important;
           gap: var(--sw-space-xs, 4px);
       }
       .sw-home.sw-home--mobile .sw-home__cell[data-size="xs"] {
           grid-column: 1 / -1 !important;
       }
   }
   ```
2. **瓦片内部文本省略与防挤压守卫**：
   - 单元格根声明 `min-width: 0`，防止弹性或网格容器被未指定宽度的长文本撑爆；
   - 标题（`.sw-home__cell-title`）与条目标签（`.sw__home-module-item-label`）强制应用 `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`；
   - 次级信息胶囊（`.sw__home-module-item-secondary`）声明 `flex-shrink: 0; font-variant-numeric: tabular-nums;`，坚决杜绝被长文本挤压变形，并保持数字垂直对齐美感；
   - 统计数值（`.sw__home-stat-value`）统一应用 `tabular-nums` 与文本防溢出省略。

## 验证与证据

1. `tests/bento-extreme-viewport-contract.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/compact-workbench-style-contract.test.cjs`：7/7 满分全绿。
