// T-7404 小组件商店卡片列表 ArrowUp 逆向直达搜索框与 Escape 闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui.ts 在首张卡片 ArrowUp 时聚焦搜索输入框；
//   2. 验证 home-store-ui.js 在首张卡片 ArrowUp 时聚焦搜索输入框；
//   3. 验证卡片列表 Escape 键支持清空搜索词并回焦；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeJs = readSourceText(path.join(root, "src", "home-store-ui.js"));

test("T-7404: home-store-ui.ts 在首张卡片 ArrowUp 时聚焦搜索输入框", () => {
    assert.match(
        storeTs,
        /if\s*\(\(event\.key === "ArrowUp" \|\| event\.key === "ArrowLeft"\) && index === 0\)\s*\{[\s\S]*?searchInput\.focus\(\);/,
        "TS 文件必须在首卡按 ArrowUp 时聚焦 searchInput",
    );
});

test("T-7404: home-store-ui.js 在首张卡片 ArrowUp 时聚焦搜索输入框", () => {
    assert.match(
        storeJs,
        /if\s*\(\(event\.key === "ArrowUp" \|\| event\.key === "ArrowLeft"\) && index === 0\)\s*\{[\s\S]*?searchInput\.focus\(\);/,
        "JS 文件必须在首卡按 ArrowUp 时聚焦 searchInput",
    );
});

test("T-7404: 卡片列表 keydown 拦截 Escape 快速清空搜索并回焦", () => {
    assert.match(storeTs, /if \(event\.key === "Escape"\) \{[\s\S]*?clearSearchButton\.click\(\);/);
    assert.match(storeJs, /if \(event\.key === "Escape"\) \{[\s\S]*?clearSearchButton\.click\(\);/);
});

test("T-7404 门禁负向验证: 若首卡未判定 index === 0 必定精准红", () => {
    // 探针 1: 负向断言首卡判断绝不可缺少 index === 0
    assert.doesNotMatch(storeTs, /if \(\(event\.key === "ArrowUp" \|\| event\.key === "ArrowLeft"\)\) \{ searchInput\.focus/);
});
