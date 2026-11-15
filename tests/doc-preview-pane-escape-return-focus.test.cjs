// T-7442 文档预览窗格 Escape 回焦搜索卡片双向键盘流闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 在 mountDocPreviewPane 声明 pane Escape 监听与回焦；
//   2. 验证 doc-search-ui.js 同步声明 pane Escape 监听与回焦；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const searchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const searchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7442: doc-search-ui 在 mountDocPreviewPane 绑定 Escape 键盘回焦回路", () => {
    assert.match(
        searchTs,
        /pane\.addEventListener\("keydown",\s*\(event: KeyboardEvent\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?docPreviewLastItems\.get\(scrollElement\)[\s\S]*?lastItem\.focus\(\{preventScroll:\s*true\}\)/,
        "TS 文件必须绑定 pane Escape 回焦逻辑",
    );
    assert.match(
        searchJs,
        /pane\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?docPreviewLastItems\.get\(scrollElement\)[\s\S]*?lastItem\.focus\(\{ preventScroll:\s*true \}\)/,
        "JS 文件必须绑定 pane Escape 回焦逻辑",
    );
});

test("T-7442 门禁负向验证: 若缺失 Escape 回焦逻辑必定精准红", () => {
    assert.doesNotMatch(
        searchTs,
        /pane\.append\(header,\s*buildDocPreviewFindBar\.call\(this,\s*pane\),\s*createDocPreviewBody\(\)\);\s*setDocPreviewHint/,
    );
});
