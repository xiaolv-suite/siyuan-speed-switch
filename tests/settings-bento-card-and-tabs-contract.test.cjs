// tests/settings-bento-card-and-tabs-contract.test.cjs
// 契约测试：设置页双层微底、左侧标签栏白底浮起与面板 Bento 浮卡（T-7718~T-7721）
// 1. 验证 .sw-settings 声明 var(--sw-bg-tinted) 极浅同族托底；
// 2. 验证 .sw-settings__tab.is-active 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-xs)；
// 3. 验证 .sw-settings__panel 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 4. 验证设置弹窗非全屏模式声明 18px 大圆角与 1px 微光切面，全屏模式严格消线；
// 5. 负向验证探针：若破坏设置面板 Bento 软影或激活标签浮起规范，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const settingsScss = fs.readFileSync(path.join(ROOT, "src/styles/_02-settings.scss"), "utf8");
const fabFullscreenScss = fs.readFileSync(path.join(ROOT, "src/styles/_04-fab-fullscreen-soft.scss"), "utf8");

test("T-7718: 设置页双层微底与左侧标签栏活跃项背景块化", () => {
    assert.match(
        settingsScss,
        /\.sw-settings\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        ".sw-settings 根容器必须声明 var(--sw-bg-tinted) 浅色同族底色托底"
    );
    assert.match(
        settingsScss,
        /\.sw-settings__tab[\s\S]*?&\.is-active\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "左侧激活标签必须声明 var(--sw-card-float-bg) 白底浮起圆角块"
    );
    assert.match(
        settingsScss,
        /\.sw-settings__tab[\s\S]*?&\.is-active\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "左侧激活标签必须声明 var(--sw-shadow-xs) 柔和微阴影"
    );
});

test("T-7719: 设置右侧面板 Bento 浮卡与组卡片分层", () => {
    assert.match(
        settingsScss,
        /\.sw-settings__panel\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "右侧设置面板必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        settingsScss,
        /\.sw-settings__panel\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "右侧设置面板必须声明 var(--sw-shadow-bento) 深度软影"
    );
    assert.match(
        settingsScss,
        /\.sw-settings__panel\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-card,\s*14px\);/s,
        "右侧设置面板圆角必须统合为 14px 卡片级"
    );
});

test("T-7720: 设置弹窗微光切面（Rim Light）与全屏沉浸消线加固", () => {
    assert.match(
        fabFullscreenScss,
        /\.b3-dialog__container\.sw-settings-dialog[\s\S]*?&:not\(\.sw-dialog--fullscreen\)\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-panel,\s*18px\);/s,
        "非全屏设置弹窗必须声明 18px 大圆角"
    );
    assert.match(
        fabFullscreenScss,
        /\.b3-dialog__container\.sw-settings-dialog[\s\S]*?&:not\(\.sw-dialog--fullscreen\)\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\),\s*inset 0 0 0 1px/s,
        "非全屏设置弹窗必须声明 Bento 软影与 1px 微光切面"
    );
    assert.match(
        fabFullscreenScss,
        /\.b3-dialog__container\.sw-settings-dialog[\s\S]*?&\.sw-dialog--fullscreen\s*\{[\s\S]*?border:\s*none\s*!important;[\s\S]*?border-radius:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/s,
        "全屏设置弹窗必须彻底清除 border、border-radius 与 box-shadow"
    );
});

test("T-7721 负向验证探针：若破坏设置面板 Bento 软影或激活标签浮起规范必精准拦截", () => {
    // 探针 1：验证设置面板 Bento 软影
    function checkPanelBento(css) {
        return /\.sw-settings__panel\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkPanelBento(settingsScss), true);

    assert.throws(() => {
        const brokenCss = settingsScss.replace("box-shadow: var(--sw-shadow-bento);", "box-shadow: none;");
        if (!checkPanelBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_SETTINGS_BENTO: 设置面板丢失 var(--sw-shadow-bento) 软影");
        }
    }, /PROBE_DETECTED_MISSING_SETTINGS_BENTO/, "破坏性负向探针必须精准捕获设置面板软影丢失缺陷");

    // 探针 2：验证激活标签白底浮起
    function checkTabFloat(css) {
        return /\.sw-settings__tab[\s\S]*?&\.is-active\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkTabFloat(settingsScss), true);

    assert.throws(() => {
        const brokenCss = settingsScss.replaceAll("var(--sw-card-float-bg,", "var(--sw-broken,");
        if (!checkTabFloat(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_TAB_FLOAT: 设置页激活标签丢失白卡浮起背景");
        }
    }, /PROBE_DETECTED_MISSING_TAB_FLOAT/, "破坏性负向探针必须精准捕获激活标签浮起丢失缺陷");
});
