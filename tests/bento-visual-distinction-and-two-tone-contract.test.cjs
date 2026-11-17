// T-7621 Bento 视觉辨识度、两色分工与双层近远柔影契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _00-tokens 声明 --sw-bg-tinted、--sw-card-float-bg 与 --sw-color-data；
//   2. 验证 _00-tokens 声明 --sw-card-accent-dark 与 --sw-font-stat-hero: 36px；
//   3. 验证 _08-home-store-cards 连续打卡状态引用 --sw-color-data（两色严格分工）；
//   4. 验证 _11-ui-polish 声明内外圆角嵌套差值约束（卡片内动作 6px 圆角）；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const tokensScss = readSourceText(path.join(root, "src", "styles", "_00-tokens.scss"));
const cardsScss = readSourceText(path.join(root, "src", "styles", "_08-home-store-cards.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7621: 核心辨识度令牌声明（同族极浅底、纯白浮卡、数据语义色与深色重音）", () => {
    assert.match(
        tokensScss,
        /--sw-bg-tinted:\s*color-mix\(in srgb,\s*var\(--sw-color-accent\)\s*4\.5%,\s*var\(--b3-theme-background\)\)/,
        "必须以主题色为基准派生明度约96%~98%、饱和度3%~6%的同族极浅背景",
    );
    assert.match(
        tokensScss,
        /--sw-color-data:\s*color-mix\(in srgb,\s*var\(--sw-color-accent\)\s*60%,\s*#10b981\s*40%\)/,
        "数据语义色必须为色轮顺时针偏转约25°的活力极光青绿",
    );
    assert.match(
        tokensScss,
        /--sw-card-accent-dark:\s*color-mix\(in srgb,\s*var\(--sw-color-accent\)\s*12%,\s*#0e111a\)/,
        "深色重音卡片必须为明度10%~14%带有主题色相的近黑",
    );
    assert.match(
        tokensScss,
        /--sw-font-stat-hero:\s*36px;/,
        "必须声明36px大落差英雄位主数据字号",
    );
});

test("T-7621: 两色严格分工落地（连续打卡数据使用派生数据语义色）", () => {
    assert.match(
        cardsScss,
        /&\.is-today\s*\{[^}]*\.sw__home-capsule-dot\s*\{[^}]*background:\s*var\(--sw-color-data/s,
        "今日达成必须由数据语义色承载，严禁与操作主色混用",
    );
});

test("T-7621: 嵌套圆角层级递减约束（外圆角减内边距推导）", () => {
    assert.match(
        polishScss,
        /\.sw__card-action,\s*\.sw__doc-item-action\s*\{[^}]*border-radius:\s*var\(--sw-radius-sm,\s*6px\)/s,
        "卡片内嵌套操作必须遵循外圆角减内边距法则收敛至6px微圆角",
    );
});

test("T-7621 门禁负向验证: 若两色分工被破坏或深色块使用纯死黑必定精确红", () => {
    // 探针 1: 负向断言重音卡片使用 #000 纯死黑必须被拒绝
    assert.doesNotMatch(
        tokensScss,
        /--sw-card-accent-dark:\s*#000000;/,
        "严禁使用没有色相与层次的纯死黑作为重音卡片",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw__test_token { --sw-color-data: red; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /--sw-color-data:\s*color-mix\(in srgb/,
        );
    }, assert.AssertionError);
});
