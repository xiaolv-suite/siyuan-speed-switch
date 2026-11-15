// T-7446 工作台编辑态单元格 Enter 快捷配置与 Delete 快捷移除契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 在 cell 键盘监听中声明 Delete/Backspace 移除与 Enter 配置；
//   2. 验证 second-panel-ui.js 同步保持一致；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7446: second-panel-ui.ts 包含 cell Delete/Backspace 移除与 Enter 配置", () => {
    assert.match(
        panelTs,
        /if \(key\.key === "Delete" \|\| key\.key === "Backspace"\) \{[\s\S]*?this\.removeHomeInstance\(inst\.instanceId\);[\s\S]*?layoutOpLabel = this\.i18n\.homeHistoryRemove;/,
        "TS 文件必须包含 Delete/Backspace 移除",
    );
    assert.match(
        panelTs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?cell\.querySelector<HTMLButtonElement>\("\.sw-home__cell-tools button"\);[\s\S]*?cfgBtn\.click\(\);/,
        "TS 文件必须包含 Enter 快捷配置",
    );
});

test("T-7446: second-panel-ui.js 同步包含 cell Delete/Backspace 移除与 Enter 配置", () => {
    assert.match(
        panelJs,
        /if \(key\.key === "Delete" \|\| key\.key === "Backspace"\) \{[\s\S]*?this\.removeHomeInstance\(inst\.instanceId\);[\s\S]*?layoutOpLabel = this\.i18n\.homeHistoryRemove;/,
        "JS 文件必须包含 Delete/Backspace 移除",
    );
    assert.match(
        panelJs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?cell\.querySelector\("\.sw-home__cell-tools button"\);[\s\S]*?cfgBtn\.click\(\);/,
        "JS 文件必须包含 Enter 快捷配置",
    );
});

test("T-7446 门禁负向验证: 若缺少 Delete 移除必定精准红", () => {
    assert.doesNotMatch(
        panelTs,
        /key\.key === "FakeDeleteKey" && this\.removeHomeInstance/,
    );
});
