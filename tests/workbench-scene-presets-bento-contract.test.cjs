// T-7774~T-7777: 工作台场景预设按钮胶囊化、浮层 Bento 软影与工具栏状态统合契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home__preset-btn 声明全圆角软胶囊规范、白卡底色、主题色高亮与 hover/active 触觉反馈；
//   2. 验证 .b3-menu.sw-home__presets-menu 声明 14px Bento 圆角、白卡浮起与 --sw-shadow-bento 深度柔影；
//   3. 验证 场景预设菜单选项 .b3-menu__item 声明 32px 舒适高度、hover 1.5px 横向微位移与 active scale(0.98)；
//   4. 验证 .sw-home__clear-btn 与 .sw-home__restore-default 统合为胶囊规格与统一阴影；
//   5. 包含三重破坏性负向验证探针，拦截缺失 Bento 阴影、丢失微位移或破坏胶囊规格违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const secondPanelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7774: 工作台场景预设按钮软胶囊规范与悬浮/按压触觉动效加固", () => {
    // 1. 源码接线：Menu 装配 dedicated 类名 sw-home__presets-menu
    assert.match(
        secondPanelTs,
        /menu\.element\?\.classList\.add\("sw-home__presets-menu"\);/,
        "TS 源码中场景预设菜单必须挂载 sw-home__presets-menu 类名",
    );
    assert.match(
        secondPanelJs,
        /menu\.element\?\.classList\.add\("sw-home__presets-menu"\);/,
        "JS 源码中场景预设菜单必须保持同构挂载 sw-home__presets-menu 类名",
    );

    // 2. 按钮样式：胶囊全圆角、白卡浮起与微动效
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "场景预设按钮必须声明全圆角软胶囊规范",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "场景预设按钮必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn\s*\{[\s\S]*?color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "场景预设按钮前景色必须引用主题主色令牌",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-1px\);[^}]*box-shadow:\s*var\(--sw-shadow-sm\);/s,
        "按钮悬停必须声明微抬升与阴影扩展",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn[\s\S]*?&:active\s*\{[^}]*transform:\s*translateY\(0\)\s*scale\(0\.96\);/s,
        "按钮按下必须声明 scale(0.96) 物理触感反馈",
    );
});

test("T-7775: 场景预设浮层 Bento 白卡浮起、深度柔影与选项平滑微位移加固", () => {
    // 1. 浮层容器：14px 大圆角、白卡底色、Bento 深度柔影、毛玻璃模糊
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[^}]*border-radius:\s*var\(--sw-radius-card,\s*14px\);/s,
        "场景预设浮层必须声明 14px Bento 圆角标准",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "场景预设浮层必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "场景预设浮层必须声明深度双层柔影 --sw-shadow-bento",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[^}]*backdrop-filter:\s*var\(--sw-blur-md,\s*blur\(8px\)\);/s,
        "场景预设浮层必须声明毛玻璃滤镜 --sw-blur-md",
    );

    // 2. 菜单项：32px 舒适高度、hover 1.5px 平滑微位移与图标联动
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__item\s*\{[\s\S]*?min-height:\s*32px;/s,
        "菜单选项必须声明 32px 舒适操作高度",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__item\s*\{[^}]*&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "菜单选项悬停必须声明 1.5px 横向微位移",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__item\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "菜单选项按下必须声明 scale(0.98) 触觉反馈",
    );
    assert.match(
        polishScss,
        /\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__icon\s*\{[^}]*color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "菜单项图标前景色必须联动主题主色",
    );
});

test("T-7776: 工作台编辑工具栏清空与恢复按钮胶囊规格与状态统合", () => {
    // 恢复按钮：白卡底色与胶囊规格
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__restore-default\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "恢复按钮必须声明白卡底色",
    );

    // 清空按钮：危险色描边与半透明危险色悬停
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__clear-btn\s*\{[^}]*color:\s*var\(--b3-theme-error,\s*#f43f5e\);/s,
        "清空按钮必须声明语义错误/危险色",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__clear-btn\s*\{[^}]*border:\s*1px solid color-mix\(in srgb,\s*var\(--b3-theme-error,\s*#f43f5e\)\s*30%,\s*transparent\);/s,
        "清空按钮必须声明 30% 危险色轻柔边框",
    );
});

test("T-7777 破坏性负向验证探针：若预设浮层丢失 Bento 软影或选项丢失位移动效必定精准拦截", () => {
    // 探针 1: 模拟若预设浮层丢失了 var(--sw-shadow-bento)
    const brokenShadowScss = polishScss.replace(
        /(\.b3-menu\.sw-home__presets-menu\s*\{[^}]*box-shadow:\s*)var\(--sw-shadow-bento\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenShadowScss,
            /\.b3-menu\.sw-home__presets-menu\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        );
    }, assert.AssertionError, "预设浮层丢失 Bento 软影时断言必须失败");

    // 探针 2: 模拟若预设选项丢失了 hover translateX(1.5px) 位移动效
    const brokenItemShiftScss = polishScss.replace(
        /(\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__item\s*\{[^}]*&:hover\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenItemShiftScss,
            /\.b3-menu\.sw-home__presets-menu\s*\{[\s\S]*?\.b3-menu__item\s*\{[^}]*&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "预设选项悬停丢失位移动效时断言必须失败");

    // 探针 3: 模拟若预设按钮丢失了胶囊规格
    const brokenPillScss = polishScss.replace(
        /(\.sw-home__preset-btn,\s*\.sw-home__restore-default,\s*\.sw-home__clear-btn\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenPillScss,
            /\.sw-home\s*\{[\s\S]*?\.sw-home__preset-btn,\s*\.sw-home__restore-default,\s*\.sw-home__clear-btn\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "预设按钮丢失胶囊规格时断言必须失败");
});
