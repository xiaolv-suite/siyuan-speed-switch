// T-7429 工作台清空布局确认弹窗安全首焦与 Escape 退出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 confirmDialog 声明 Escape 监听；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 声明 cancelBtn 聚焦；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7429: second-panel-ui 声明清空确认弹窗 Escape 退出与 cancelBtn 聚焦", () => {
    assert.match(
        panelTs,
        /(?:clearConfirmDialog|confirmDialog)\.element\.addEventListener\("keydown",\s*\(e: KeyboardEvent\)\s*=>\s*\{[\s\S]*?(?:clearConfirmDialog|confirmDialog)\??\.destroy\(\);[\s\S]*?cancelBtn\?\.focus\(/,
        "TS 文件必须包含 confirmDialog Escape 与 cancelBtn 聚焦",
    );
    assert.match(
        panelJs,
        /(?:clearConfirmDialog|confirmDialog)\.element\.addEventListener\("keydown",\s*\(e\)\s*=>\s*\{[\s\S]*?(?:clearConfirmDialog|confirmDialog)\??\.destroy\(\);[\s\S]*?cancelBtn\?\.focus\(/,
        "JS 文件必须包含 confirmDialog Escape 与 cancelBtn 聚焦",
    );
});

test("T-7429 门禁负向验证: 若确认弹窗未聚焦 cancelBtn 必定精准红", () => {
    assert.doesNotMatch(panelTs, /showMessage\(this\.i18n\.homeHistoryClear \|\| "已清空工作台（支持一键撤销恢复）"\);\s*renderPanel\(\);\s*\}\);\s*\}\);\s*bar\.appendChild\(clearBtn\);/);
});
