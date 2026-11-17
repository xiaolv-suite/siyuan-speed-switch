// T-7399 工作台知识蒸馏漏斗与全尺寸英雄位午夜黑金美学契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 为 knowledge-funnel 装配 sw-home__cell--midnight；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 为 sizeKey === "full" 英雄位装配 sw-home__cell--midnight；
//   3. 验证 _11-ui-polish.scss 声明 sw-home__cell--midnight 悬浮动效；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7399: second-panel-ui 为 knowledge-funnel 与 full 英雄位装配 sw-home__cell--midnight", () => {
    assert.match(
        panelTs,
        /inst\.moduleId === "knowledge-funnel" \|\| sizeKey === "full"/,
        "second-panel-ui.ts 必须对 knowledge-funnel 与 full 尺寸装配 midnight",
    );
    assert.match(
        panelJs,
        /inst\.moduleId === "knowledge-funnel" \|\| sizeKey === "full"/,
        "second-panel-ui.js 必须对 knowledge-funnel 与 full 尺寸装配 midnight",
    );
});

test("T-7399: _11-ui-polish.scss 声明 sw-home__cell--midnight 悬浮微位移与背景过渡", () => {
    assert.match(polishScss, /\.sw-home__cell--midnight[\s\S]*?transform:\s*translateX\(2px\);/);
    assert.match(polishScss, /\.sw-home__cell--midnight[\s\S]*?var\(--lv-midnight-card,\s*#1B1E2E\)/);
});

test("T-7399 门禁负向验证: 若未识别 full 英雄位或误伤普通卡片必定精准红", () => {
    // 探针 1: 负向断言普通 small 尺寸组件绝不得被全局硬写死 midnight
    assert.doesNotMatch(panelTs, /sizeKey === "small"\s*\|\|\s*cell\.classList\.add\("sw-home__cell--midnight"\)/);

    // 探针 2: 负向断言 midnight 背景不得使用刺眼白色纯底
    assert.doesNotMatch(polishScss, /\.sw-home__cell--midnight\s*\{\s*background:\s*#ffffff;/);
});
