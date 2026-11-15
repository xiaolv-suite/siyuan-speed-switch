// T-7770~T-7773: 工作台卡片拖拽毛玻璃幽灵虚影、放置落点 Bento 轮廓与尺寸型号浮卡微交互契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home__cell--dragging 声明毛玻璃幽灵虚影、缩放 scale(0.985) 与 grayscale(0.2)；
//   2. 验证 .sw-home__cell--dragover 声明 Bento 软轮廓、双色外发光环与微上浮 scale(1.008)；
//   3. 验证 .sw-home__size-menu 声明 Bento 白卡浮起、14px 大圆角、毛玻璃与 swPaletteScaleIn 入场；
//   4. 验证 .sw__sort-menu-option 声明选项平滑位移 translateX(1.5px)、按压缩放 scale(0.98) 与 aria-checked 主色联动；
//   5. 验证 .sw__size-tile 声明 4px 圆角与主色动态微光渐变晶格；
//   6. 包含双重破坏性负向验证探针，拦截缺失 Bento 阴影或丢失微位移违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7770: 工作台卡片拖拽毛玻璃幽灵虚影与放置落点 Bento 轮廓加固", () => {
    // 1. 拖拽幽灵虚影：半透明、微缩放、灰度降噪、平滑过渡
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragging\s*\{[\s\S]*?opacity:\s*0\.52;[\s\S]*?transform:\s*scale\(0\.985\);[\s\S]*?filter:\s*grayscale\(0\.2\);/s,
        "拖拽卡片必须具备 opacity: 0.52、scale(0.985) 与 grayscale(0.2) 毛玻璃幽灵虚影",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragging\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "拖拽卡片必须保持低层级柔和阴影 --sw-shadow-xs",
    );

    // 2. 放置落点轮廓：Bento 软虚线、双色外发光、轻微放大指示
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragover\s*\{[\s\S]*?outline:\s*2px dashed var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\)\s*!important;/s,
        "落点卡片必须声明 2px dashed 主题色指示轮廓",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragover\s*\{[\s\S]*?box-shadow:\s*var\(--sw-focus-glow\),\s*var\(--sw-shadow-bento\)\s*!important;/s,
        "落点卡片必须声明复合外发光环与 Bento 软影 --sw-shadow-bento",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragover\s*\{[\s\S]*?transform:\s*scale\(1\.008\)\s*!important;/s,
        "落点卡片必须声明微放大 scale(1.008) 吸引视觉注意",
    );
});

test("T-7771: 工作台尺寸型号菜单 Bento 白卡浮层与选项微动效加固", () => {
    // 1. 浮层外壳：白卡浮起、14px 大圆角、Bento 深度软影、毛玻璃与入场动效
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*border-radius:\s*var\(--sw-radius-card,\s*14px\);/s,
        "尺寸型号浮层必须声明 14px Bento 圆角标准",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "尺寸型号浮层必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "尺寸型号浮层必须声明深度双层柔影 --sw-shadow-bento",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*backdrop-filter:\s*var\(--sw-blur-md,\s*blur\(8px\)\);/s,
        "尺寸型号浮层必须声明毛玻璃滤镜 --sw-blur-md",
    );

    // 2. 菜单条目微动效：hover 平滑位移、active 按压缩放与选中态语义色联动
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[\s\S]*?min-height:\s*32px;/s,
        "选项条目必须保证 32px 舒适操作高度",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[\s\S]*?&:hover\s*\{[\s\S]*?transform:\s*translateX\(1\.5px\);/s,
        "选项悬停必须具备 1.5px 平滑横向微位移",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "选项按下必须具备 scale(0.98) 触觉反馈",
    );
    assert.match(
        polishScss,
        /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[\s\S]*?&\[aria-checked="true"\]\s*\{[\s\S]*?color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "当前选中选项必须联动主题主色",
    );
});

test("T-7772: 尺寸预览瓦片主色微光晶格与选中态高亮统合", () => {
    assert.match(
        polishScss,
        /\.sw__size-tile\s*\{[\s\S]*?border-radius:\s*4px;[\s\S]*?box-shadow:\s*0 1px 2px rgba\(0,\s*0,\s*0,\s*0\.04\);/s,
        "瓦片必须声明 4px 圆角与精微阴影",
    );
    assert.match(
        polishScss,
        /\.sw__size-tile\s*\{[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\)\s*16%,\s*transparent\);/s,
        "瓦片底色必须引用主题语义色动态派生 16% 半透明晶格",
    );
});

test("T-7773 破坏性负向验证探针：若尺寸菜单丢失 Bento 软影或选项丢失位移动效必定精准拦截", () => {
    // 探针 1: 模拟若尺寸菜单丢失了 var(--sw-shadow-bento)
    const brokenShadowScss = polishScss.replace(
        /(\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*box-shadow:\s*)var\(--sw-shadow-bento\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenShadowScss,
            /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        );
    }, assert.AssertionError, "尺寸菜单丢失 Bento 软影时断言必须失败");

    // 探针 2: 模拟若选项丢失了 hover translateX(1.5px) 位移动效
    const brokenHoverScss = polishScss.replace(
        /(\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[^}]*&:hover\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenHoverScss,
            /\.sw-home__size-menu,\s*\.sw__sort-menu\s*\{[\s\S]*?\.sw__sort-menu-option\s*\{[^}]*&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "选项悬停丢失位移动效时断言必须失败");

    // 探针 3: 模拟若落点卡片丢失了 var(--sw-focus-glow)
    const brokenGlowScss = polishScss.replace(
        /(\.sw-home__cell--dragover\s*\{[\s\S]*?box-shadow:\s*)var\(--sw-focus-glow\),\s*var\(--sw-shadow-bento\)\s*!important;/,
        "$1none !important;",
    );
    assert.throws(() => {
        assert.match(
            brokenGlowScss,
            /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--dragover\s*\{[\s\S]*?box-shadow:\s*var\(--sw-focus-glow\),\s*var\(--sw-shadow-bento\)\s*!important;/s,
        );
    }, assert.AssertionError, "落点卡片丢失 focus glow 时断言必须失败");
});
