# 0336. T-7439 穿透检索模型扩展 SEARCH_MODES.TASK 与待办 SQL 规划及结果归一化聚合契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7439

## 背景与上下文

在快速检索中，用户经常需要穿透查询全库待办事项（`-待办` 或 `task:关键词`）。
此前穿透检索模型中定义了 `DOC`、`OUTLINE`、`BLOCK`、`TAG`、`BOOKMARK`、`COMMAND`、`HELP`，但缺少专用的 `TASK` 模式；用户输入待办前缀时未能被识别为独立的穿透检索类型。

## 架构决策

1. **枚举扩展与前缀解析**：
   - 在 `SEARCH_MODES` 中加入 `TASK: "task"`；
   - 在 `MODE_BADGES` 中声明 `{key: "task", defaultBadge: "待办", icon: "iconCheck", prefix: "-"}`；
   - 在 `parsePenetrationQuery` 中识别 `-`、`－`、`task:`、`task：`、`[ ]`，解析提取 `taskNeedle` 与 `badge`。
2. **待办任务 SQL 请求规划**：
   - 构造安全只读 SQL：`SELECT id, root_id, content, markdown, updated FROM blocks WHERE type='i' AND subtype='t'${contentFilter}${notebookFilter} ORDER BY updated DESC LIMIT ${limit}`；
   - 保持只读与界限保护，禁止写入操作。
3. **响应归一化聚合**：
   - 在 `aggregatePenetrationResults` 中识别 `SEARCH_MODES.TASK`；
   - 解析 `markdown` 提取完成态（`[x]` 为已完成），输出 `kind: "task"` 标准条目。
4. **门禁与测试**：
   - 新增 `tests/penetration-search-task-mode.test.cjs`；
   - 负向验证：若未配置 TASK 模式或 SQL 语句包含写操作，断言必须精准红。

## 后果与影响

- 建立全库待办穿透检索领域模型与只读 SQL 规划；
- 与 Raycast 模式及快捷待办前缀无缝互通。
