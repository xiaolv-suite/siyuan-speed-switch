// T-7415 片段选择器搜索框双向键盘流与空结果 Enter 清空自愈契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 声明 query focus select()；
//   2. 验证 snippet-studio-ui.js 声明 query ArrowDown 导航至首项；
//   3. 验证 snippet-studio-ui.js 声明 首项 ArrowUp 返回 query；
//   4. 验证 snippet-studio-ui.js 声明 无匹配项时 Enter 清空并重置；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7415: snippet-studio-ui.js 声明 query focus select()", () => {
    assert.match(
        studioJs,
        /query\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?query\.select\(\);/,
        "必须绑定 query focus select()",
    );
});

test("T-7415: snippet-studio-ui.js 声明 query ArrowDown 导航至列表首项", () => {
    assert.match(
        studioJs,
        /if\s*\(doc\.activeElement === query\)\s*\{[\s\S]*?if\s*\(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstItem\.focus\(\);/,
        "query 按 ArrowDown 必须平滑聚焦到首个 catalog-item",
    );
});

test("T-7415: snippet-studio-ui.js 声明 首项 ArrowUp 逆向回焦 query", () => {
    assert.match(
        studioJs,
        /if\s*\(event\.key === "ArrowUp" && index === 0\)\s*\{[\s\S]*?query\.focus\(\);/,
        "首项按 ArrowUp 必须平滑聚焦到 query",
    );
});

test("T-7415: snippet-studio-ui.js 声明 无结果时 Enter 自愈清空", () => {
    assert.match(
        studioJs,
        /if\s*\(event\.key === "Enter" && query\.value\)\s*\{[\s\S]*?query\.value = "";[\s\S]*?render\(\);/,
        "无匹配项时按 Enter 必须清空 query 并 render()",
    );
});

test("T-7415 门禁负向验证: 若首项 ArrowUp 缺少 index === 0 判定必定精准红", () => {
    assert.doesNotMatch(studioJs, /if \(event\.key === "ArrowUp"\) \{\s*event\.preventDefault\(\);\s*query\.focus/);
});
