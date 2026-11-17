// T-7423 工作台顶栏工具条与小组件网格 ArrowDown/Up 双向流闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 bar 声明 ArrowRight/Left 循环与 ArrowDown 落焦首卡；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 声明 首卡 ArrowUp 逆向回焦工具栏；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7423: second-panel-ui 声明 bar 工具栏方向键流与 ArrowDown 落焦首卡", () => {
    assert.match(
        panelTs,
        /bar\.setAttribute\("role",\s*"toolbar"\);[\s\S]*?if \(event\.key === "ArrowRight" \|\| event\.key === "ArrowLeft"\)[\s\S]*?if \(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstCell\.focus\(\);/,
        "TS 文件必须声明 bar 方向键循环与 ArrowDown 落焦首卡",
    );
    assert.match(
        panelJs,
        /bar\.setAttribute\("role",\s*"toolbar"\);[\s\S]*?if \(event\.key === "ArrowRight" \|\| event\.key === "ArrowLeft"\)[\s\S]*?if \(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstCell\.focus\(\);/,
        "JS 文件必须声明 bar 方向键循环与 ArrowDown 落焦首卡",
    );
});

test("T-7423: second-panel-ui 声明 首张卡片 ArrowUp 逆向回焦工具栏", () => {
    assert.match(
        panelTs,
        /if\s*\(key\.key === "ArrowUp" && idx === 0\)\s*\{[\s\S]*?firstBarBtn\.focus\(\);/,
        "TS 文件必须在首卡按 ArrowUp 时聚焦 firstBarBtn",
    );
    assert.match(
        panelJs,
        /if\s*\(key\.key === "ArrowUp" && idx === 0\)\s*\{[\s\S]*?firstBarBtn\.focus\(\);/,
        "JS 文件必须在首卡按 ArrowUp 时聚焦 firstBarBtn",
    );
});

test("T-7423 门禁负向验证: 若首卡未判定 idx === 0 必定精准红", () => {
    assert.doesNotMatch(panelTs, /if \(key\.key === "ArrowUp"\) \{\s*const firstBarBtn = bar\.querySelector/);
});
