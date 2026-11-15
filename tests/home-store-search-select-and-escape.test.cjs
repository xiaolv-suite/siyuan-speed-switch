// T-7407 工作台小组件商店搜索框自动全选与 Escape 阶梯退出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui.ts 在 focus 时执行 searchInput.select()；
//   2. 验证 home-store-ui.js 在 focus 时执行 searchInput.select()；
//   3. 验证 搜索框 Escape 在空值时显式调用 storeDialog.destroy()；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeJs = readSourceText(path.join(root, "src", "home-store-ui.js"));

test("T-7407: home-store-ui 搜索框获焦时执行 searchInput.select()", () => {
    assert.match(
        storeTs,
        /bindRenderListener\(searchInput,\s*"focus",\s*\(\)\s*=>\s*\{[\s\S]*?searchInput\.select\(\);/,
        "TS 文件必须绑定 focus 执行 select()",
    );
    assert.match(
        storeJs,
        /bindRenderListener\(searchInput,\s*"focus",\s*\(\)\s*=>\s*\{[\s\S]*?searchInput\.select\(\);/,
        "JS 文件必须绑定 focus 执行 select()",
    );
});

test("T-7407: 搜索框 Escape 在空值时显式调用 storeDialog.destroy()", () => {
    assert.match(
        storeTs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?clearSearchButton\.click\(\);[\s\S]*?storeDialog\.destroy\(\);/,
        "TS 文件必须在 Escape 空值时调用 storeDialog.destroy()",
    );
    assert.match(
        storeJs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?clearSearchButton\.click\(\);[\s\S]*?storeDialog\.destroy\(\);/,
        "JS 文件必须在 Escape 空值时调用 storeDialog.destroy()",
    );
});

test("T-7407 门禁负向验证: 若 Escape 缺少 destroy 调用必定精准红", () => {
    assert.doesNotMatch(storeTs, /if \(event\.key === "Escape" && searchInput\.value\) \{\s*event\.preventDefault\(\);\s*clearSearchButton\.click\(\);\s*return;\s*\}/);
});
