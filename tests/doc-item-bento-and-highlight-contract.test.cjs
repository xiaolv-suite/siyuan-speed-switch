// tests/doc-item-bento-and-highlight-contract.test.cjs
// 契约测试：全库搜索卡片双层微底白卡浮起、能量指示光条与高亮主题色（T-7746~T-7749）
// 1. 验证 _03-switcher-mobile.scss 中 .sw__doc-item 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 2. 验证 _11-ui-polish.scss 中 .sw__doc-item 声明 var(--sw-card-float-bg)、var(--sw-shadow-bento) 与 hover 上浮；
// 3. 验证 mark 关键词高亮接入 var(--sw-color-accent)；
// 4. 负向验证探针：若搜索卡片丢失 Bento 软影或高亮丢失主题语义色，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const switcherScss = fs.readFileSync(path.join(ROOT, "src/styles/_03-switcher-mobile.scss"), "utf8");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");

test("T-7746: 全库搜索卡片双层微底白卡浮起与 Bento 深度软影加固", () => {
    assert.match(
        switcherScss,
        /\.sw__doc-item\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "_03-switcher-mobile.scss 中 .sw__doc-item 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        switcherScss,
        /\.sw__doc-item\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "_03-switcher-mobile.scss 中 .sw__doc-item 必须声明 var(--sw-shadow-bento) 深度软影"
    );
    assert.match(
        polishScss,
        /\.sw__doc-item\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "_11-ui-polish.scss 中 .sw__doc-item 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        polishScss,
        /\.sw__doc-item\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "_11-ui-polish.scss 中 .sw__doc-item 必须声明 var(--sw-shadow-bento) 深度软影"
    );
});

test("T-7747: 左侧能量指示光条与悬停平滑展开动效统合", () => {
    assert.match(
        polishScss,
        /\.sw__doc-item\s*\{[\s\S]*?&::before\s*\{[^}]*background:\s*linear-gradient\(180deg,\s*var\(--lv-brand/s,
        ".sw__doc-item 必须保留能量指示光条渐变"
    );
    assert.match(
        polishScss,
        /\.sw__doc-item:hover,\s*\.sw__doc-item:focus-visible\s*\{[\s\S]*?transform:\s*translateY\(-2px\);/s,
        ".sw__doc-item hover 态必须声明 translateY(-2px) 上浮"
    );
});

test("T-7748: 关键词命中高亮 mark 接入主题强调色与微圆角加固", () => {
    assert.match(
        switcherScss,
        /mark\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--sw-color-accent/s,
        "mark 高亮背景必须接入 var(--sw-color-accent)"
    );
    assert.match(
        switcherScss,
        /mark\s*\{[^}]*color:\s*var\(--sw-color-accent/s,
        "mark 高亮文字颜色必须接入 var(--sw-color-accent)"
    );
});

test("T-7749 负向验证探针：若搜索卡片丢失 Bento 软影或高亮丢失主题语义色必精准拦截", () => {
    // 探针 1：验证卡片 Bento 软影
    function checkDocItemBento(css) {
        return /\.sw__doc-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkDocItemBento(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace("box-shadow: var(--sw-shadow-bento);", "box-shadow: none;");
        if (!checkDocItemBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_DOC_ITEM_BENTO: 搜索结果卡片丢失 var(--sw-shadow-bento) 软影");
        }
    }, /PROBE_DETECTED_MISSING_DOC_ITEM_BENTO/, "破坏性负向探针必须精准捕获搜索卡片软影丢失缺陷");

    // 探针 2：验证 mark 主题色接入
    function checkMarkAccent(css) {
        return /mark\s*\{[^}]*color:\s*var\(--sw-color-accent/s.test(css);
    }
    assert.equal(checkMarkAccent(switcherScss), true);

    assert.throws(() => {
        const brokenCss = switcherScss.replace("color: var(--sw-color-accent, var(--b3-theme-primary));", "color: black;");
        if (!checkMarkAccent(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_MARK_ACCENT: 关键词高亮丢失 var(--sw-color-accent) 语义色");
        }
    }, /PROBE_DETECTED_MISSING_MARK_ACCENT/, "破坏性负向探针必须精准捕获关键词高亮主题色丢失缺陷");
});
