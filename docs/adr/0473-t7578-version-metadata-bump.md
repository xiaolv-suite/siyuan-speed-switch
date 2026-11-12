# ADR 0473：版本元数据（package.json/plugin.json/README/CHANGELOG/ROADMAP）升级至 0.48.83（T-7578）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成系统缺陷自愈、性能回流消除与无障碍交互加固（T-7565 ~ T-7577）后，整个插件的代码实现、样式规则与 18 处二级弹窗标题栏已全面就绪。依据规范，发布元数据与双语说明文档必须精确结转至当前版本号 `0.48.83` / `v0.48.83`。

## 决策

1. **版本元数据升级**：
   - `package.json`：version 晋级为 `0.48.83`；
   - `plugin.json`：version 晋级为 `0.48.83`。
2. **双语 README 同步**：
   - `README.md` 与 `README.en-US.md`：徽标更新为 `version-0.48.83`、更新章节更新为 `v0.48.83`、底部版本声明更新为 `v0.48.83`。
3. **双语更新日志固化**：
   - `docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.83` 章节，详实记录全面质量优化的各项改动，并置于 `v0.48.82` 之前。
4. **开发路线结转**：
   - `ROADMAP.md`：基线版本精确结转为 `v0.48.83` 已就绪。

## 验证

- **契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 满分通过，涵盖元数据、双语 README、CHANGELOG 顺序与 ROADMAP 校验及负向探针。
