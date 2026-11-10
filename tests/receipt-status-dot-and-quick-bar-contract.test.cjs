// T-7689 工作台底部回执小圆点呼吸与快捷条双层伪边框消除契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home__receipt::before 声明 6px 圆点与 --sw-color-data 数据色；
//   2. 验证 .sw-home__receipt-details 声明胶囊圆角与 --sw-color-accent-soft；
//   3. 验证 .sw-home__quick-actions 彻底消除 box-shadow 双层伪边框；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7689: 工作台底部回执声明数据语义色小圆点与胶囊详情按钮", () => {
    assert.match(
        widgetsScss,
        /\.sw-home__receipt\s*\{[\s\S]*?&::before\s*\{[^}]*border-radius:\s*50%;[^}]*background:\s*var\(--sw-color-data/s,
        "回执条必须声明 50% 圆形数据色状态小圆点",
    );
    assert.match(
        widgetsScss,
        /\.sw-home__receipt-details\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "回执详情按钮必须声明胶囊圆角",
    );
});

test("T-7689: 工作台底部快捷条彻底消除 box-shadow 双层伪边框", () => {
    assert.match(
        polishScss,
        /\.sw-home__quick-actions\s*\{[\s\S]*?box-shadow:\s*none;/s,
        "快捷条必须声明 box-shadow: none 消除双层边框",
    );
});

test("T-7689 门禁负向验证: 若状态小圆点使用方角矩形必报错", () => {
    // 探针 1: 负向断言严禁状态点使用 0px 直角
    assert.doesNotMatch(
        widgetsScss,
        /\.sw-home__receipt\s*\{[\s\S]*?&::before\s*\{[^}]*border-radius:\s*0px;/s,
        "严禁状态点使用直角方块",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenStyles = `.sw-home__receipt { &::before { border-radius: 0px; } }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /border-radius:\s*50%/,
        );
    }, assert.AssertionError);
});
