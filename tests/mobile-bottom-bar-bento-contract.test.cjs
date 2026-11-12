// T-7786~T-7789: 移动端切换器底部操作栏 Bento 浮动底座、白卡条目与工具栏快捷芯片胶囊化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .speed-switch.sw__mobile .sw__quick-actions 声明白卡底色、18px 顶部圆角与 Bento 柔影；
//   2. 验证 .speed-switch.sw__mobile .sw__quick-action 声明独立白卡浮起、>=44px 触控区、icon 悬停放大与 active scale(0.94) 触觉反馈；
//   3. 验证 .speed-switch.sw__mobile .sw__mobile-toolbar 快捷芯片声明软胶囊规格、白卡底色与 active scale(0.96)；
//   4. 包含三重破坏性负向验证探针，拦截丢失按压反馈、丢失白卡底色或破坏胶囊规格违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7786: 移动端切换器底部操作栏 Bento 浮动底座与微光切面升级", () => {
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "移动端底栏必须声明 Bento 白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*border-radius:\s*var\(--sw-radius-panel,\s*18px\)\s*var\(--sw-radius-panel,\s*18px\)\s*0\s*0;/s,
        "移动端底栏顶部左右两侧必须声明 18px 面板级大圆角",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*box-shadow:[^}]*var\(--sw-shadow-bento\)/s,
        "移动端底栏必须声明 Bento 深度柔影",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*env\(safe-area-inset-bottom/s,
        "移动端底栏必须完整保留全面屏安全区避让",
    );
});

test("T-7787: 移动端快捷操作条目独立白卡浮起与按压弹性触觉反馈加固", () => {
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-action\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "移动端快捷动作条目必须声明独立白卡浮起底色",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-action\s*\{[^}]*min-height:\s*44px;/s,
        "移动端快捷动作条目必须保证 >=44px 触控保真高度",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-action\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "移动端快捷动作条目必须声明精微低层级阴影",
    );
    assert.match(
        polishScss,
        /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-action\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*scale\(0\.94\);/s,
        "移动端快捷动作条目按下必须声明 scale(0.94) 弹性触觉微动效",
    );
});

test("T-7788: 移动端工具栏快捷芯片软胶囊化与触觉动效加固", () => {
    assert.match(
        polishScss,
        /\.sw__mobile-toolbar\s*\{[\s\S]*?\.sw__mobile-fav-btn,\s*[\s\S]*?\.sw__help-guide-btn\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "工具栏快捷芯片必须统合为全圆角软胶囊规范",
    );
    assert.match(
        polishScss,
        /\.sw__mobile-toolbar\s*\{[\s\S]*?\.sw__mobile-fav-btn,\s*[\s\S]*?\.sw__help-guide-btn\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "工具栏快捷芯片必须声明白卡浮起底色",
    );
    assert.match(
        polishScss,
        /\.sw__mobile-toolbar\s*\{[\s\S]*?\.sw__mobile-fav-btn,\s*[\s\S]*?\.sw__help-guide-btn\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.96\);/s,
        "工具栏快捷芯片按下必须声明 scale(0.96) 物理触感反馈",
    );
});

test("T-7789 破坏性负向验证探针：若条目丢失按压反馈、底座丢失白卡或芯片丢失胶囊必精确报错", () => {
    // 探针 1: 模拟若快捷动作条目丢失了 active scale(0.94) 按压反馈
    const brokenActionScaleScss = polishScss.replace(
        /(\.sw__quick-action\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*)scale\(0\.94\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenActionScaleScss,
            /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-action\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*scale\(0\.94\);/s,
        );
    }, assert.AssertionError, "快捷动作条目丢失 active scale(0.94) 按压反馈时断言必须失败");

    // 探针 2: 模拟若底栏丢失了 var(--sw-card-float-bg)
    const brokenBarBgScss = polishScss.replace(
        /(&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*background:\s*)var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/,
        "$1transparent;",
    );
    assert.throws(() => {
        assert.match(
            brokenBarBgScss,
            /&?\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "底栏丢失白卡底色时断言必须失败");

    // 探针 3: 模拟若工具栏芯片丢失了胶囊规格
    const brokenToolbarPillScss = polishScss.replace(
        /(\.sw__mobile-fav-btn,[\s\S]*?\.sw__help-guide-btn\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenToolbarPillScss,
            /\.sw__mobile-toolbar\s*\{[\s\S]*?\.sw__mobile-fav-btn,\s*[\s\S]*?\.sw__help-guide-btn\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "工具栏芯片丢失胶囊规格时断言必须失败");
});
