// tests/search-filter-badge-and-clear-contract.test.cjs
// 契约测试：搜索过滤角标等宽排版、白卡边缘隔离与清除按钮微动效（T-7754~T-7757）
// 1. 验证 .sw__search-filter-btn.sw__active::after 声明 tabular-nums、monospace 与白卡物理隔离；
// 2. 验证 .sw__search-clear 声明 :active 缩放微动效；
// 3. 验证 .sw__search-filter-btn:focus-visible 声明 var(--sw-focus-glow)；
// 4. 负向验证探针：若过滤角标丢失等宽排版或丢失白卡物理隔离，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const switcherScss = fs.readFileSync(path.join(ROOT, "src/styles/_03-switcher-mobile.scss"), "utf8");

test("T-7754: 搜索过滤角标等宽排版与白卡边缘物理隔离加固", () => {
    assert.match(
        switcherScss,
        /\.sw__search-filter-btn[\s\S]*?&::after\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "过滤角标必须声明 font-variant-numeric: tabular-nums 等宽排版"
    );
    assert.match(
        switcherScss,
        /\.sw__search-filter-btn[\s\S]*?&::after\s*\{[^}]*font-family:\s*var\(--sw-font-mono/s,
        "过滤角标必须声明 font-family: var(--sw-font-mono) 代码字体"
    );
    assert.match(
        switcherScss,
        /\.sw__search-filter-btn[\s\S]*?&::after\s*\{[^}]*border:\s*2px solid var\(--b3-theme-surface\);/s,
        "过滤角标必须声明 2px solid var(--b3-theme-surface) 物理隔离边框"
    );
});

test("T-7755: 搜索清空按钮按压缩放微动效与输入框聚焦白卡浮起", () => {
    assert.match(
        switcherScss,
        /\.sw__search-clear\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.92\);/s,
        ".sw__search-clear 必须声明 &:active 缩放微动效"
    );
    assert.match(
        switcherScss,
        /\.sw__search\s*\{[\s\S]*?&:focus\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        ".sw__search 聚焦态必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
});

test("T-7756: 过滤触发按钮 focus-visible 统一发光微环加固", () => {
    assert.match(
        switcherScss,
        /\.sw__search-filter-btn\s*\{[\s\S]*?&:focus-visible\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        ".sw__search-filter-btn 必须声明 &:focus-visible 统一发光微环"
    );
});

test("T-7757 负向验证探针：若过滤角标丢失等宽排版或丢失白卡物理隔离必精准拦截", () => {
    // 探针 1：验证角标等宽排版
    function checkBadgeTabular(css) {
        return /\.sw__search-filter-btn[\s\S]*?&::after\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s.test(css);
    }
    assert.equal(checkBadgeTabular(switcherScss), true);

    assert.throws(() => {
        const brokenCss = switcherScss.replaceAll("font-variant-numeric: tabular-nums;", "");
        if (!checkBadgeTabular(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_BADGE_TABULAR: 过滤计数角标丢失等宽排版约束");
        }
    }, /PROBE_DETECTED_MISSING_BADGE_TABULAR/, "破坏性负向探针必须精准捕获角标等宽排版丢失缺陷");

    // 探针 2：验证角标物理隔离
    function checkBadgeBorder(css) {
        return /\.sw__search-filter-btn[\s\S]*?&::after\s*\{[^}]*border:\s*2px solid var\(--b3-theme-surface\);/s.test(css);
    }
    assert.equal(checkBadgeBorder(switcherScss), true);

    assert.throws(() => {
        const brokenCss = switcherScss.replace("border: 2px solid var(--b3-theme-surface);", "border: none;");
        if (!checkBadgeBorder(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_BADGE_BORDER: 过滤计数角标丢失 2px 物理隔离边框");
        }
    }, /PROBE_DETECTED_MISSING_BADGE_BORDER/, "破坏性负向探针必须精准捕获角标物理隔离丢失缺陷");
});
