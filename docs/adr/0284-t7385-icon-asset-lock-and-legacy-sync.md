# ADR 0284：T-7385 殿堂级最新头像锁定与全尺寸资产对齐 (v0.48.27)

日期：2026-10-25  
状态：accepted  
任务：T-7385  

## 背景

用户反馈：“你确认下头像是否已更换为最新设计的头像。目前我看还是以前老的头像，确认并锁定。”
经仓库全量资产深度审计：
1. **根目录与打包产物**：
   - 根目录 `icon.png` 与生产打包 `dist/icon.png`、`package.zip` 内部打入的 `icon.png`，均为 ADR 0260 引入的星际紫背景 + 三层毛玻璃白色叠层卡片 + 金黄色雷切穿透闪电 + 右下角立体微发光金属悬浮金球（256×256，物理字节严格等于 65,989 B，SHA-256 散列为 `f562b06568f6a641c4c57beb1992af9dc6c6003bfa66b64f60b2d76263fe799f`）；
2. **文档资产（`docs/assets/`）未同步缺陷**：
   - `docs/assets/icon-160.png`、`icon-48.png`、`icon-32.png`、`icon-24.png`、`icon-16.png` 五个衍生尺寸此前仍滞留为最初的旧版纯蓝色闪电图标（12,057 B 等）；当文档、引用链或外部平台读取这些资产时，呈现的依然是老头像；
3. **客户端缓存机制**：
   - 思源笔记客户端（Chromium / Electron 内核）对插件静态资源 `icon.png` 存在持久磁盘缓存；若未强制刷新或重新安装插件，前端会继续显示本地缓存的旧图标。

## 决策

1. **衍生尺寸资产全量高清对齐**：
   - 从 256×256 殿堂级 `icon.png` 原稿进行高保真等比下采样，全量覆盖替换 `docs/assets/` 下全部尺寸（160px / 48px / 32px / 24px / 16px），彻底消灭仓库任何角落的老旧蓝色图标残留；
2. **专属头像契约测试与散列硬锁定**：
   - 建立 `tests/icon-asset-lock-contract.test.cjs`，对根目录 `icon.png`、`dist/icon.png`、`package.zip` 内解压图标以及 `docs/assets/` 各衍生图标进行物理大小、SHA-256 散列硬锁定与负向防退化断言；
3. **版本号晋级（v0.48.27）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.27`。

## 证据与验证

1. **专属头像锁定契约测试**：`tests/icon-asset-lock-contract.test.cjs` 4/4 通过（含物理大小、SHA-256、解压内联校验与真实负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
