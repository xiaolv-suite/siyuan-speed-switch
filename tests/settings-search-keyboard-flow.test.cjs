// T-7428 设置中心搜索框聚焦自动全选、Enter 自愈清空与 Escape 阶梯退出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 声明 searchInput focus select()；
//   2. 验证 index.ts 与 index.js 声明 Enter 空结果自愈清空；
//   3. 验证 index.ts 与 index.js 声明 Escape 阶梯式清空与关闭；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7428: index.ts 与 index.js 声明设置搜索框 focus select()", () => {
    assert.match(
        indexTs,
        /searchInput\.className = "sw-settings__search-input";[\s\S]*?searchInput\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?searchInput\.select\(\);/,
        "index.ts 必须绑定设置搜索框 focus select()",
    );
    assert.match(
        indexJs,
        /searchInput\.className = "sw-settings__search-input";[\s\S]*?searchInput\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?searchInput\.select\(\);/,
        "index.js 必须绑定设置搜索框 focus select()",
    );
});

test("T-7428: index.ts 与 index.js 声明设置搜索框 Enter 自愈清空与 Escape 阶梯退出", () => {
    assert.match(
        indexTs,
        /else if \(searchInput\.value\) \{\s*searchInput\.value = "";\s*renderSettingsSearchResults\(\);\s*\}[\s\S]*?if \(searchInput\.value\) \{[\s\S]*?dialog\.destroy\(\);/,
        "index.ts 必须声明 Enter 自愈清空与 Escape 阶梯退出",
    );
    assert.match(
        indexJs,
        /else if \(searchInput\.value\) \{\s*searchInput\.value = "";\s*renderSettingsSearchResults\(\);\s*\}[\s\S]*?if \(searchInput\.value\) \{[\s\S]*?dialog\.destroy\(\);/,
        "index.js 必须声明 Enter 自愈清空与 Escape 阶梯退出",
    );
});

test("T-7428 门禁负向验证: 若设置搜索框有词时按 Escape 仍直接销毁必定精准红", () => {
    assert.doesNotMatch(indexTs, /else if \(event\.key === "Escape"\) \{\s*dialog\.destroy\(\);\s*\}/);
});
