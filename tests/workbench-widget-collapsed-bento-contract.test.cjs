// T-7778~T-7781: 工作台小组件折叠态紧凑胶囊行高、角标晶格与折叠按钮触觉动效契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home__cell--collapsed 声明 34px 紧凑胶囊高度、白卡浮起与微抬升；
//   2. 验证 .sw__home-collapsed-badge 声明全圆角药丸、等宽字体、tabular-nums 与主色微光晶格；
//   3. 验证 .sw__home-module-fold 声明 6px 圆角、hover scale(1.08) 放大与 active scale(0.94) 按压回弹；
//   4. 包含三重破坏性负向验证探针，拦截丢失白卡底色、丢失等宽数字或丢失触觉动效违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7778: 工作台小组件折叠态紧凑胶囊行高与微浮起加固", () => {
    // 1. 折叠单元格：34px 紧凑高度、padding 压缩、白卡底色与微阴影
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[^}]*min-height:\s*var\(--sw-control-h,\s*34px\);/s,
        "折叠卡片必须声明 34px 标准控件高度",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[^}]*max-height:\s*var\(--sw-control-h,\s*34px\);/s,
        "折叠卡片必须锁定 max-height 34px 避免内容撑开",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "折叠卡片必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-0\.5px\);/s,
        "折叠卡片悬停必须具备 -0.5px 微抬升",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[\s\S]*?&:hover\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-sm\);/s,
        "折叠卡片悬停必须具备阴影扩展 --sw-shadow-sm",
    );
});

test("T-7779: 折叠条目计数/统计角标主色微光晶格与等宽药丸加固", () => {
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "折叠角标必须声明全圆角药丸规范",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "折叠角标前景色必须绑定主题主色",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*font-family:\s*var\(--sw-font-mono,\s*monospace\);/s,
        "折叠角标必须引用等宽字体 --sw-font-mono",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "折叠角标必须声明 tabular-nums 等宽排版防抖动",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*border:\s*1px solid color-mix\(in srgb,\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\)\s*28%,\s*transparent\);/s,
        "折叠角标必须具备 28% 半透明主题色精微边框",
    );
});

test("T-7780: 折叠展开切换按钮悬浮/激活触觉微反馈与主题色联动", () => {
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-module-fold\s*\{[^}]*border-radius:\s*var\(--sw-radius-sm,\s*6px\);/s,
        "折叠按钮必须声明 6px 圆角规范",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-module-fold\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*scale\(1\.08\);/s,
        "折叠按钮悬停必须声明放大 scale(1.08)",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-module-fold\s*\{[\s\S]*?&:hover\s*\{[^}]*color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "折叠按钮悬停必须高亮主色",
    );
    assert.match(
        polishScss,
        /\.sw-home\s*\{[\s\S]*?\.sw__home-module-fold\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.94\);/s,
        "折叠按钮按下必须声明 scale(0.94) 物理按压微动效",
    );
});

test("T-7781 破坏性负向验证探针：若折叠卡片丢失白卡底色或角标丢失等宽排版必定精准拦截", () => {
    // 探针 1: 模拟若折叠卡片丢失了 var(--sw-card-float-bg)
    const brokenBgScss = polishScss.replace(
        /(\.sw-home__cell--collapsed\s*\{[^}]*background:\s*)var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/,
        "$1transparent;",
    );
    assert.throws(() => {
        assert.match(
            brokenBgScss,
            /\.sw-home\s*\{[\s\S]*?\.sw-home__cell--collapsed\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        );
    }, assert.AssertionError, "折叠卡片丢失白卡底色时断言必须失败");

    // 探针 2: 模拟若折叠角标丢失了 tabular-nums 等宽排版
    const brokenBadgeScss = polishScss.replace(
        /(\.sw__home-collapsed-badge\s*\{[^}]*)font-variant-numeric:\s*tabular-nums;/,
        "$1/* tabular-nums removed */",
    );
    assert.throws(() => {
        assert.match(
            brokenBadgeScss,
            /\.sw-home\s*\{[\s\S]*?\.sw__home-collapsed-badge\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        );
    }, assert.AssertionError, "折叠角标丢失等宽排版时断言必须失败");

    // 探针 3: 模拟若折叠按钮丢失了 scale(1.08)
    const brokenFoldScss = polishScss.replace(
        /(\.sw__home-module-fold\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*)scale\(1\.08\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenFoldScss,
            /\.sw-home\s*\{[\s\S]*?\.sw__home-module-fold\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*scale\(1\.08\);/s,
        );
    }, assert.AssertionError, "折叠按钮丢失 scale(1.08) 放大动效时断言必须失败");
});
