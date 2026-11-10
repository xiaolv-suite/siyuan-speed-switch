// T-7431 工作台组件健康监控诊断预览浮层 Escape 退出与摘要文本框获焦全选契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 preview 声明 Escape 与 ⌘Enter 快捷操作；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 声明 summaryField focus select()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7431: second-panel-ui 声明 summaryField focus select()", () => {
    assert.match(
        panelTs,
        /summaryField\.className = "b3-text-field sw-home-health__summary";[\s\S]*?summaryField\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?summaryField\.select\(\);/,
        "TS 文件必须绑定 summaryField focus select()",
    );
    assert.match(
        panelJs,
        /summaryField\.className = "b3-text-field sw-home-health__summary";[\s\S]*?summaryField\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?summaryField\.select\(\);/,
        "JS 文件必须绑定 summaryField focus select()",
    );
});

test("T-7431: second-panel-ui 声明 preview Escape 退出与 ⌘Enter 复制", () => {
    assert.match(
        panelTs,
        /preview\.addEventListener\("keydown",\s*\(event: KeyboardEvent\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?cancel\.click\(\);[\s\S]*?if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"\) \{[\s\S]*?copy\.click\(\);/,
        "TS 文件必须包含 preview Escape 与 ⌘Enter 逻辑",
    );
    assert.match(
        panelJs,
        /preview\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?cancel\.click\(\);[\s\S]*?if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"\) \{[\s\S]*?copy\.click\(\);/,
        "JS 文件必须包含 preview Escape 与 ⌘Enter 逻辑",
    );
});

test("T-7431 门禁负向验证: 若 preview 未绑定 Escape 必定精准红", () => {
    assert.doesNotMatch(panelTs, /previewActions\.append\(cancel, copy\);\s*preview\.append\(label, status, previewActions\);\s*listRoot\.hidden = true;\s*listRoot\.after\(preview\);/);
});
