// T-7433 对接 Task Horizon 官方协议与 setTaskStatus 写入回调契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-external-adapters.ts 与 .js 包含 task-horizon-today 注册；
//   2. 验证 index.ts 与 index.js 在 toggleHomeTaskBlock 包含 TaskHorizon setTaskStatus 分支；
//   3. 验证 index.ts 与 index.js 在 handleHomeItemAction 包含 task-horizon 点击跳转分支；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const adaptersTs = readSourceText(path.join(root, "src", "home-external-adapters.ts"));
const adaptersJs = readSourceText(path.join(root, "src", "home-external-adapters.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7433: home-external-adapters 包含 task-horizon-today 注册与 800ms 熔断", () => {
    assert.match(
        adaptersTs,
        /register\("task-horizon-today",[\s\S]*?wrapEcosystemModuleRead\(async \(\) => \{[\s\S]*?bridge\.getTodayTasks\(\)/,
        "TS 文件必须包含 task-horizon-today 注册",
    );
    assert.match(
        adaptersJs,
        /register\("task-horizon-today",[\s\S]*?wrapEcosystemModuleRead\)\(async \(\) => \{[\s\S]*?bridge\.getTodayTasks\(\)/,
        "JS 文件必须包含 task-horizon-today 注册",
    );
});

test("T-7433: toggleHomeTaskBlock 包含 TaskHorizon setTaskStatus 分支", () => {
    assert.match(
        indexTs,
        /if \(\(item as any\)\.source === "task-horizon" \|\| \(item as any\)\.pluginId === "siyuan-plugin-task-horizon"\) \{[\s\S]*?th\?\.protocol === "task-horizon"[\s\S]*?th\.setTaskStatus\(blockId,\s*targetStatus\)/,
        "index.ts 必须调用 TaskHorizon.setTaskStatus",
    );
    assert.match(
        indexJs,
        /if \(item\.source === "task-horizon" \|\| item\.pluginId === "siyuan-plugin-task-horizon"\) \{[\s\S]*?th\?\.protocol === "task-horizon"[\s\S]*?th\.setTaskStatus\(blockId,\s*targetStatus\)/,
        "index.js 必须调用 TaskHorizon.setTaskStatus",
    );
});

test("T-7433: handleHomeItemAction 包含 task-horizon 任务条目点击跳转文档块", () => {
    assert.match(
        indexTs,
        /const taskHorizonId = \(\(item as any\)\.source === "task-horizon"[\s\S]*?BLOCK_ID_RE\.test\(taskHorizonId\)[\s\S]*?openTab\(\{app:\s*this\.app,\s*doc:\s*\{id:\s*taskHorizonId/,
        "index.ts 必须支持点击任务跳转文档块",
    );
    assert.match(
        indexJs,
        /const taskHorizonId = \(item\.source === "task-horizon"[\s\S]*?constants_1\.BLOCK_ID_RE\.test\(taskHorizonId\)[\s\S]*?openTab\)[\s\S]*?doc:\s*\{ id:\s*taskHorizonId/,
        "index.js 必须支持点击任务跳转文档块",
    );
});

test("T-7433 门禁负向验证: 若缺少 protocol === task-horizon 检验必定精准红", () => {
    assert.doesNotMatch(indexTs, /item\.source === "task-horizon"\)\s*\{\s*return await th\.setTaskStatus/);
});
