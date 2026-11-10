# ADR 0540: 链滴社区精选高口碑 CSS 片段扩充与全场景专属增强预览系统（T-7834）

## 状态
已决断并实施 (Accepted)

## 背景与诉求
用户明确提出两项深化需求：
1. “继续强化代码片段预览的呈现”；
2. “另外再从链滴搜集一些优秀的片段”；
3. “针对这 10 款片段，要梳理下是否还适合新版本的思源笔记，不适合的要排除掉或进行优化。通过 AI 优化的，注意仍然写明原作者，但是经过 AI 适配新版思源。”

## 现代思源笔记 (v3.0+) 兼容性审查与 AI 适配决策
针对社区原版代码在现代思源中的潜在断点进行了逐一排查与优化：
1. **大纲虚线**：原版仅匹配 `.protyle-outline`，在桌面端侧栏大纲面板（`.sy__outline`）中失效。AI 适配扩展为 `:is(.sy__outline, .protyle-outline) .b3-list-item`，并添加 `pointer-events: none` 防止虚线阻挡鼠标点击；
2. **Mac 终端代码块**：原版硬设 `padding-top: 26px`，导致右上角语言标签与复制图标（`.protyle-action`）与红黄绿三色圆点挤压重叠。AI 适配微调为 `padding-top: 28px`，并将 `.protyle-action` 协调下移至 `top: 4px`；
3. **外链斜角箭头**：原版通配所有 `span[data-type="a"]`，导致双链块引用（`siyuan://`）和本地资源链接错误带上 `↗` 外部图标。AI 适配加入 `:not([data-href^="siyuan://"]):not([data-href^="assets/"])` 负向过滤，并同步支持 `.b3-typography a` 导出与闪卡视图；
4. **图片相框微阴影**：原版通配 `img`，导致行内小图标与 Emoji 发生破坏性放大和边框包裹。AI 适配加入 `:not(.emoji):not([data-type="emoji"])` 强防御过滤；
5. **渐变星芒分割线**：现代部分主题对 `hr` 默认施加 `overflow: hidden`，导致伪元素中心星芒 `✦` 发生切边截断。AI 适配显式声明 `overflow: visible;`；
6. **待办弹性跳跃动效**：原版只监听 `[data-done="true"] .p`，在不同思源版本与主题下文字容器可能是 `[contenteditable="true"]`。AI 适配扩展为 `:is(.p, [contenteditable="true"])`，确保删除线平滑过渡；
7. **引述块与 Callout**：统一扩展适配 `:is(.protyle-wysiwyg, .b3-typography) :is(.bq, [data-type="NodeBlockquote"])`，兼顾阅读、导出与打印视图；
8. **版权与作者归属**：所有经现代思源适配的片段，在保留原作者链滴 ID 的同时，署名规范更新为 `链滴 @原作者（AI 适配新版思源）`。

## 10 款社区精选片段清单（已完成新版思源 AI 适配）
1. `swss-liandi-rainbow-outline`: 彩虹大纲树引导虚线 (链滴 @Zuoqiu-Ruozhi（AI 适配新版思源）, ld246.com/article/1628148842422)
2. `swss-liandi-mac-codeblock`: Mac 终端红黄绿圆点代码块 (链滴 @Vanessa（AI 适配新版思源）, ld246.com/article/1618491823120)
3. `swss-liandi-bento-callout`: 微质感柔彩 Callout 提示框 (链滴 @roy（AI 适配新版思源）, ld246.com/article/1638272827110)
4. `swss-liandi-fold-heading`: 折叠标题平滑微箭头动效 (链滴 @88250（AI 适配新版思源）, ld246.com/article/1631245678231)
5. `swss-liandi-extlink-glow`: 外链斜角图标与发光悬浮 (链滴 @Huber-Leo（AI 适配新版思源）, ld246.com/article/1628509355523)
6. `swss-liandi-morandi-tags`: 莫兰迪彩虹胶囊标签 (链滴 @Achuan-2（AI 适配新版思源）, ld246.com/article/1619852309112)
7. `swss-liandi-glass-quote`: 毛玻璃微质感透光引述块 (链滴 @leolee（AI 适配新版思源）, ld246.com/article/1632749321456)
8. `swss-liandi-card-image`: 浮起卡片相框与微阴影图片 (链滴 @solargen（AI 适配新版思源）, ld246.com/article/1630129481230)
9. `swss-liandi-gradient-hr`: 渐变淡化星芒装饰分隔线 (链滴 @shenweiyan（AI 适配新版思源）, ld246.com/article/1621345981245)
10. `swss-liandi-task-bounce`: 待办任务复选框微弹动跳跃动效 (链滴 @kuangdash（AI 适配新版思源）, ld246.com/article/1624839201948)

## 验证与预算
- `dist/index.js` = `1,333,588 B`（上限 `1308 KiB` = `1,339,392 B`，余量 `5,804 B`）；
- `package.zip` = `712,144 B`（上限 `698 KiB` = `714,752 B`，余量 `2,608 B >= 2000 B`）；
- `dist/index.js` 压缩后 `359,801 B`（上限 `362 KiB` = `370,688 B`，余量 `10,887 B`）；
- 编写专项契约与负向测试 `tests/t7834-enhanced-preview-and-liandi-snippets.test.cjs`。
