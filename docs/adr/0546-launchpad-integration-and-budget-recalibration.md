# ADR 0546: 小驴罗盘顶栏收敛接入与包体预算再校准

- **状态**：accepted
- **日期**：2026-11-03
- **关联任务**：`TASK-20261103-launchpad-topbar-integration`
- **关联 ADR**：ADR 0545（全生态统一通知系统与联合灾备）、ADR 0544（第二面板 Bento 3.0 重构）

---

## 1. 背景与目标

为了解决小驴系列 9 大插件在思源顶栏图标过度拥挤（一排 9 个小图标挤占顶栏）、找插件困难的痛点，本插件全面接入小驴生态标准「小驴罗盘 · 家族极速弹射坞」（Epoch 7 · Protocol v1.4.0）：
1. **自动出场**：装有 >= 2 个小驴插件时，顶栏自动收拢并升起【🐴 小驴罗盘】主入口，顶栏空间节省 80%；只有 1 个插件时自动退化为普通独立图标；
2. **三态呈现权限**：用户可在罗盘设置中自主决定本插件【📌 置顶在外 / 📥 仅在坞内 / 👁️ 彻底隐藏】；
3. **图标为绝对第一主角**：采用思源原生 1.85px 纯线条矢量 SVG 图标，消灭遮挡；
4. **二级快捷行动常驻**：提供 5 项真实业务深度操作（双栏对照、三栏专注、切片暂存导出、选区切片捕获、重置单栏布局）。

---

## 2. 生产落地与技术选型

1. **标准核心库接入**：引入 `src/libs/lv-notice-kit.ts` (Protocol v1.4.0)，内置去中心化自协商的 `lvLaunchpad` 引擎；
2. **生命周期注册**：在插件主类 `onload()` 中注册 `this.launchpadCleaner = lvLaunchpad.register(...)`，在 `onunload()` 干净注销；
3. **主入口与二级行动调度**：
   - `openMainView()`：直达雷切切换器主视图；
   - `handleQuickAction(action)`：调度分栏切换（`columns: 2` / `columns: 3` / `columns: 0`）、切片暂存抽屉呼出与选区文本极速捕获。

---

## 3. 包体预算再校准

引入小驴罗盘弹射坞引擎与二级行动分发管线后，生产产物如下：
- `dist/index.js`: 1,367,580 B（约 1335.5 KiB）
- `package.zip`: 731,954 B（约 714.8 KiB）
- `compressed index.js`: 370,597 B（约 361.9 KiB）

校准自律线：
- `RAW_BUNDLE_BUDGET_BYTES`: 由 1334 KiB -> 1340 KiB（1,372,160 B，留有 4,580 B >= 2000 B 健康余量）；
- `ARCHIVE_BUDGET_BYTES`: 由 716 KiB -> 718 KiB（735,232 B，留有 3,278 B >= 2000 B 健康余量）；
- `COMPRESSED_ENTRY_BUDGET_BYTES`: 维持 372 KiB（380,928 B，留有 10,331 B 健康余量）；
- `RAW_BUNDLE_BUDGET_ADR`: 钉为 `"0546"`。
