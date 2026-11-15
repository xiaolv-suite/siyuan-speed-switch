# ADR 0510：切换器页签卡片与文档速览浮窗 Bento 软影与白卡浮起（T-7722~T-7725）

## 背景与诉求

切换器（Switcher，第一面板）是用户高频浏览与多模态检索的主工作面：
- 页签缩略图网格中的卡片（`.sw__card`）此前采用单一背景与旧式复合阴影，未能与全局双层微底（浅色托底、白卡浮起）和 Bento 软影深度体系完全对齐；
- 检索分屏中的文档速览浮窗（`.sw__doc-preview`）在后置样式切片 `_11-ui-polish.scss` 中残留了旧式阴影覆写，导致现代 Bento 软影被冲刷回退；
- 卡片聚焦与激活态（`.sw__focused` / `.sw__active`）此前使用了 1px 细内阴影，在缩略图边缘容易造成裁切感。

## 架构决策与设计

1. **页签卡片白卡浮起与 Bento 深度软影（T-7722）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 中将 `.sw__card` 背景升级为 `var(--sw-card-float-bg, var(--b3-theme-surface))`，阴影收敛至 `var(--sw-shadow-bento)`；
   - 悬浮态（`:hover`）注入 `transform: translateY(-2px);` 与多层弥散软影，赋予轻快上浮质感。

2. **文档速览浮窗材质收敛与防覆盖闭环（T-7723）**：
   - 在 `src/styles/_11-ui-polish.scss` 中彻底清除覆写旧阴影的规则，统一将 `.sw__doc-preview` 收敛至 `var(--sw-card-float-bg)` 白卡浮起、14px 圆角与 `var(--sw-shadow-bento)`。

3. **外发光复合光环与消灭内阴影切边（T-7724）**：
   - 将 `.sw__card.sw__focused` 与 `.sw__card.sw__active` 统合为 `box-shadow: 0 0 0 1.5px var(--sw-color-accent, var(--b3-theme-primary)), var(--sw-shadow-bento);`；
   - 彻底消灭内阴影对卡片缩略图外围的视觉切割，使高亮态自然向外呼吸。

4. **契约测试与负向验证（T-7725）**：
   - 新增专项测试 `tests/switcher-card-and-preview-bento-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当页签卡片丢失 Bento 软影或文档速览浮窗丢失白卡浮起背景时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/switcher-card-and-preview-bento-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 9 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
