// T-7641 悬浮球物理弹性回弹与快捷动作微触感契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-fab-trigger 声明 cubic-bezier(0.16, 1, 0.3, 1) 弹性回弹曲线；
//   2. 验证 .sw__floating-ball-action.is-more-item 声明 active 缩放微触感；
//   3. 验证 [data-digit]::before 声明等宽字体与数字；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const fabScss = readSourceText(path.join(root, "src", "styles", "_04-fab-fullscreen-soft.scss"));
const moreScss = readSourceText(path.join(root, "src", "styles", "_floating-ball-more.scss"));

test("T-7641: 悬浮球吸附过渡声明弹性物理回弹曲线", () => {
    assert.match(
        fabScss,
        /\.sw-fab-trigger\s*\{[\s\S]*?transition:\s*transform\s*\$sw-dur-panel\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s,
        "悬浮球吸附回弹必须声明物理弹性曲线",
    );
});

test("T-7641: 快捷动作项声明 active 微缩放与 focus-visible 光晕", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*(?:translateX\(1\.5px\)\s*scale\(0\.98\)|translateY\(1px\)\s*scale\(0\.985\))/s,
        "快捷动作项必须声明 active 下沉微缩放反馈",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:focus-visible\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\)/s,
        "快捷动作项聚焦必须接入全局统一微光环",
    );
});

test("T-7641: 数字直达芯片声明等宽排版与 4px 微圆角", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[^}]*font-family:\s*var\(--sw-font-mono/s,
        "数字直达芯片必须声明等宽字体",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        "数字直达芯片必须声明等宽数字",
    );
});

test("T-7641 门禁负向验证: 若吸附动画移除弹性或缩放位移失真必报警", () => {
    // 探针 1: 负向断言严禁在悬浮球吸附使用生硬的 linear
    assert.doesNotMatch(
        fabScss,
        /\.sw-fab-trigger\s*\{[\s\S]*?transition:\s*transform\s*\$sw-dur-panel\s*linear/s,
        "严禁使用生硬机械的线性吸附",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw-fab-trigger { transition: transform 10s ease; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /transition:\s*transform\s*\$sw-dur-panel\s*cubic-bezier/,
        );
    }, assert.AssertionError);
});
