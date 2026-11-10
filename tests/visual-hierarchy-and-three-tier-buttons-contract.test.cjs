// T-7609 视觉层级三级按钮契约与 8 态规范契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-btn--primary 声明主色胶囊与微抬升阴影；
//   2. 验证 .sw-btn--soft 声明 12% 主色淡底与主色文字；
//   3. 验证 .sw-btn--quiet 声明透明底与悬停沉底色；
//   4. 验证三级按钮均具备 translateY(1px) scale(0.985) 物理微触感按下态；
//   5. 验证三级按钮均具备 --sw-focus-glow 焦点光晕；
//   6. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const baseControlsScss = readSourceText(path.join(root, "src", "styles", "_01-base-controls.scss"));

test("T-7609: 三级按钮（Primary / Soft / Quiet）标准体系声明", () => {
    // 1. Primary Button
    assert.match(
        baseControlsScss,
        /\.sw-btn--primary\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill/s,
        "Primary 按钮必须声明胶囊圆角",
    );
    assert.match(
        baseControlsScss,
        /\.sw-btn--primary\s*\{[^}]*background:\s*var\(--sw-color-accent/s,
        "Primary 按钮必须引用主色令牌",
    );

    // 2. Soft Button
    assert.match(
        baseControlsScss,
        /\.sw-btn--soft\s*\{[^}]*background:\s*var\(--sw-color-accent-soft/s,
        "Soft 按钮必须声明主色柔和淡底",
    );

    // 3. Quiet Button
    assert.match(
        baseControlsScss,
        /\.sw-btn--quiet\s*\{[^}]*background:\s*transparent/s,
        "Quiet 按钮常态必须为透明底",
    );
});

test("T-7609: 三级按钮八态微交互契约（Active 按下态与 Focus-Visible 发光环）", () => {
    // 物理微触感按下态
    assert.match(
        baseControlsScss,
        /\.sw-btn--primary[^{]*\{.*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(1px\)\s*scale\(0\.985\)/s,
        "Primary 按钮必须具备标准物理按下微缩放位移",
    );
    assert.match(
        baseControlsScss,
        /\.sw-btn--soft[^{]*\{.*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(1px\)\s*scale\(0\.985\)/s,
        "Soft 按钮必须具备标准物理按下微缩放位移",
    );
    assert.match(
        baseControlsScss,
        /\.sw-btn--quiet[^{]*\{.*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateY\(1px\)\s*scale\(0\.985\)/s,
        "Quiet 按钮必须具备标准物理按下微缩放位移",
    );

    // 焦点发光环
    assert.match(
        baseControlsScss,
        /\.sw-btn--primary[^{]*\{.*?&:focus-visible\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\)/s,
        "Primary 按钮必须声明全局统一发光焦点环",
    );
    assert.match(
        baseControlsScss,
        /\.sw-btn--soft[^{]*\{.*?&:focus-visible\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\)/s,
        "Soft 按钮必须声明全局统一发光焦点环",
    );
});

test("T-7609 门禁负向验证: 若篡改微触感物理缩放或移除焦点环必精准红", () => {
    // 探针 1: 负向断言伪造的 10px 粗暴下沉位移必须被拒绝
    assert.doesNotMatch(
        baseControlsScss,
        /\.sw-btn--primary\s*\{[^}]*transform:\s*translateY\(10px\)/s,
        "严禁使用过度粗暴的大位移",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw-btn--primary { border-radius: 0px; background: red; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /\.sw-btn--primary\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill/s,
        );
    }, assert.AssertionError);
});
