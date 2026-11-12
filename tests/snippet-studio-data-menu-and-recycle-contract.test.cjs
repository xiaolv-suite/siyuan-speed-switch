// tests/snippet-studio-data-menu-and-recycle-contract.test.cjs
// 契约测试：实验室数据治理菜单 Bento 浮层、回收站快照白卡浮起与操作胶囊（T-7762~T-7765）
// 1. 验证 .sw-studio__data-menu-actions 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 2. 验证 .sw-studio__recycle-item 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-xs)；
// 3. 验证 .sw-studio__recycle-actions .sw-studio__button 声明全圆角胶囊与按压反馈；
// 4. 负向验证探针：若菜单丢失 Bento 软影或回收站丢失白卡浮起底色，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");
const studioScss = fs.readFileSync(path.join(ROOT, "src/styles/_snippet-studio.scss"), "utf8");

test("T-7762: 实验室数据治理菜单 Bento 浮层与位移微动效升级", () => {
    assert.match(
        polishScss,
        /\.sw-studio__data-menu-actions\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw-studio__data-menu-actions 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        polishScss,
        /\.sw-studio__data-menu-actions\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s,
        ".sw-studio__data-menu-actions 必须声明 var(--sw-shadow-bento) 深度浮层"
    );
    assert.match(
        polishScss,
        /\.sw-studio__data-menu-actions\s+\.sw-studio__button[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "数据治理菜单按钮 hover 必须声明 translateX(1.5px) 顺滑微位移"
    );
});

test("T-7763: 回收站快照条目白卡浮起与悬浮微动效加固", () => {
    assert.match(
        studioScss,
        /\.sw-studio__recycle-item\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw-studio__recycle-item 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        studioScss,
        /\.sw-studio__recycle-item\s*\{[^}]*border-radius:\s*var\(--sw-radius-md,\s*8px\);/s,
        ".sw-studio__recycle-item 必须声明 8px 圆角规格"
    );
    assert.match(
        studioScss,
        /\.sw-studio__recycle-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        ".sw-studio__recycle-item 必须声明 var(--sw-shadow-xs) 柔和微阴影"
    );
    assert.match(
        studioScss,
        /\.sw-studio__recycle-item\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-0\.5px\);/s,
        ".sw-studio__recycle-item hover 必须声明 translateY(-0.5px) 轻微抬升"
    );
});

test("T-7764: 回收站操作按钮全圆角胶囊与按压反馈统合", () => {
    assert.match(
        studioScss,
        /\.sw-studio__recycle-actions\s*\{[\s\S]*?\.sw-studio__button\s*\{[^}]*border-radius:\s*var\(--studio-radius-pill/s,
        "回收站操作按钮必须声明全圆角胶囊规格"
    );
    assert.match(
        studioScss,
        /\.sw-studio__recycle-actions\s*\{[\s\S]*?\.sw-studio__button\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.96\);/s,
        "回收站操作按钮必须声明 &:active 缩放微反馈"
    );
});

test("T-7765 负向验证探针：若菜单丢失 Bento 软影或回收站丢失白卡浮起底色必精准拦截", () => {
    // 探针 1：验证数据治理菜单 Bento 软影
    function checkMenuBento(css) {
        return /\.sw-studio__data-menu-actions\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkMenuBento(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace(
            /(\.sw-studio__data-menu-actions\s*\{[^}]*box-shadow:)[^;]+;/s,
            "$1 none;"
        );
        if (!checkMenuBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DATA_MENU_BENTO: 数据治理菜单丢失 var(--sw-shadow-bento) 深度浮层");
        }
    }, /PROBE_DETECTED_MISSING_DATA_MENU_BENTO/, "破坏性负向探针必须精准捕获菜单软影丢失缺陷");

    // 探针 2：验证回收站快照白卡浮起
    function checkRecycleFloat(css) {
        return /\.sw-studio__recycle-item\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkRecycleFloat(studioScss), true);

    assert.throws(() => {
        const brokenCss = studioScss.replace(
            /(\.sw-studio__recycle-item\s*\{[^}]*background:)[^;]+;/s,
            "$1 transparent;"
        );
        if (!checkRecycleFloat(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_RECYCLE_FLOAT: 回收站条目丢失 var(--sw-card-float-bg) 白卡浮起");
        }
    }, /PROBE_DETECTED_MISSING_RECYCLE_FLOAT/, "破坏性负向探针必须精准捕获回收站白卡浮起丢失缺陷");
});
