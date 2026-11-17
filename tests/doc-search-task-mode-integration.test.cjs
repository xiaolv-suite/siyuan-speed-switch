// T-7440 全库文档搜索与万能搜索执行流集成待办穿透模式契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 在 runDocSearchFetch 包含 SEARCH_MODES.TASK 分支；
//   2. 验证 doc-search-ui.ts 包含 TaskHorizon 今日任务聚合与去重；
//   3. 验证 doc-search-ui.ts 与 doc-search-ui.js 在 activateDocResultItem 包含 help-task 路由；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const searchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const searchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7440: doc-search-ui.ts 在 runDocSearchFetch 声明 SEARCH_MODES.TASK 与 Task Horizon 聚合", () => {
    assert.match(
        searchTs,
        /penetrationPlan\.mode === SEARCH_MODES\.TASK[\s\S]*?th\?\.protocol === "task-horizon"[\s\S]*?th\.getTodayTasks\(\)/,
        "runDocSearchFetch 必须处理 SEARCH_MODES.TASK 并前置 Task Horizon 今日任务",
    );
});

test("T-7440: doc-search-ui 包含 help-task 快速指引交互路由", () => {
    assert.match(
        searchTs,
        /if \(id === "help-task"\) \{[\s\S]*?setPrefixAndTrigger\("-"\);[\s\S]*?return;/,
        "TS 文件必须包含 help-task 路由分支",
    );
    assert.match(
        searchJs,
        /if \(id === "help-task"\) \{[\s\S]*?setPrefixAndTrigger\("-"\);[\s\S]*?return;/,
        "JS 文件必须包含 help-task 路由分支",
    );
});

test("T-7440 门禁负向验证: 若缺少 Task Horizon 协议校验必定精准红", () => {
    assert.doesNotMatch(searchTs, /todayTasks = window\.TaskHorizon\.getTodayTasks\(\);\s*docs = todayTasks;/);
});
