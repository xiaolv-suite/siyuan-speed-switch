// T-7434 动作画板接入 Task Horizon 今日任务直达契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-model.js 包含 task-horizon-today 动作定义；
//   2. 验证 index.ts 与 index.js 声明 executeTaskHorizonToday；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");
const {getBuiltinActionDefinitions} = require("../src/action-palette-model.js");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7434: action-palette-model.js 包含 task-horizon-today 动作", () => {
    const actions = getBuiltinActionDefinitions({
        actionPaletteTaskHorizon: "任务视界：查看今日任务",
    });
    const found = actions.find((a) => a.id === "task-horizon-today");
    assert.ok(found, "必须存在 task-horizon-today 动作");
    assert.equal(found.shortcut, "⌥H");
    assert.equal(found.label, "任务视界：查看今日任务");
});

test("T-7434: index.ts 与 index.js 包含 executeTaskHorizonToday 声明", () => {
    assert.match(
        indexTs,
        /executeTaskHorizonToday\(onDestroy\?: \(\) => void\): Promise<boolean>/,
        "index.ts 必须声明 executeTaskHorizonToday",
    );
    assert.match(
        indexJs,
        /async executeTaskHorizonToday\(onDestroy\) \{/,
        "index.js 必须声明 executeTaskHorizonToday",
    );
});

test("T-7434 门禁负向验证: 若画板定义移除了 task-horizon-today 必定精准红", () => {
    const actions = getBuiltinActionDefinitions();
    assert.ok(actions.some((a) => a.id === "task-horizon-today"));
});
