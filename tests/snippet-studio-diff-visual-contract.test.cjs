// tests/snippet-studio-diff-visual-contract.test.cjs
// 契约测试：片段审查 Diff 视图白卡浮起、等宽行号与增删高亮边条（T-7758~T-7761）
// 1. 验证 .sw-studio__diff-scroll 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-xs)；
// 2. 验证 .sw-studio__diff-ln 声明 font-variant-numeric: tabular-nums 等宽排版；
// 3. 验证 .sw-studio__diff-row.is-del / is-ins 声明 2.5px 专属高光边条；
// 4. 验证 .sw-studio__diff-hunk-head 声明全圆角胶囊规格；
// 5. 负向验证探针：若行号丢失等宽排版或增删行丢失专属指示边条，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const studioScss = fs.readFileSync(path.join(ROOT, "src/styles/_snippet-studio.scss"), "utf8");

test("T-7758: 差异对比容器白卡浮起与行号等宽排版 tabular-nums 统合", () => {
    assert.match(
        studioScss,
        /&__diff-scroll\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw-studio__diff-scroll 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        studioScss,
        /&__diff-scroll\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        ".sw-studio__diff-scroll 必须声明 var(--sw-shadow-xs) 柔和微阴影"
    );
    assert.match(
        studioScss,
        /&__diff-ln\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        ".sw-studio__diff-ln 必须声明 font-variant-numeric: tabular-nums 等宽排版"
    );
});

test("T-7759: 差异增删代码行专属指示边条与高光分色加固", () => {
    assert.match(
        studioScss,
        /&__diff-row\.is-del\s*\{[^}]*border-inline-start:\s*2\.5px solid var\(--studio-error\);/s,
        "删除行必须声明 2.5px 错误色指示边条"
    );
    assert.match(
        studioScss,
        /&__diff-row\.is-ins\s*\{[^}]*border-inline-start:\s*2\.5px solid var\(--studio-success\);/s,
        "新增行必须声明 2.5px 成功色指示边条"
    );
});

test("T-7760: Hunk 审查头部全圆角软胶囊与开关状态微反馈加固", () => {
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[^}]*border-radius:\s*var\(--studio-radius-pill/s,
        ".sw-studio__diff-hunk-head 必须声明全圆角胶囊规格"
    );
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.96\);/s,
        ".sw-studio__diff-hunk-head 必须声明 &:active 缩放微反馈"
    );
});

test("T-7761 负向验证探针：若行号丢失等宽排版或增删行丢失专属指示边条必精准拦截", () => {
    // 探针 1：验证行号等宽排版
    function checkDiffLnTabular(css) {
        return /&__diff-ln\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s.test(css);
    }
    assert.equal(checkDiffLnTabular(studioScss), true);

    assert.throws(() => {
        const brokenCss = studioScss.replace(
            "&__diff-ln { color: var(--studio-on-surface); text-align: right; opacity: .7; user-select: none; font-variant-numeric: tabular-nums; }",
            "&__diff-ln { color: var(--studio-on-surface); text-align: right; opacity: .7; user-select: none; }"
        );
        if (!checkDiffLnTabular(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DIFF_LN_TABULAR: 代码对比行号丢失 tabular-nums 等宽排版");
        }
    }, /PROBE_DETECTED_MISSING_DIFF_LN_TABULAR/, "破坏性负向探针必须精准捕获行号等宽丢失缺陷");

    // 探针 2：验证删除行专属边条
    function checkDelBorder(css) {
        return /&__diff-row\.is-del\s*\{[^}]*border-inline-start:\s*2\.5px solid var\(--studio-error\);/s.test(css);
    }
    assert.equal(checkDelBorder(studioScss), true);

    assert.throws(() => {
        const brokenCss = studioScss.replace(
            "&__diff-row.is-del { border-inline-start: 2.5px solid var(--studio-error); }",
            ""
        );
        if (!checkDelBorder(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DIFF_ROW_BORDER: 代码对比删除行丢失 2.5px 专属指示边条");
        }
    }, /PROBE_DETECTED_MISSING_DIFF_ROW_BORDER/, "破坏性负向探针必须精准捕获指示边条丢失缺陷");
});
