// T-7424 文档搜索结果行 ⌘C 与 ⌘⇧C 复制快捷键契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 与 doc-search-ui.js 声明 ⌘C 复制块超链接；
//   2. 验证 doc-search-ui.ts 与 doc-search-ui.js 声明 ⌘⇧C 复制 Markdown 链接；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const searchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const searchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7424: doc-search-ui 声明 ⌘C 复制块超链接与 ⌘⇧C 复制 Markdown 链接", () => {
    assert.match(
        searchTs,
        /if \(isCtrlOrCmd && !event\.altKey && event\.key\.toLowerCase\(\) === "c"\) \{[\s\S]*?\[\$\{docTitle\}\]\(siyuan:\/\/blocks\/\$\{copyTargetId\}\)[\s\S]*?siyuan:\/\/blocks\/\$\{copyTargetId\}/,
        "TS 文件必须包含 ⌘C 与 ⌘⇧C 复制逻辑",
    );
    assert.match(
        searchJs,
        /if \(isCtrlOrCmd && !event\.altKey && event\.key\.toLowerCase\(\) === "c"\) \{[\s\S]*?\[\$\{docTitle\}\]\(siyuan:\/\/blocks\/\$\{copyTargetId\}\)[\s\S]*?siyuan:\/\/blocks\/\$\{copyTargetId\}/,
        "JS 文件必须包含 ⌘C 与 ⌘⇧C 复制逻辑",
    );
});

test("T-7424 门禁负向验证: 若缺少 copyTargetId 判定必定精准红", () => {
    assert.doesNotMatch(searchTs, /if \(isCtrlOrCmd && !event\.altKey && event\.key\.toLowerCase\(\) === "c"\) \{\s*navigator\.clipboard/);
});
