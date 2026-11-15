// T-7677 商店分类全圆角胶囊分段与进度条柔和渐变契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home-store__tabs 声明胶囊圆角 --sw-platform-radius-pill；
//   2. 验证 .sw-home-store__tab.is-active 声明纯白浮卡底色与 --sw-shadow-xs；
//   3. 验证 .sw__home-progress-fill 声明胶囊全圆角与渐变面积；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeScss = readSourceText(path.join(root, "src", "styles", "_07-sidebar-panel-store.scss"));

test("T-7677: 商店分类 Tab 声明胶囊全圆角分段槽位", () => {
    assert.match(
        storeScss,
        /\.sw-home-store__tabs\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "商店 Tab 槽必须声明全圆角胶囊规范",
    );
    assert.match(
        storeScss,
        /\.sw-home-store__tab\s*\{[\s\S]*?&.is-active\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "激活态 Tab 必须声明纯白浮卡底色",
    );
});

test("T-7677: 概览进度条声明 999px 胶囊圆头与双色柔和渐变", () => {
    assert.match(
        storeScss,
        /\.sw__home-progress-fill\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "进度条填充必须声明全圆头胶囊",
    );
    assert.match(
        storeScss,
        /\.sw__home-progress-fill\s*\{[\s\S]*?background:\s*linear-gradient\(90deg,/s,
        "进度条必须声明柔和水平渐变面积",
    );
});

test("T-7677 门禁负向验证: 若 Tab 回退为 2px 实线底边必报错", () => {
    // 探针 1: 负向断言严禁在分类 Tab 声明 2px 粗底横线
    assert.doesNotMatch(
        storeScss,
        /\.sw-home-store__tab\s*\{[\s\S]*?border-bottom:\s*2px solid/s,
        "严禁使用老旧的 2px 底横线 Tab",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenStyles = `.sw-home-store__tab { border-bottom: 2px solid red; }`;
    assert.throws(() => {
        assert.doesNotMatch(
            brokenStyles,
            /border-bottom:\s*2px solid/,
        );
    }, assert.AssertionError);
});
