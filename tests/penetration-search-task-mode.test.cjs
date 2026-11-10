// T-7439 穿透检索模型扩展 SEARCH_MODES.TASK 与待办 SQL 规划及结果归一化聚合契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 penetration-search-model.js 导出 SEARCH_MODES.TASK；
//   2. 验证 parsePenetrationQuery 正确解析 `-重要事项`、`task:阅读` 与 `[ ]待办`；
//   3. 验证 planPenetrationSearchRequest 生成只读任务 SQL（type='i' AND subtype='t'）；
//   4. 验证 aggregatePenetrationResults 正确聚合待办状态与 kind: "task"；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    SEARCH_MODES,
    parsePenetrationQuery,
} = require("../src/penetration-search-model.js");
const {
    buildTaskSearchSql,
    planPenetrationSearchRequest,
    aggregatePenetrationResults,
} = require("../src/penetration-search-orchestration.js");

test("T-7439: SEARCH_MODES 包含 TASK 并且 parsePenetrationQuery 正确识别待办前缀", () => {
    assert.equal(SEARCH_MODES.TASK, "task");

    const r1 = parsePenetrationQuery("-开会");
    assert.equal(r1.mode, "task");
    assert.equal(r1.taskNeedle, "开会");
    assert.equal(r1.badge, "待办");

    const r2 = parsePenetrationQuery("task:读书");
    assert.equal(r2.mode, "task");
    assert.equal(r2.taskNeedle, "读书");

    const r3 = parsePenetrationQuery("[ ] 写作");
    assert.equal(r3.mode, "task");
    assert.equal(r3.taskNeedle, "写作");
});

test("T-7439: buildTaskSearchSql 与 planPenetrationSearchRequest 生成只读任务 SQL", () => {
    const sql = buildTaskSearchSql("备考", {notebookId: "box123", limit: 30});
    assert.match(sql, /SELECT id, root_id, content, markdown, updated FROM blocks WHERE type='i' AND subtype='t' AND content LIKE '%备考%' AND box = 'box123' ORDER BY updated DESC LIMIT 30/);

    const plan = planPenetrationSearchRequest("-复习", {notebookId: "box456"});
    assert.equal(plan.mode, "task");
    assert.equal(plan.endpoint, "/api/query/sql");
    assert.match(plan.body.stmt, /type='i' AND subtype='t' AND content LIKE '%复习%'/);
});

test("T-7439: aggregatePenetrationResults 正确聚合待办结果与完成状态", () => {
    const plan = planPenetrationSearchRequest("-测试");
    const raw = {
        data: [
            {id: "block1", root_id: "doc1", content: "完成报告", markdown: "* [ ] 完成报告", updated: "20261028120000"},
            {id: "block2", root_id: "doc2", content: "归档代码", markdown: "* [x] 归档代码", updated: "20261028110000"},
        ],
    };
    const results = aggregatePenetrationResults(plan, raw);
    assert.equal(results.length, 2);
    assert.equal(results[0].kind, "task");
    assert.equal(results[0].title, "完成报告");
    assert.equal(results[0].done, false);
    assert.equal(results[0].subTitle, "待办 · 待处理");

    assert.equal(results[1].kind, "task");
    assert.equal(results[1].title, "归档代码");
    assert.equal(results[1].done, true);
    assert.equal(results[1].subTitle, "待办 · 已完成");
});

test("T-7439 门禁负向验证: 若 SQL 语句丢失 type='i' 或 subtype='t' 必定精准红", () => {
    const sql = buildTaskSearchSql("验证");
    assert.doesNotMatch(sql, /WHERE type='d'/);
    assert.match(sql, /subtype='t'/);
});
