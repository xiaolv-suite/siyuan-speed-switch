// T-7790~T-7793: 移动端底部抽屉 Bento 浮化、拖拽滑块与条目微触感契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__mobile-sheet / .sw__mobile-sort-sheet 声明白卡浮起底色、顶部柔和边线与 Bento 深度柔影；
//   2. 验证 .sw__mobile-sheet-handle 声明全圆角软胶囊规范、36px 宽度与 hover scaleX(1.15) 视觉扩张；
//   3. 验证 .sw__mobile-sheet-item / .sw__mobile-sort-option 声明 >=44px 触控区、hover 1.5px 位移与 active scale(0.98) 触感反馈；
//   4. 包含三重破坏性负向验证探针，拦截丢失微位移、丢失白卡底色或破坏手柄胶囊规格违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7790: 移动端底部抽屉 Bento 白卡浮起、顶部柔和边线与微光切面升级", () => {
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "底部抽屉必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*border-top:\s*1px solid var\(--sw-color-line-soft/s,
        "底部抽屉顶部边缘必须声明柔和分割细线",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*box-shadow:[^}]*var\(--sw-shadow-bento\)/s,
        "底部抽屉必须声明 Bento 深度柔影",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*box-shadow:[^}]*var\(--sw-rim-light/s,
        "底部抽屉必须声明微光切面 --sw-rim-light",
    );
});

test("T-7791: 半屏手势拖拽手柄胶囊晶格与微反光加固", () => {
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-handle\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "拖拽手柄必须声明全圆角软胶囊规范",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-handle\s*\{[^}]*width:\s*36px;/s,
        "拖拽手柄必须保持标准 36px 物理宽度",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-handle\s*\{[^}]*background:[^}]*var\(--sw-color-accent/s,
        "拖拽手柄背景必须动态融入主题点缀色",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-handle\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*scaleX\(1\.15\);/s,
        "拖拽手柄悬停必须声明 scaleX(1.15) 视觉可拖拽扩张指示",
    );
});

test("T-7792: 移动抽屉选项条目与排序项 Bento 独立卡片与按压微位移加固", () => {
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-item\s*\{[^}]*min-height:\s*44px;/s,
        "抽屉条目必须保证 >=44px 移动触控热区",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[\s\S]*?\.sw__mobile-sheet-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "抽屉条目悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[\s\S]*?\.sw__mobile-sheet-item\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "抽屉条目按下必须声明 scale(0.98) 物理触感反馈",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sort-option\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "排序选项悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sort-option\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "排序选项按下必须声明 scale(0.98) 物理触感反馈",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-count\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "计数角标必须统合为全圆角软胶囊规范",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-count\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "计数角标必须声明 tabular-nums 等宽排版",
    );
    assert.match(
        widgetsScss,
        /\.sw__mobile-sheet-close\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateY\(-50%\)\s*scale\(0\.94\);/s,
        "关闭按钮按下必须声明 scale(0.94) 物理弹性压缩",
    );
});

test("T-7793 破坏性负向验证探针：若条目丢失微位移、抽屉丢失白卡或手柄丢失胶囊必精确报错", () => {
    // 探针 1: 模拟若抽屉条目丢失了 hover translateX(1.5px) 位移动效
    const brokenItemShiftScss = widgetsScss.replace(
        /(\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[\s\S]*?\.sw__mobile-sheet-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenItemShiftScss,
            /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[\s\S]*?\.sw__mobile-sheet-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "抽屉条目丢失横向微位移时断言必须失败");

    // 探针 2: 模拟若抽屉底座丢失了 var(--sw-card-float-bg)
    const brokenSheetBgScss = widgetsScss.replace(
        /(\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*background:\s*)var\(--sw-card-float-bg/g,
        "$1var(--sw-broken-bg",
    );
    assert.throws(() => {
        assert.match(
            brokenSheetBgScss,
            /\.sw__mobile-sheet,\s*\.sw__mobile-sort-sheet\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "抽屉丢失白卡底色时断言必须失败");

    // 探针 3: 模拟若拖拽手柄丢失了胶囊规格
    const brokenHandlePillScss = widgetsScss.replace(
        /(\.sw__mobile-sheet-handle\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenHandlePillScss,
            /\.sw__mobile-sheet-handle\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "手柄丢失胶囊规格时断言必须失败");
});
