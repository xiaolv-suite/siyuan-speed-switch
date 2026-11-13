# ADR 0507：动作画板 Bento 阴影收敛、光标平滑流转与键帽按压反馈（T-7706~T-7709）

## 背景与诉求

动作画板（Action Palette，通过 `⌘K` / `Ctrl+K` 唤出）是桌面端高频键盘驱动的核心弹窗浮层：
- 画板外框此前残留硬编码字面量阴影 `0 16px 40px...`，未能统一接入设计令牌 `--sw-shadow-bento`；
- 键盘在条目间使用方向键（↑ / ↓）导航时，高亮项仅有静态底色变化，缺少现代键盘启动流的横向平滑微动效连续性；
- 快捷键机械键帽虽已具备 2px 物理凸起底边与渐变质感，但点击时缺少 `:active` 的真实物理下沉反馈；
- 条目内图标在被选中时缺乏专属的高光主题色联动。

## 架构决策与设计

1. **外壳阴影与微底收敛（T-7706）**：
   - 将 `.sw__palette` 外壳容器阴影统一收敛至 `var(--sw-shadow-bento)`，清除硬编码字面量；
   - 背景显式接入 `var(--sw-card-float-bg)`，圆角按几何推导统合为 `var(--sw-radius-card, 14px)`；
   - 搜索框底部分隔线升级为柔和半透明线 `var(--sw-color-line-soft)`。

2. **条目键盘选中光标平滑微位移（T-7707）**：
   - 为 `.sw__palette-item.is-selected` 注入平滑微位移 `transform: translateX(1.5px);`；
   - 动画过渡接入 `$sw-dur-fast $sw-ease`，在键盘高速连续切项时呈现如丝般顺滑的跟随流转感官。

3. **图标高光联动与键帽物理下沉（T-7708）**：
   - 选中项内图标 `.sw__palette-item.is-selected .sw__palette-item-icon svg` 增强为 `transform: scale(1.08)` 微动效；
   - 机械键帽 `.sw__palette-item-shortcut` 声明 `&:active { transform: translateY(1px); }`，提供触觉级的物理按压反馈。

4. **契约测试与负向验证（T-7709）**：
   - 新增专项测试 `tests/action-palette-visual-and-motion-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当选中项平滑位移丢失或退回字面量阴影时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/action-palette-visual-and-motion-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 5 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
