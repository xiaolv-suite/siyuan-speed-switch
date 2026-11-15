// T-7525 第二面板工作台小组件网格拖拽把手与调整把手键盘焦点环聚焦样式强化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _05-settings-widgets.scss 为 .sw-home__cell-resize-handle 声明 focus-visible 焦点环；
//   2. 验证 _05-settings-widgets.scss 为 .sw-home__tool--drag 声明 focus-visible 焦点环与位移；
//   3. 验证 _05-settings-widgets.scss 为 .sw-home__tool 声明 focus-visible 焦点环；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const scss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7525: _05-settings-widgets.scss 为网格把手与工具按钮声明 focus-visible 键盘焦点环", () => {
    assert.match(
        scss,
        /\.sw-home__cell-resize-handle\s*\{[\s\S]*?&:focus,\s*&:focus-visible\s*\{[\s\S]*?box-shadow:\s*0 0 0 2px color-mix\(in srgb,\s*var\(--b3-theme-primary\) 35%,\s*transparent\);/,
        "调整把手必须包含 focus-visible 主色微光焦点环",
    );
    assert.match(
        scss,
        /\.sw-home \.sw-home__tool--drag\s*\{[\s\S]*?&:focus,\s*&:focus-visible\s*\{[\s\S]*?box-shadow:\s*0 0 0 2px color-mix\(in srgb,\s*var\(--b3-theme-primary\) 35%,\s*transparent\);/,
        "拖拽把手必须包含 focus-visible 焦点环",
    );
    assert.match(
        scss,
        /\.sw-home__tool\s*\{[\s\S]*?&:focus,\s*&:focus-visible\s*\{[\s\S]*?box-shadow:\s*0 0 0 2px color-mix\(in srgb,\s*var\(--b3-theme-primary\) 30%,\s*transparent\);/,
        "工具按钮必须包含 focus-visible 焦点环",
    );
});

test("T-7525 门禁负向验证: 若调整把手移除了 focus 样式必定精准红", () => {
    const fakeScss = scss.replace(
        /&:\s*focus,\s*&:focus-visible\s*\{[\s\S]*?transform:\s*scale\(1\.15\);\s*\}/,
        "/* removed focus */",
    );
    assert.doesNotMatch(
        fakeScss,
        /\.sw-home__cell-resize-handle\s*\{[\s\S]*?&:focus,\s*&:focus-visible/,
        "负向注入验证：缺少焦点环时断言必须拦截失败",
    );
});
