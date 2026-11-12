# ADR 0513：平台指引弹窗 Rim Light 微光切面、双层微底与 Bento 白卡浮起（T-7734~T-7737）

## 背景与诉求

快速开始帮助指引（Platform Guide Dialog，通过顶栏问号或快速开始按钮唤出）是新老用户查阅三个工作面与全局快捷键的重要入门卡片：
- 指引弹窗容器（`platformGuideDialog`）此前未注入 `.sw-platform-dialog` 统一外壳类名，未能继承全局 18px 大圆角与内发光 1px 微光切面（Rim Light）；
- 指引面板内部采用单层背景，各步骤分节（`.sw-platform-guide__section`）缺少参考图标准双层微底（浅色托底、白卡浮起）与 Bento 深度软影；
- 当前激活分节与底部关闭按钮缺少焦点呼吸微环与现代全圆角软胶囊规范。

## 架构决策与设计

1. **指引弹窗容器接入平台外壳与 Rim Light（T-7734）**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `openPlatformGuide` 实例化段，为弹窗容器注入 `dialog.element.querySelector(".b3-dialog__container")?.classList.add("sw-platform-dialog", "sw-platform-dialog--guide")`；
   - 自动继承统一的 18px 大圆角、`var(--sw-shadow-bento)` 深度浮层与 `inset 0 0 0 1px` 微反光切面。

2. **双层微底托底与 Bento 白卡浮起（T-7735）**：
   - 在 `src/styles/_05-settings-widgets.scss` 中将 `.sw-platform-guide` 容器背景接入 `var(--sw-bg-tinted)` 浅色同族托底；
   - 各步骤卡片 `.sw-platform-guide__section` 升级为 `var(--sw-card-float-bg)` 白卡浮起、14px 圆角与 `var(--sw-shadow-bento)` 软影，hover 注入 `-1px` 上浮反馈。

3. **焦点呼吸微环与胶囊完成按钮（T-7736）**：
   - 当前分节 `.sw-platform-guide__section.is-current` 升级为 `box-shadow: 0 0 0 1.5px var(--sw-platform-accent), var(--sw-shadow-bento);`；
   - 完成按钮 `.sw-platform-guide__close` 升级为全圆角软胶囊（`border-radius: var(--sw-platform-radius-pill, 999px)`），并注入 `:hover` 柔影与 `:active` 缩放微动效。

4. **契约测试与负向验证（T-7737）**：
   - 新增专项测试 `tests/platform-guide-bento-and-rim-light-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当指引弹窗容器丢失外壳类名注入或分节丢失 Bento 软影时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/platform-guide-bento-and-rim-light-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 12 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
