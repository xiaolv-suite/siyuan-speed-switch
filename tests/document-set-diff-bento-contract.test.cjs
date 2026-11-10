// tests/document-set-diff-bento-contract.test.cjs
// 契约测试：文档集预览区微底分层、差异对比行 Bento 浮卡与胶囊操作按钮（T-7742~T-7745）
// 1. 验证 .sw-setting__doc-set-preview 声明柔和线框与底色差分层；
// 2. 验证 .sw-doc-set-diff__line 声明 var(--sw-card-float-bg)、var(--sw-shadow-xs) 与 hover 上浮；
// 3. 验证 .sw-doc-set-diff__actions .b3-button 声明全圆角胶囊与 :active 缩放；
// 4. 负向验证探针：若破坏差异对比行白卡浮起或操作按钮胶囊规格，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const settingsScss = fs.readFileSync(path.join(ROOT, "src/styles/_02-settings.scss"), "utf8");

test("T-7742: 文档集预览区微底分层与柔和内边距加固", () => {
    assert.match(
        settingsScss,
        /\.sw-setting__doc-set-preview\s*\{[\s\S]*?border:\s*1px solid var\(--sw-color-line-soft/s,
        ".sw-setting__doc-set-preview 必须声明柔和线框 var(--sw-color-line-soft)"
    );
    assert.match(
        settingsScss,
        /\.sw-setting__doc-set-preview\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-md,\s*8px\);/s,
        ".sw-setting__doc-set-preview 必须统合为 8px 圆角"
    );
});

test("T-7743: 版本差异对比行 Bento 浮卡与悬浮触感升级", () => {
    assert.match(
        settingsScss,
        /\.sw-doc-set-diff__line\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw-doc-set-diff__line 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        settingsScss,
        /\.sw-doc-set-diff__line\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        ".sw-doc-set-diff__line 必须声明 var(--sw-shadow-xs) 柔和微阴影"
    );
    assert.match(
        settingsScss,
        /\.sw-doc-set-diff__line\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-0\.5px\);/s,
        ".sw-doc-set-diff__line hover 态必须声明 translateY(-0.5px) 轻微抬升"
    );
});

test("T-7744: 差异回滚操作区胶囊主次按钮与按压动效加固", () => {
    assert.match(
        settingsScss,
        /\.sw-doc-set-diff__actions\s*\{[\s\S]*?\.b3-button\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill/s,
        ".sw-doc-set-diff__actions .b3-button 必须声明全圆角胶囊规格"
    );
    assert.match(
        settingsScss,
        /\.sw-doc-set-diff__actions\s*\{[\s\S]*?\.b3-button\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.96\);/s,
        ".sw-doc-set-diff__actions .b3-button 必须声明 &:active 缩放微动效"
    );
});

test("T-7745 负向验证探针：若破坏差异对比行白卡浮起或操作按钮胶囊规格必精准拦截", () => {
    // 探针 1：验证差异对比行白卡浮起
    function checkDiffLineFloat(css) {
        return /\.sw-doc-set-diff__line\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkDiffLineFloat(settingsScss), true);

    assert.throws(() => {
        const brokenCss = settingsScss.replace(
            "background: var(--sw-card-float-bg, var(--b3-theme-surface));",
            "background: transparent;"
        );
        if (!checkDiffLineFloat(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DIFF_LINE_FLOAT: 差异对比行丢失白卡浮起背景");
        }
    }, /PROBE_DETECTED_MISSING_DIFF_LINE_FLOAT/, "破坏性负向探针必须精准捕获差异行浮起丢失缺陷");

    // 探针 2：验证操作按钮胶囊规格
    function checkButtonPill(css) {
        return /\.sw-doc-set-diff__actions\s*\{[\s\S]*?\.b3-button\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill/s.test(css);
    }
    assert.equal(checkButtonPill(settingsScss), true);

    assert.throws(() => {
        const brokenCss = settingsScss.replace("border-radius: var(--sw-platform-radius-pill, 999px);", "border-radius: 4px;");
        if (!checkButtonPill(brokenCss)) {
            throw new Error("PROBE_DETECTED_DEGRADED_DIFF_BUTTON_PILL: 差异操作按钮胶囊圆角被非法篡改");
        }
    }, /PROBE_DETECTED_DEGRADED_DIFF_BUTTON_PILL/, "破坏性负向探针必须精准捕获按钮胶囊降级缺陷");
});
