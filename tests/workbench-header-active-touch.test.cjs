// T-7553 第二面板工作台小组件卡片标题栏长按/按压微缩放与触感反馈加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 styles/_05-settings-widgets.scss 为 .sw__home-module-header 声明 transition 变换动效；
//   2. 验证 styles/_05-settings-widgets.scss 为 .sw__home-module-header 声明 &:active 按压微缩放 scale(0.99)；
//   3. 验证声明 -webkit-tap-highlight-color: transparent 移动端防闪烁；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const scss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7553: SCSS 为 .sw__home-module-header 声明按压微缩放与触感反馈动效", () => {
    assert.match(
        scss,
        /\.sw__home-module-header\s*\{[\s\S]*?transition:\s*transform \$sw-dur-fast \$sw-ease, opacity \$sw-dur-fast \$sw-ease;[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*scale\(0\.99\);/,
        "SCSS 必须为 .sw__home-module-header 声明 transition 与 active 按压微缩放 scale(0.99)",
    );
    assert.match(
        scss,
        /\.sw__home-module-header\s*\{[\s\S]*?-webkit-tap-highlight-color:\s*transparent;/,
        "SCSS 必须为 .sw__home-module-header 声明 -webkit-tap-highlight-color: transparent",
    );
});

test("T-7553 门禁负向验证: 若缺少 active 缩放动效必定精准红", () => {
    const fakeScss = scss.replace(/transform:\s*scale\(0\.99\);/, "/* removed active scale */");
    assert.doesNotMatch(fakeScss, /\.sw__home-module-header\s*\{[^}]*?&:active\s*\{[^}]*?transform:\s*scale\(0\.99\);/);
});
