// T-7617 片段实验室视觉与阴影收敛契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-studio__library-item 与 .sw-studio__catalog-item 声明 --sw-shadow-xs/sm；
//   2. 验证 .sw-studio__editor 声明 --sw-font-mono 与 tabular-nums；
//   3. 验证 .sw-studio__state-badge 声明 color-mix 边框且无 inset 内阴影；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));

test("T-7617: 片段实验室卡片与目录项收敛至标准三档阴影", () => {
    assert.match(
        studioScss,
        /&__library-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\)/s,
        "库列表项必须声明标准微抬升阴影 --sw-shadow-xs",
    );
    assert.match(
        studioScss,
        /&__catalog-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\)/s,
        "目录项必须声明标准微抬升阴影 --sw-shadow-xs",
    );
    assert.match(
        studioScss,
        /&__catalog-item\s*\{[\s\S]*?&:hover[^{]*\{[^}]*box-shadow:\s*var\(--sw-shadow-sm\)/s,
        "目录项悬停必须声明中档阴影 --sw-shadow-sm",
    );
});

test("T-7617: 代码编辑器与 AI 差异视口声明等宽字体与数字", () => {
    assert.match(
        studioScss,
        /&__editor,\s*&__ai-result\s*\{[^}]*font-family:\s*var\(--sw-font-mono/s,
        "代码编辑器必须声明全局统一等宽字体",
    );
    assert.match(
        studioScss,
        /&__editor,\s*&__ai-result\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        "代码编辑器必须声明等宽数字",
    );
});

test("T-7617: 状态徽标声明动态边框且根除内阴影", () => {
    assert.match(
        studioScss,
        /&__state-badge\s*\{[^}]*border:\s*1px solid color-mix/s,
        "状态徽标必须声明动态半透明边框",
    );
    assert.doesNotMatch(
        studioScss,
        /&__state-badge\s*\{[^}]*box-shadow:\s*inset/s,
        "状态徽标严禁出现内凹内阴影",
    );
});

test("T-7617 门禁负向验证: 若向状态徽标注入内阴影必定精准红", () => {
    const brokenStyles = `&__state-badge { box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15); }`;
    assert.throws(() => {
        assert.doesNotMatch(
            brokenStyles,
            /&__state-badge\s*\{[^}]*box-shadow:\s*inset/s,
        );
    }, assert.AssertionError);
});
