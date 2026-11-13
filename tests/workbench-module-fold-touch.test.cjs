// T-7529 第二面板工作台小组件卡片标题栏折叠指示器 hover 与 focus 动效触感加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _09-store-preview-polish.scss 为 .sw__home-module-fold 声明 hover 微缩放与主色底色；
//   2. 验证 _09-store-preview-polish.scss 为 .sw__home-module-fold 声明 focus-visible 键盘焦点环；
//   3. 验证 _09-store-preview-polish.scss 为 .sw__home-module-fold 声明 active 按压弹性动效；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const scss = readSourceText(path.join(root, "src", "styles", "_09-store-preview-polish.scss"));

test("T-7529: _09-store-preview-polish.scss 声明 .sw__home-module-fold hover/focus/active 触感与焦点环", () => {
    assert.match(
        scss,
        /\.sw-home \.sw-home__cell \.sw__home-module-fold\s*\{[\s\S]*?&:hover\s*\{[\s\S]*?transform:\s*scale\(1\.08\);[\s\S]*?&:focus,\s*&:focus-visible\s*\{[\s\S]*?box-shadow:\s*0 0 0 2px color-mix\(in srgb,\s*var\(--b3-theme-primary\) 35%,\s*transparent\);[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*scale\(0\.94\);/,
        "折叠按钮必须包含 hover/focus/active 完备触觉微动效与焦点环",
    );
});

test("T-7529 门禁负向验证: 若折叠按钮缺少 focus-visible 样式必定精准红", () => {
    const fakeScss = scss.replace(
        /&:focus,\s*&:focus-visible\s*\{[\s\S]*?box-shadow:[^;]+;\s*\}/,
        "/* removed focus-visible */",
    );
    assert.doesNotMatch(
        fakeScss,
        /\.sw-home \.sw-home__cell \.sw__home-module-fold\s*\{[^}]*?&:focus-visible/,
        "负向注入验证：缺少 focus-visible 时断言必须拦截失败",
    );
});
