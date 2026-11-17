// tests/store-bento-card-and-dialog-contract.test.cjs
// 契约测试：小组件商店双层微底、Bento 浮卡与弹窗全屏沉浸消线
// 1. 验证 .sw-home-store 声明 var(--sw-bg-tinted) 浅色托底；
// 2. 验证 .sw-home-store__card 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 3. 验证商店弹窗非全屏模式声明 18px 大圆角与 1px 微光切面，全屏模式严格消线；
// 4. 负向验证探针：若破坏卡片 Bento 浮影或白卡浮起规则必精准拦截。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const storeScss = readSourceText(path.join(ROOT, "src/styles/_06-widgets-store.scss"));

test("小组件商店双层微底与 Bento 浮卡契约", () => {
    // 1. 验证商店画廊背景
    assert.match(
        storeScss,
        /\.sw-home-store\s*\{[^}]*background:\s*var\(--sw-bg-tinted/s,
        "商店画廊背景必须声明 var(--sw-bg-tinted) 极浅同族底色托底"
    );

    // 2. 验证卡片声明白卡浮起与 Bento 软影
    assert.match(
        storeScss,
        /\.sw-home-store__card\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "商店卡片必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        storeScss,
        /\.sw-home-store__card\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "商店卡片必须声明 var(--sw-shadow-bento) 深度软影"
    );

    // 3. 验证 hover 态位移与多层软影
    assert.match(
        storeScss,
        /\.sw-home-store__card\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-2px\);/s,
        "商店卡片 hover 态必须声明 translateY(-2px) 轻微抬升"
    );
});

test("小组件商店弹窗容器自适应与全屏消线契约", () => {
    assert.match(
        storeScss,
        /\.b3-dialog__container\.sw-home-store-dialog:not\(\.sw-dialog--fullscreen\)\s*\{[^}]*border-radius:\s*var\(--sw-radius-panel,\s*18px\);/s,
        "非全屏商店弹窗必须声明 18px 大圆角"
    );
    assert.match(
        storeScss,
        /\.b3-dialog__container\.sw-home-store-dialog:not\(\.sw-dialog--fullscreen\)\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\),\s*inset 0 0 0 1px/s,
        "非全屏商店弹窗必须声明 Bento 软影与 inset 1px 微光切面"
    );
    assert.match(
        storeScss,
        /\.b3-dialog__container\.sw-home-store-dialog\.sw-dialog--fullscreen\s*\{[^}]*border:\s*none\s*!important;[^}]*border-radius:\s*0\s*!important;[^}]*box-shadow:\s*none\s*!important;/s,
        "全屏模式必须彻底清除 border、border-radius 与 box-shadow"
    );
});

test("负向验证探针：若破坏卡片 Bento 浮影或白卡浮起规则必精准拦截", () => {
    function checkBentoCard(css) {
        return /\.sw-home-store__card\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css)
            && /\.sw-home-store__card\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkBentoCard(storeScss), true);

    assert.throws(() => {
        const brokenCss = storeScss.replace("box-shadow: var(--sw-shadow-bento);", "box-shadow: none;");
        if (!checkBentoCard(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_BENTO_SHADOW: 商店卡片丢失 var(--sw-shadow-bento) 软影");
        }
    }, /PROBE_DETECTED_MISSING_BENTO_SHADOW/, "破坏性负向探针必须精准捕获卡片软影丢失缺陷");

    assert.throws(() => {
        const brokenCss = storeScss.replace("background: var(--sw-card-float-bg, var(--b3-theme-surface));", "background: red;");
        if (!checkBentoCard(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_FLOAT_BG: 商店卡片丢失 var(--sw-card-float-bg) 白卡浮起");
        }
    }, /PROBE_DETECTED_MISSING_FLOAT_BG/, "破坏性负向探针必须精准捕获卡片浮起底色丢失缺陷");
});
