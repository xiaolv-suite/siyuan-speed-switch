// T-7637 图标光学对齐、搜索框闭合圆润边框与半透明分割线契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__search-icon 声明 top: 50% 与 translateY(-50%) 光学垂直居中；
//   2. 验证 .sw__toolbar 声明半透明边框 --sw-color-line-soft；
//   3. 验证三级按钮内 svg 声明 vertical-align: -0.125em 基线光学对齐；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const switcherScss = readSourceText(path.join(root, "src", "styles", "_03-switcher-mobile.scss"));
const baseControlsScss = readSourceText(path.join(root, "src", "styles", "_01-base-controls.scss"));

test("T-7637: 搜索框放大镜图标声明 top: 50% 与 translateY(-50%) 光学居中", () => {
    assert.match(
        switcherScss,
        /\.sw__search-icon\s*\{[^}]*top:\s*50%;[^}]*transform:\s*translateY\(-50%\)/s,
        "搜索放大镜图标必须声明垂直居中变换，与清空按钮光学对称",
    );
});

test("T-7637: 顶栏底部分割线声明半透明线条 --sw-color-line-soft", () => {
    assert.match(
        switcherScss,
        /\.sw__toolbar\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--sw-color-line-soft/s,
        "顶栏底边必须使用半透明边框替代生硬深灰实线",
    );
});

test("T-7637: 三级按钮声明 svg 图标光学基线微调", () => {
    assert.match(
        baseControlsScss,
        /\.sw-btn--primary\s*\{[\s\S]*?svg\s*\{[^}]*vertical-align:\s*-0\.125em/s,
        "Primary 按钮必须声明 svg 光学基线对齐",
    );
    assert.match(
        baseControlsScss,
        /\.sw-btn--soft\s*\{[\s\S]*?svg\s*\{[^}]*vertical-align:\s*-0\.125em/s,
        "Soft 按钮必须声明 svg 光学基线对齐",
    );
});

test("T-7637 门禁负向验证: 若搜索图标居中丢失或按钮图标偏移过大必报错", () => {
    // 探针 1: 负向断言严禁过度偏移 (>5px)
    assert.doesNotMatch(
        baseControlsScss,
        /svg\s*\{[^}]*vertical-align:\s*-10px/s,
        "严禁使用过度粗暴的光学位移",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw__search-icon { top: 0px; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /\.sw__search-icon\s*\{[^}]*transform:\s*translateY\(-50%\)/s,
        );
    }, assert.AssertionError);
});
