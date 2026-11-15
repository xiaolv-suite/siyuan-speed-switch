// T-7452 代码片段包导入策略弹窗安全首焦与 ⌘Enter 快捷导入契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 chooseImportMode 声明 cancel.focus() 安全首焦；
//   2. 验证 snippet-studio-ui.js 在 keydown 声明 ⌘Enter 快捷确认与左右方向键流；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7452: snippet-studio-ui.js 在 chooseImportMode 声明安全首焦与 ⌘Enter 导入", () => {
    assert.match(
        studioJs,
        /if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"\) \{[\s\S]*?close\(selectMode\.value\);[\s\S]*?if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\)/,
        "必须声明 ⌘Enter 快捷导入与左右方向键流",
    );
    assert.match(
        studioJs,
        /cancel\.focus\?\.\(?\{preventScroll:\s*true\}/,
        "必须默认安全聚焦 cancel 按钮",
    );
});

test("T-7452 门禁负向验证: 若仍默认聚焦 confirm 按钮必定精准红", () => {
    assert.doesNotMatch(
        studioJs,
        /confirm\.addEventListener\("click",\s*\(\)\s*=>\s*close\(selectMode\.value\)\);\s*confirm\.focus\?\.\(?\{preventScroll:\s*true\}/,
    );
});
