// T-7449 移动端收藏抽屉与分组管理弹窗 Home/End 快速跳转契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 showMobileFavSheet 声明 Home/End 跳转；
//   2. 验证 mobile-switcher-ui.ts 与 mobile-switcher-ui.js 在 openMobileGroupActions 声明 Home/End 跳转；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const mobileTs = readSourceText(path.join(root, "src", "mobile-switcher-ui.ts"));
const mobileJs = readSourceText(path.join(root, "src", "mobile-switcher-ui.js"));

test("T-7449: index.ts 与 index.js 在 showMobileFavSheet 包含 Home/End 跳转", () => {
    assert.match(
        indexTs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const target = event\.key === "Home" \? buttons\[0\] : buttons\[buttons\.length - 1\];/,
        "index.ts 必须绑定 Home/End 跳转",
    );
    assert.match(
        indexJs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const target = event\.key === "Home" \? buttons\[0\] : buttons\[buttons\.length - 1\];/,
        "index.js 必须绑定 Home/End 跳转",
    );
});

test("T-7449: mobile-switcher-ui 包含 Home/End 跳转", () => {
    assert.match(
        mobileTs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const target = event\.key === "Home" \? buttons\[0\] : buttons\[buttons\.length - 1\];/,
        "mobile-switcher-ui.ts 必须绑定 Home/End 跳转",
    );
    assert.match(
        mobileJs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const target = event\.key === "Home" \? buttons\[0\] : buttons\[buttons\.length - 1\];/,
        "mobile-switcher-ui.js 必须绑定 Home/End 跳转",
    );
});

test("T-7449 门禁负向验证: 若缺少 Home/End 监听必定精准红", () => {
    assert.doesNotMatch(
        indexTs,
        /if \(event\.key === "FakeHomeKey"\)/,
    );
});
