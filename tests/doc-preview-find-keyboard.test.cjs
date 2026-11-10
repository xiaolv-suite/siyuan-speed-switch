// T-7425 文档预览窗格页内查找框阶梯式 Escape 清空与聚焦自动全选加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 与 doc-search-ui.js 声明查找框 focus select()；
//   2. 验证 doc-search-ui.ts 与 doc-search-ui.js 声明 查找框 Escape 阶梯式清空与关闭；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const searchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const searchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7425: doc-search-ui 声明查找框 focus select()", () => {
    assert.match(
        searchTs,
        /input\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?input\.select\(\);/,
        "TS 文件必须声明 input focus select()",
    );
    assert.match(
        searchJs,
        /input\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?input\.select\(\);/,
        "JS 文件必须声明 input focus select()",
    );
});

test("T-7425: doc-search-ui 声明 查找框 Escape 阶梯式清空与关闭", () => {
    assert.match(
        searchTs,
        /if\s*\(input\.value\)\s*\{[\s\S]*?input\.value = "";[\s\S]*?runDocPreviewFind\.call\(this,\s*pane\);[\s\S]*?\} else \{[\s\S]*?setDocPreviewFindOpen\.call\(this,\s*pane,\s*false\);/,
        "TS 文件必须在有内容时清空，无内容时关闭",
    );
    assert.match(
        searchJs,
        /if\s*\(input\.value\)\s*\{[\s\S]*?input\.value = "";[\s\S]*?runDocPreviewFind\.call\(this,\s*pane\);[\s\S]*?\}[\s\S]*?else\s*\{[\s\S]*?setDocPreviewFindOpen\.call\(this,\s*pane,\s*false\);/,
        "JS 文件必须在有内容时清空，无内容时关闭",
    );
});

test("T-7425 门禁负向验证: 若有词时按 Escape 仍直接关闭必定精准红", () => {
    assert.doesNotMatch(searchTs, /else if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*setDocPreviewFindOpen\.call\(this, pane, false\);\s*\}/);
});
