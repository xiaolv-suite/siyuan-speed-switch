// T-7794~T-7797: 商店分类胶囊分段栏、主从分栏与规格瓦片 Bento 现代化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home-store__tab[data-tab-key="ecosystem"].is-active 声明白卡浮起与 --sw-shadow-xs，彻底清除旧下划线内阴影；
//   2. 验证 .sw-home-store__catalog .sw-home-store__card 声明独立白卡浮起、hover 1.5px 位移与 active scale(0.98)；
//   3. 验证 .sw-home-store__size 声明白卡浮起、10px 控件圆角与 active scale(0.95)；
//   4. 包含三重破坏性负向验证探针，拦截丢失微位移、丢失白卡底色或破坏尺寸瓦片触觉反馈违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeCardsScss = readSourceText(path.join(root, "src", "styles", "_08-home-store-cards.scss"));
const storeWidgetsScss = readSourceText(path.join(root, "src", "styles", "_06-widgets-store.scss"));

test("T-7794: 商店分类胶囊分段栏与生态专区 Bento 白卡浮起与阴影升级", () => {
    assert.match(
        storeCardsScss,
        /\.sw-home-store__tab\[data-tab-key="ecosystem"\]\s*\{[\s\S]*?&\.is-active\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "生态专区激活标签必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        storeCardsScss,
        /\.sw-home-store__tab\[data-tab-key="ecosystem"\]\s*\{[\s\S]*?&\.is-active\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\)/s,
        "生态专区激活标签必须声明 --sw-shadow-xs 柔和浮起阴影",
    );
    assert.doesNotMatch(
        storeCardsScss,
        /\.sw-home-store__tab\[data-tab-key="ecosystem"\]\s*\{[\s\S]*?box-shadow:\s*inset\s*0\s*-2px/s,
        "严禁使用旧版拟物化 inset 0 -2px 伪下划线阴影",
    );
});

test("T-7795: 商店主从分栏消线规整与白卡浮层升级", () => {
    assert.match(
        storeCardsScss,
        /\.sw-home-store__detail\s*\{[^}]*border-left:\s*none;/s,
        "详情区必须消除左侧重叠边框，避免与目录右侧边框形成双实线",
    );
    assert.match(
        storeCardsScss,
        /\.sw-home-store__catalog\s*\.sw-home-store__card\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "目录卡片必须声明白卡浮起底色",
    );
    assert.match(
        storeCardsScss,
        /\.sw-home-store__catalog\s*\.sw-home-store__card\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "目录卡片悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        storeCardsScss,
        /\.sw-home-store__catalog\s*\.sw-home-store__card\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "目录卡片按下必须声明 scale(0.98) 物理触感反馈",
    );
    assert.match(
        storeCardsScss,
        /\.sw-home-store__catalog\s*\.sw-home-store__card\.is-active\s*\{[^}]*box-shadow:\s*0 0 0 1\.5px/s,
        "选中的目录卡片必须声明 1.5px 聚焦外环而非内阴影",
    );
});

test("T-7796: 尺寸选择规格条目与详情操作胶囊触觉动效加固", () => {
    assert.match(
        storeWidgetsScss,
        /\.sw-home-store__size\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "尺寸规格瓦片必须声明白卡浮起底色",
    );
    assert.match(
        storeWidgetsScss,
        /\.sw-home-store__size\s*\{[^}]*border-radius:\s*var\(--sw-radius-control,\s*10px\);/s,
        "尺寸规格瓦片必须统合为 10px 控件圆角",
    );
    assert.match(
        storeWidgetsScss,
        /\.sw-home-store__size\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.95\);/s,
        "尺寸规格瓦片按下必须声明 scale(0.95) 物理弹性压缩",
    );
    assert.match(
        storeWidgetsScss,
        /\.sw-home-store__size\s*\{[\s\S]*?&\[data-selected="true"\]\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        "选中的尺寸规格瓦片必须声明 --sw-focus-glow 焦点环",
    );
});

test("T-7797 破坏性负向验证探针：若卡片丢失位移、标签丢失白卡或瓦片丢失缩放必精确报错", () => {
    // 探针 1: 模拟若目录卡片丢失了 hover translateX(1.5px) 位移动效
    const brokenCardShiftScss = storeCardsScss.replace(
        /(\.sw-home-store__catalog\s*\.sw-home-store__card\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenCardShiftScss,
            /\.sw-home-store__catalog\s*\.sw-home-store__card\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "目录卡片丢失横向微位移时断言必须失败");

    // 探针 2: 模拟若生态标签丢失了 var(--sw-card-float-bg)
    const brokenTabBgScss = storeCardsScss.replace(
        /(\.sw-home-store__tab\[data-tab-key="ecosystem"\]\s*\{[\s\S]*?&\.is-active\s*\{[^}]*background:\s*)var\(--sw-card-float-bg/g,
        "$1var(--sw-broken-bg",
    );
    assert.throws(() => {
        assert.match(
            brokenTabBgScss,
            /\.sw-home-store__tab\[data-tab-key="ecosystem"\]\s*\{[\s\S]*?&\.is-active\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "生态标签丢失白卡底色时断言必须失败");

    // 探针 3: 模拟若尺寸瓦片丢失了 active scale(0.95) 弹性动效
    const brokenTileScaleScss = storeWidgetsScss.replace(
        /(\.sw-home-store__size\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*)scale\(0\.95\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenTileScaleScss,
            /\.sw-home-store__size\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.95\);/s,
        );
    }, assert.AssertionError, "尺寸瓦片丢失按压缩放动效时断言必须失败");
});
