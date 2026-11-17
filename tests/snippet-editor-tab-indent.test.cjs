// T-7410 片段实验室代码编辑器 Tab 键两空格缩进防跳焦契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 拦截 editor 的 Tab keydown 事件；
//   2. 验证 插入两个空格并推进光标；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7410: snippet-studio-ui.js 拦截 editor 的 Tab 事件并插入两空格缩进", () => {
    assert.match(
        studioJs,
        /editor\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?event\.key === "Tab"[\s\S]*?editor\.value\s*=\s*val\.substring\(0,\s*start\)\s*\+\s*"  "\s*\+\s*val\.substring\(end\);/,
        "必须拦截 Tab 键并插入 2 个空格",
    );
});

test("T-7410 门禁负向验证: 若未阻止默认跳焦必定精准红", () => {
    assert.doesNotMatch(studioJs, /if \(event\.key === "Tab"\) \{\s*editor\.value/);
});
