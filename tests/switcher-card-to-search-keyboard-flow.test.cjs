// T-7400 切换器首行卡片 ArrowUp 逆向直达搜索框全键盘流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 在首行卡片 ArrowUp 时寻找 .sw__search 并执行 focus()；
//   2. 验证 index.js 在首行卡片 ArrowUp 时寻找 .sw__search 并执行 focus()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7400: index.ts 在首行卡片 ArrowUp 时交还焦点给 .sw__search 搜索框", () => {
    assert.match(
        indexTs,
        /else if \(focusIndex - colCount < 0\) \{[\s\S]*?searchInput\.focus\(\);/,
        "index.ts 必须在首行卡片按 ArrowUp 时聚焦 searchInput",
    );
});

test("T-7400: index.js 在首行卡片 ArrowUp 时交还焦点给 .sw__search 搜索框", () => {
    assert.match(
        indexJs,
        /else if \(focusIndex - colCount < 0\) \{[\s\S]*?searchInput\.focus\(\);/,
        "index.js 必须在首行卡片按 ArrowUp 时聚焦 searchInput",
    );
});

test("T-7400 门禁负向验证: 若首行卡片 ArrowUp 依然硬编码锁定卡片必定精准红", () => {
    // 探针 1: 负向断言 index.ts 不应再包含无条件的单向锁死 Math.max(focusIndex - colCount, 0)
    assert.doesNotMatch(
        indexTs,
        /else if \(key === "ArrowUp" && plain\)\s*\{\s*event\.preventDefault\(\);\s*next = flowNav && flowNeighbor\(key\) >= 0 \? flowNeighbor\(key\) : Math\.max\(focusIndex - colCount, 0\);\s*\}/,
    );
});
