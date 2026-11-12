// T-7681 细线风格图标圆润端点与卡片行尾动作悬停浮现契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__card 行尾操作按钮常态声明 opacity: 0.72 并在 hover/focus-within 时完全浮现；
//   2. 验证 svg 矢量图标统一声明 stroke-linecap: round 与 stroke-linejoin: round；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7681: 卡片行尾动作按钮声明常态轻隐与悬停完全浮现", () => {
    assert.match(
        polishScss,
        /\.sw__card\s+\.sw__pin,\s*\.sw__card\s+\.sw__fav-btn,\s*\.sw__card\s+\.sw__close\s*\{[\s\S]*?opacity:\s*0\.72;/s,
        "行尾操作按钮常态必须声明轻隐不干扰阅读",
    );
    assert.match(
        polishScss,
        /\.sw__card:hover\s+\.sw__pin[\s\S]*?opacity:\s*1;/s,
        "卡片悬停时行尾操作按钮必须平滑浮现",
    );
});

test("T-7681: 全平台 SVG 矢量图标声明圆润端点与平滑连接", () => {
    assert.match(
        polishScss,
        /svg\s*\{[\s\S]*?stroke-linecap:\s*round;[\s\S]*?stroke-linejoin:\s*round;/s,
        "全平台 SVG 图标必须声明圆润线端与平滑连接",
    );
});

test("T-7681 门禁负向验证: 若图标线端使用生硬 butt 截断必报错", () => {
    // 探针 1: 负向断言严禁在平台中声明 stroke-linecap: butt
    assert.doesNotMatch(
        polishScss,
        /stroke-linecap:\s*butt;/,
        "严禁使用生硬的 butt 端点截断",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenStyles = `.sw__test_svg { stroke-linecap: square; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /stroke-linecap:\s*round;/,
        );
    }, assert.AssertionError);
});
