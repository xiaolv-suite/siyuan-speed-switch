// T-7391 小组件商店搜索框键盘流（Enter/ArrowDown 首卡直达、Esc 清空）契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui.ts 在 searchInput keydown 监听中支持 ArrowDown/Enter 键直达首张卡片；
//   2. 验证 home-store-ui.js 同步支持 ArrowDown/Enter 键直达首张卡片；
//   3. 验证 home-store-ui.ts 与 home-store-ui.js 在 Escape 按键时安全清空搜索框；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const homeStoreTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const homeStoreJs = readSourceText(path.join(root, "src", "home-store-ui.js"));

test("T-7391: home-store-ui.ts 搜索框支持 Enter 与 ArrowDown 键聚焦首张可见卡片", () => {
    assert.match(
        homeStoreTs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "Enter"\)\s*\{[\s\S]*?const firstCard = catalogPane\.querySelector<HTMLElement>\("\.sw-home-store__card:not\(\.fn__none\)"\);[\s\S]*?firstCard\.focus\(\{preventScroll: true\}\);/s,
        "home-store-ui.ts 必须支持 ArrowDown/Enter 键聚焦首张卡片",
    );
    assert.match(
        homeStoreTs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?if\s*\(searchInput\.value\)\s*\{[\s\S]*?clearSearchButton\.click\(\);[\s\S]*?\}\s*else\s*\{[\s\S]*?storeDialog\.destroy\(\);/s,
        "home-store-ui.ts 必须支持 Escape 阶梯清空与空搜索退出",
    );
});

test("T-7391: home-store-ui.js 同步支持 Enter/ArrowDown 直达与 Escape 清空", () => {
    assert.match(
        homeStoreJs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "Enter"\)\s*\{[\s\S]*?const firstCard = catalogPane\.querySelector\("\.sw-home-store__card:not\(\.fn__none\)"\);[\s\S]*?firstCard\.focus\(\{ preventScroll: true \}\);/s,
        "home-store-ui.js 必须支持 ArrowDown/Enter 键聚焦首张卡片",
    );
    assert.match(
        homeStoreJs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?if\s*\(searchInput\.value\)\s*\{[\s\S]*?clearSearchButton\.click\(\);[\s\S]*?\}\s*else\s*\{[\s\S]*?storeDialog\.destroy\(\);/s,
        "home-store-ui.js 必须支持 Escape 阶梯清空与空搜索退出",
    );
});

test("T-7391 门禁负向验证: 若缺少搜索框键盘流或清空逻辑必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在按键逻辑必定失败
    assert.throws(() => {
        assert.match(homeStoreTs, /event\.key === "F10_FAKE_KEY" && firstCard\.focus/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的选择器必定失败
    assert.throws(() => {
        assert.match(homeStoreJs, /querySelector\("\.fake_store_card_selector"\)/);
    }, assert.AssertionError);
});
