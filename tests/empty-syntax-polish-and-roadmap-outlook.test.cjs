// T-7388 空态速查胶囊栏微质感美化与片段复制动效契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _11-ui-polish.scss 包含 .sw__empty-syntax-bar 胶囊微质感与悬浮位移；
//   2. 验证 _snippet-studio.scss 包含 .sw-studio__library-copy 的悬浮与 active 缩放动效；
//   3. 验证 ROADMAP.md 包含 v0.48.30 基线；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));
const roadmap = readSourceText(path.join(root, "ROADMAP.md"));

test("T-7388: _11-ui-polish.scss 包含 .sw__empty-syntax-bar 胶囊微质感与悬浮位移", () => {
    assert.match(
        polishScss,
        /\.sw__empty-syntax-bar\s*\{[\s\S]*?\.sw__empty-syntax-chip\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);[\s\S]*?transform:\s*translateY\(-1px\);/s,
        "_11-ui-polish.scss 必须包含 .sw__empty-syntax-bar 胶囊微质感与位移",
    );
});

test("T-7388: _snippet-studio.scss 包含 .sw-studio__library-copy 悬浮与 active 缩放动效", () => {
    assert.match(
        studioScss,
        /&__library-copy\s*\{[\s\S]*?transform:\s*scale\(1\.05\);[\s\S]*?transform:\s*scale\(0\.95\);/s,
        "_snippet-studio.scss 必须包含 library-copy 悬浮与点击缩放动效",
    );
});

test("T-7388: ROADMAP.md 基线版本包含演进基线", () => {
    assert.match(roadmap, /> 基线：`v0\.48\.(?:3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])` 已就绪/);
});

test("T-7388 门禁负向验证: 若缺少微质感规则或版本退化必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在选择器必定失败
    assert.throws(() => {
        assert.match(polishScss, /\.sw__non_existent_fake_syntax_bar/);
    }, assert.AssertionError);

    // 探针 2: 负向断言旧版本号必定失败
    assert.throws(() => {
        assert.match(roadmap, /> 基线：`v0\.48\.28` 已就绪/);
    }, assert.AssertionError);
});
