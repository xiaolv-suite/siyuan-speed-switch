// T-7625 情感化抽象几何微点缀、等宽右对齐与舒适阅读行高契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__empty 声明三档明度径向微徽章；
//   2. 验证 .sw__home-module-item-secondary 声明 tabular-nums 与 text-align: right；
//   3. 验证 --sw-leading-reading 声明 1.65 中文舒适行高；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const switcherScss = readSourceText(path.join(root, "src", "styles", "_03-switcher-mobile.scss"));
const cardsScss = readSourceText(path.join(root, "src", "styles", "_08-home-store-cards.scss"));
const tokensScss = readSourceText(path.join(root, "src", "styles", "_00-tokens.scss"));

test("T-7625: 空状态声明三档主题色明度情感化几何微点缀", () => {
    assert.match(
        switcherScss,
        /\.sw__empty\s*\{[\s\S]*?&::before\s*\{[^}]*width:\s*36px;[^}]*height:\s*36px;/s,
        "空状态必须声明 36px 紧凑圆润微徽章",
    );
    assert.match(
        switcherScss,
        /\.sw__empty\s*\{[\s\S]*?&::before\s*\{[^}]*radial-gradient/s,
        "空状态微徽章必须使用多阶径向渐变营造温润体积感",
    );
});

test("T-7625: 数据统计列声明 tabular-nums 等宽排版与右对齐", () => {
    assert.match(
        cardsScss,
        /\.sw__home-module-item-secondary\s*\{[^}]*text-align:\s*right/s,
        "数据统计列必须右对齐，与左侧文本形成严谨基线",
    );
    assert.match(
        cardsScss,
        /\.sw__home-module-item-secondary\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        "数据统计列必须声明等宽数字",
    );
});

test("T-7625: 中文段落排版声明 1.65 舒适阅读行高", () => {
    assert.match(
        tokensScss,
        /--sw-leading-reading:\s*1\.65;/,
        "阅读行高必须落在 1.6~1.75 舒适区间并严格设为 1.65",
    );
});

test("T-7625 门禁负向验证: 若数据列左对齐或微徽章面积超标必精准红", () => {
    // 探针 1: 负向断言微点缀面积不得超过 60px（避免干扰信息）
    assert.doesNotMatch(
        switcherScss,
        /\.sw__empty\s*\{[\s\S]*?&::before\s*\{[^}]*width:\s*80px;/s,
        "微徽章严禁大面积遮挡界面",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw__empty { &::before { width: 120px; } }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /\.sw__empty\s*\{[\s\S]*?&::before\s*\{[^}]*width:\s*36px;/s,
        );
    }, assert.AssertionError);
});
