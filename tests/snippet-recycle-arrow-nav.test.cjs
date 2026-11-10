// T-7418 代码片段回收站列表上下方向键流式焦点移动契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 openRecycleViewer 中声明 ArrowDown/ArrowUp 列表按钮循环导航；
//   2. 验证 严格限定 list.contains(doc.activeElement) 作用域；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7418: snippet-studio-ui.js 在 openRecycleViewer 声明列表 Arrow 方向键流", () => {
    assert.match(
        studioJs,
        /if\s*\(\["ArrowDown",\s*"ArrowUp"\]\.includes\(event\.key\)\s*&&\s*list\.contains\(doc\.activeElement\)\)\s*\{[\s\S]*?listButtons\[nextIdx\]\?\.focus/,
        "必须声明 list 内部的 ArrowDown/ArrowUp 按钮循环导航",
    );
});

test("T-7418 门禁负向验证: 若缺少 list.contains 判定导致无脑全局抢占必定精准红", () => {
    assert.doesNotMatch(studioJs, /if \(\["ArrowDown", "ArrowUp"\]\.includes\(event\.key\)\) \{\s*const listButtons = Array\.from/);
});
