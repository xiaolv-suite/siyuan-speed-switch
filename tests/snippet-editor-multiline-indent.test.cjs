"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const studioJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));

test("T-7495: editor 支持多行选区 Tab 批量缩进与 Shift+Tab 批量反向退格", () => {
    assert.match(
        studioJs,
        /start !== end && val\.substring\(start, end\)\.includes\("\\n"\)/,
        "必须精确识别包含换行符的多行选区",
    );
    assert.match(
        studioJs,
        /if \(event\.shiftKey\) \{[\s\S]*?let cut = 0;[\s\S]*?if \(line\.startsWith\("  "\)\) cut = 2;/,
        "多行反向缩进必须扣减至多 2 个前导空格",
    );
    assert.match(
        studioJs,
        /editor\.selectionStart = Math\.max\(lineStart, start - deltaFirst\);/,
        "反向缩进必须平滑保持选区起点",
    );
});

test("T-7495: editor 支持单行光标 Shift+Tab 当前行反向退格", () => {
    assert.match(
        studioJs,
        /if \(event\.shiftKey\) \{[\s\S]*?const lineStart = val\.lastIndexOf\("\\n", start - 1\) \+ 1;[\s\S]*?if \(line\.startsWith\("  "\)\) cut = 2;/,
        "单行必须支持 Shift+Tab 快速反向退格",
    );
});
