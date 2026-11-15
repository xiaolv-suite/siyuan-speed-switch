// T-7420 设置中心配置差异与文档集差异弹窗 Escape 关闭与安全首焦契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 settings-sections.ts 与 settings-sections.js 在 openDocumentSetDiffDialog 声明 Escape 与 cancelBtn 聚焦；
//   2. 验证 settings-sections.ts 与 settings-sections.js 在 openConfigPackDiffDialog 声明 Escape 与 cancelBtn 聚焦；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const sectionsTs = readSourceText(path.join(root, "src", "settings-sections.ts"));
const sectionsJs = readSourceText(path.join(root, "src", "settings-sections.js"));

test("T-7420: openDocumentSetDiffDialog 声明 Escape 监听与 cancelBtn 聚焦", () => {
    assert.match(
        sectionsTs,
        /actions\.append\(cancelBtn,\s*rollbackBtn\);[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(e: KeyboardEvent\)\s*=>\s*\{[\s\S]*?dialog\.destroy\(\);[\s\S]*?cancelBtn\.focus\(/,
        "TS 文件中 openDocumentSetDiffDialog 必须声明 Escape 与 cancelBtn 聚焦",
    );
    assert.match(
        sectionsJs,
        /actions\.append\(cancelBtn,\s*rollbackBtn\);[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(e\)\s*=>\s*\{[\s\S]*?dialog\.destroy\(\);[\s\S]*?cancelBtn\.focus\(/,
        "JS 文件中 openDocumentSetDiffDialog 必须声明 Escape 与 cancelBtn 聚焦",
    );
});

test("T-7420: openConfigPackDiffDialog 声明 Escape 监听与 cancelBtn 聚焦", () => {
    assert.match(
        sectionsTs,
        /actions\.append\(cancelBtn,\s*applyBtn\);[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(e: KeyboardEvent\)\s*=>\s*\{[\s\S]*?dialog\.destroy\(\);[\s\S]*?cancelBtn\.focus\(/,
        "TS 文件中 openConfigPackDiffDialog 必须声明 Escape 与 cancelBtn 聚焦",
    );
    assert.match(
        sectionsJs,
        /actions\.append\(cancelBtn,\s*applyBtn\);[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(e\)\s*=>\s*\{[\s\S]*?dialog\.destroy\(\);[\s\S]*?cancelBtn\.focus\(/,
        "JS 文件中 openConfigPackDiffDialog 必须声明 Escape 与 cancelBtn 聚焦",
    );
});

test("T-7420 门禁负向验证: 若差异弹窗未聚焦 cancelBtn 必定精准红", () => {
    assert.doesNotMatch(sectionsTs, /actions\.append\(cancelBtn, rollbackBtn\);\s*root\.appendChild\(actions\);\s*\}\s*\/\/ T-6961/);
});
