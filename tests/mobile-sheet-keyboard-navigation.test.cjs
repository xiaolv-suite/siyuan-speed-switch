// T-7422 移动端抽屉弹窗全键盘方向键流与焦点陷阱加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 showMobileFavSheet 声明 Tab 焦点陷阱与 ArrowDown/ArrowUp；
//   2. 验证 mobile-switcher-ui.ts 与 mobile-switcher-ui.js 在 openMobileGroupActions 声明 ArrowDown/ArrowUp；
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

test("T-7422: index.ts 与 index.js 在 showMobileFavSheet 声明 Tab 焦点陷阱与 Arrow 导航", () => {
    assert.match(
        indexTs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "index.ts 必须声明 ArrowDown/ArrowUp 按钮循环",
    );
    assert.match(
        indexTs,
        /if\s*\(event\.key === "Tab"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "index.ts 必须声明 Tab 焦点循环陷阱",
    );

    assert.match(
        indexJs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "index.js 必须声明 ArrowDown/ArrowUp 按钮循环",
    );
    assert.match(
        indexJs,
        /if\s*\(event\.key === "Tab"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "index.js 必须声明 Tab 焦点循环陷阱",
    );
});

test("T-7422: mobile-switcher-ui 声明 openMobileGroupActions Arrow 导航", () => {
    assert.match(
        mobileTs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "mobile-switcher-ui.ts 必须声明 ArrowDown/ArrowUp 循环",
    );
    assert.match(
        mobileJs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(/,
        "mobile-switcher-ui.js 必须声明 ArrowDown/ArrowUp 循环",
    );
});

test("T-7422 门禁负向验证: 若收藏抽屉仅处理 Escape 必定精准红", () => {
    assert.doesNotMatch(indexTs, /overlay\.addEventListener\("keydown", \(event\) => \{\s*if \(event\.key !== "Escape"\) return;\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*closeSheet\(\);\s*\}\);/);
});
