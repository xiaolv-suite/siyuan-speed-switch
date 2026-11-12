// T-7421 悬浮球更多抽屉搜索框获焦自动全选与列表项 ArrowUp/Down 双向流闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 floating-ball-panel.js 声明 searchInput focus select()；
//   2. 验证 floating-ball-panel.js 声明 listHost ArrowDown/ArrowUp 循环流；
//   3. 验证 floating-ball-panel.js 声明 首项 ArrowUp 逆向回焦 searchInput；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));

test("T-7421: floating-ball-panel.js 声明 searchInput focus select()", () => {
    assert.match(
        panelJs,
        /searchInput\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?searchInput\.select\(\);/,
        "必须声明 searchInput focus select()",
    );
});

test("T-7421: floating-ball-panel.js 声明 listHost ArrowDown/ArrowUp 循环流与首项回焦", () => {
    assert.match(
        panelJs,
        /listHost\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if\s*\(event\.key === "ArrowUp" && idx === 0\)\s*\{[\s\S]*?searchInput\.focus\(\);/,
        "首项按 ArrowUp 必须平滑回焦 searchInput",
    );
    assert.match(
        panelJs,
        /const nextIdx = \(idx \+ \(event\.key === "ArrowDown" \? 1 : -1\) \+ visibleButtons\.length\) % visibleButtons\.length;/,
        "必须声明 visibleButtons 循环导航",
    );
});

test("T-7421 门禁负向验证: 若首项 ArrowUp 缺少 idx === 0 判定必定精准红", () => {
    assert.doesNotMatch(panelJs, /if \(event\.key === "ArrowUp"\) \{\s*event\.preventDefault\(\);\s*if \(canFocus\(searchInput\)\) searchInput\.focus/);
});
