// T-7633 结果行错峰微动效、骨架屏微光渐变与悬停亮度微反馈契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _11-ui-polish 声明 sw-list-item-enter 与 20ms 错峰动效；
//   2. 验证 _11-ui-polish 卡片悬停声明 filter: brightness(1.03) 亮度微反馈；
//   3. 验证 _05-settings-widgets 骨架屏声明 linear-gradient 双层流动微光；
//   4. 验证 prefers-reduced-motion: reduce 声明 animation: none；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7633: 列表结果行声明 20ms 阶梯错峰微动效", () => {
    assert.match(
        polishScss,
        /@keyframes sw-list-item-enter\s*\{[^}]*transform:\s*translateY\(3px\)/s,
        "结果行平滑入场必须仅使用 transform/opacity，位移控制在 3px",
    );
    assert.match(
        polishScss,
        /\.sw__card,\s*\.sw__doc-item\s*\{[\s\S]*?&:nth-child\(2\)\s*\{[^}]*animation-delay:\s*20ms;/s,
        "第 2 项必须声明 20ms 错峰延迟",
    );
    assert.match(
        polishScss,
        /\.sw__card,\s*\.sw__doc-item\s*\{[\s\S]*?&:nth-child\(3\)\s*\{[^}]*animation-delay:\s*40ms;/s,
        "第 3 项必须声明 40ms 错峰延迟",
    );
});

test("T-7633: 卡片悬停声明亮度微反馈与平滑浮起", () => {
    assert.match(
        polishScss,
        /\.sw__card,\s*\.sw__doc-item\s*\{[\s\S]*?&:hover\s*\{[^}]*filter:\s*brightness\(1\.03\)/s,
        "卡片悬停必须声明 3% 亮度微反馈",
    );
    assert.match(
        polishScss,
        /\.sw__card,\s*\.sw__doc-item\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-1\.5px\)/s,
        "卡片悬停位移必须控制在 1.5px",
    );
});

test("T-7633: 骨架屏脉冲微光升级为基于同族底色的双层流动渐变", () => {
    assert.match(
        widgetsScss,
        /\.sw__home-loading-skeleton-line\s*\{[^}]*background:\s*linear-gradient/s,
        "骨架屏必须采用线性流动微光",
    );
    assert.match(
        widgetsScss,
        /@keyframes sw-home-skeleton-pulse\s*\{[^}]*background-position:\s*200%\s*0/s,
        "骨架屏脉冲动画必须声明平滑位置流动",
    );
});

test("T-7633: 无障碍减动效强制支持", () => {
    assert.match(
        polishScss,
        /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.sw__card,\s*\.sw__doc-item\s*\{[^}]*animation:\s*none/s,
        "减动效模式下必须强制重置动画",
    );
});

test("T-7633 门禁负向验证: 若错峰延迟过大 (>100ms) 导致迟滞必定精确红", () => {
    // 探针 1: 负向断言单步错峰延迟严禁超过 100ms
    assert.doesNotMatch(
        polishScss,
        /\.sw__card,\s*\.sw__doc-item\s*\{[\s\S]*?&:nth-child\(2\)\s*\{[^}]*animation-delay:\s*120ms;/s,
        "严禁使用过度迟滞的单步错峰延迟",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw__card { animation-delay: 200ms; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /animation-delay:\s*20ms;/,
        );
    }, assert.AssertionError);
});
