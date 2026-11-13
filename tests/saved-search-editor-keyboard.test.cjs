// T-7414 保存搜索编辑弹窗表单获焦全选与 Enter 快捷保存闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 与 doc-search-ui.js 在 openSavedSearchEditor 中声明 field.select()；
//   2. 验证 doc-search-ui.ts 与 doc-search-ui.js 声明 onFieldKeydown Enter 快捷保存；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const searchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const searchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7414: doc-search-ui.ts 包含 focus select() 与 Enter 快捷保存", () => {
    assert.match(
        searchTs,
        /\[nameField\.input,\s*queryField\.input\]\.forEach\(\(field\)\s*=>\s*\{[\s\S]*?field\.select\(\);/,
        "TS 文件必须绑定 focus select()",
    );
    assert.match(
        searchTs,
        /if\s*\(e\.key === "Enter" && !saveBtn\.disabled && !e\.isComposing\)\s*\{[\s\S]*?saveBtn\.click\(\);/,
        "TS 文件必须绑定 Enter saveBtn.click()",
    );
});

test("T-7414: doc-search-ui.js 包含 focus select() 与 Enter 快捷保存", () => {
    assert.match(
        searchJs,
        /\[nameField\.input,\s*queryField\.input\]\.forEach\(\(field\)\s*=>\s*\{[\s\S]*?field\.select\(\);/,
        "JS 文件必须绑定 focus select()",
    );
    assert.match(
        searchJs,
        /if\s*\(e\.key === "Enter" && !saveBtn\.disabled && !e\.isComposing\)\s*\{[\s\S]*?saveBtn\.click\(\);/,
        "JS 文件必须绑定 Enter saveBtn.click()",
    );
});

test("T-7414 门禁负向验证: 若缺少 !saveBtn.disabled 检查导致空查询误保存必定精准红", () => {
    assert.doesNotMatch(searchTs, /if \(e\.key === "Enter"\) \{\s*e\.preventDefault\(\);\s*saveBtn\.click/);
});
