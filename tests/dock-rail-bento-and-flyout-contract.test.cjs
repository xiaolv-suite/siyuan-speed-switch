// tests/dock-rail-bento-and-flyout-contract.test.cjs
// 契约测试：侧栏面板列表双层微底、活跃项白卡浮起与折叠气泡 Bento 浮化（T-7738~T-7741）
// 1. 验证 .sw__dock 声明 var(--sw-bg-tinted) 浅色托底；
// 2. 验证 .sw__dock-item.sw__active 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-xs)；
// 3. 验证 .sw__dock-flyout 声明 8px 圆角与 var(--sw-shadow-bento)；
// 4. 验证 .sw__dock-toggle 声明全圆角胶囊与按压微动效；
// 5. 负向验证探针：若破坏侧栏活跃项白卡浮起或折叠气泡丢失 Bento 软影，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");
const switcherScss = fs.readFileSync(path.join(ROOT, "src/styles/_03-switcher-mobile.scss"), "utf8");

test("T-7738: 侧栏面板底色接入微底与活跃项圆润背景块升级", () => {
    assert.match(
        polishScss,
        /\.sw__dock\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        ".sw__dock 必须声明 var(--sw-bg-tinted) 浅色同族底色托底"
    );
    assert.match(
        polishScss,
        /\.sw__dock-item\.sw__active\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw__dock-item.sw__active 必须声明 var(--sw-card-float-bg) 白底浮起圆角块"
    );
    assert.match(
        polishScss,
        /\.sw__dock-item\.sw__active\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        ".sw__dock-item.sw__active 必须声明 var(--sw-shadow-xs) 柔和微阴影"
    );
});

test("T-7739: 折叠图标条 hover 气泡 Bento 浮化与 8px 圆角升级", () => {
    assert.match(
        switcherScss,
        /\.sw__dock-flyout\s*\{[^}]*border-radius:\s*var\(--sw-radius-md,\s*8px\);/s,
        ".sw__dock-flyout 必须升级为 8px 圆角气泡"
    );
    assert.match(
        switcherScss,
        /\.sw__dock-flyout\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw__dock-flyout 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        switcherScss,
        /\.sw__dock-flyout\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        ".sw__dock-flyout 必须接入 var(--sw-shadow-bento) 深度软影"
    );
});

test("T-7740: 折叠切换手柄圆润胶囊与按压微动效加固", () => {
    assert.match(
        switcherScss,
        /\.sw__dock-toggle\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill/s,
        ".sw__dock-toggle 必须声明全圆角胶囊规格"
    );
    assert.match(
        switcherScss,
        /\.sw__dock-toggle\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.92\);/s,
        ".sw__dock-toggle 必须声明 &:active 缩放微反馈"
    );
});

test("T-7741 负向验证探针：若破坏侧栏活跃项白卡浮起或气泡丢失 Bento 软影必精准拦截", () => {
    // 探针 1：验证侧栏活跃项白卡浮起
    function checkActiveDockFloat(css) {
        return /\.sw__dock-item\.sw__active\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkActiveDockFloat(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace(
            "background: var(--sw-card-float-bg, var(--sw-accent-soft));",
            "background: transparent;"
        );
        if (!checkActiveDockFloat(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DOCK_ACTIVE_FLOAT: 侧栏活跃项丢失白卡浮起背景");
        }
    }, /PROBE_DETECTED_MISSING_DOCK_ACTIVE_FLOAT/, "破坏性负向探针必须精准捕获活跃项白卡浮起丢失缺陷");

    // 探针 2：验证折叠气泡 Bento 软影
    function checkFlyoutBento(css) {
        return /\.sw__dock-flyout\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkFlyoutBento(switcherScss), true);

    assert.throws(() => {
        const brokenCss = switcherScss.replace(
            "box-shadow: var(--sw-shadow-bento);",
            "box-shadow: none;"
        );
        if (!checkFlyoutBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_FLYOUT_BENTO: 折叠气泡丢失 var(--sw-shadow-bento) 深度软影");
        }
    }, /PROBE_DETECTED_MISSING_FLYOUT_BENTO/, "破坏性负向探针必须精准捕获折叠气泡软影丢失缺陷");
});
