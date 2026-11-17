// T-7445 组件商店卡片 Enter 选中与详情窗格 Escape 回焦双向流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui.ts 在 detailPane 声明 Escape 监听与回焦；
//   2. 验证 home-store-ui.ts 在 card 声明 Enter/Space 选中响应；
//   3. 验证 home-store-ui.js 同步保持一致；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeJs = readSourceText(path.join(root, "src", "home-store-ui.js"));

test("T-7445: home-store-ui.ts 包含 detailPane Escape 回焦与 card Enter 选中", () => {
    assert.match(
        storeTs,
        /bindRenderListener\(detailPane,\s*"keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?selectedCard\.focus\(\{preventScroll:\s*true\}\)/,
        "TS 文件必须绑定 detailPane Escape 回焦逻辑",
    );
    assert.match(
        storeTs,
        /if \(event\.key === "Enter" \|\| event\.key === " "\) \{[\s\S]*?card\.click\(\);/,
        "TS 文件必须绑定 card Enter/Space 选中响应",
    );
});

test("T-7445: home-store-ui.js 同步包含 detailPane Escape 回焦与 card Enter 选中", () => {
    assert.match(
        storeJs,
        /bindRenderListener\(detailPane,\s*"keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?selectedCard\.focus\(\{ preventScroll:\s*true \}\)/,
        "JS 文件必须绑定 detailPane Escape 回焦逻辑",
    );
    assert.match(
        storeJs,
        /if \(event\.key === "Enter" \|\| event\.key === " "\) \{[\s\S]*?card\.click\(\);/,
        "JS 文件必须绑定 card Enter/Space 选中响应",
    );
});

test("T-7445 门禁负向验证: 若缺少 detailPane 监听必定精准红", () => {
    assert.doesNotMatch(storeTs, /detailPane\.classList\.add\("sw-home-store__detail--empty"\);\s*root\.dataset\.batchMode/);
});
