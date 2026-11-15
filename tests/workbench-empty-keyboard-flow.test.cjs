// T-7541 第二面板工作台空态全键盘无障碍 Enter/Space 快速打开组件商店加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 cells.length === 0 时为空态设置 tabIndex = 0；
//   2. 验证 empty 元素声明 keydown 监听，Enter/Space 执行主动作（打开组件商店或推荐），ArrowUp 回焦工具栏；
//   3. 验证 bar 工具栏 ArrowDown 在无卡片时兜底落焦 .sw-home__empty；
//   4. 验证 styles/_05-settings-widgets.scss 为 .sw-home__empty 声明 :focus-visible 2px 品牌焦点环；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));
const scss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7541: second-panel-ui 为工作台空态容器设置 tabIndex = 0 与 a11y 键盘交互", () => {
    // TS 文件空态容器属性
    assert.match(
        panelTs,
        /empty\.className = "sw-home__empty";\s*empty\.setAttribute\("role", "status"\);\s*empty\.tabIndex = 0;/,
        "TS 文件必须为空态容器设置 tabIndex = 0",
    );
    // JS 文件空态容器属性
    assert.match(
        panelJs,
        /empty\.className = "sw-home__empty";\s*empty\.setAttribute\("role", "status"\);\s*empty\.tabIndex = 0;/,
        "JS 文件必须为空态容器设置 tabIndex = 0",
    );
});

test("T-7541: empty 容器监听 Enter/Space 快速触发商店/推荐动作与 ArrowUp 逆向回焦工具栏", () => {
    // TS keydown 逻辑
    assert.match(
        panelTs,
        /empty\.addEventListener\("keydown",\s*\(event:\s*KeyboardEvent\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Enter" \|\| event\.key === " "\)\s*\{[\s\S]*?primaryBtn\.click\(\);[\s\S]*?if \(event\.key === "ArrowUp"\)\s*\{[\s\S]*?firstBarBtn\.focus\(\);/,
        "TS 文件必须在空态容器实现 Enter/Space 触发与 ArrowUp 回焦",
    );
    // JS keydown 逻辑
    assert.match(
        panelJs,
        /empty\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Enter" \|\| event\.key === " "\)\s*\{[\s\S]*?primaryBtn\.click\(\);[\s\S]*?if \(event\.key === "ArrowUp"\)\s*\{[\s\S]*?firstBarBtn\.focus\(\);/,
        "JS 文件必须在空态容器实现 Enter/Space 触发与 ArrowUp 回焦",
    );
});

test("T-7541: 工具栏 ArrowDown 在无卡片时平滑降级落焦空态容器", () => {
    assert.match(
        panelTs,
        /if \(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstCell\.focus\(\);[\s\S]*?const empty = root\.querySelector<HTMLElement>\("\.sw-home__empty"\);[\s\S]*?empty\.focus\(\);/,
        "TS 工具栏 ArrowDown 必须平滑降级落焦空态容器",
    );
    assert.match(
        panelJs,
        /if \(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstCell\.focus\(\);[\s\S]*?const empty = root\.querySelector\("\.sw-home__empty"\);[\s\S]*?empty\.focus\(\);/,
        "JS 工具栏 ArrowDown 必须平滑降级落焦空态容器",
    );
});

test("T-7541: SCSS 声明 .sw-home__empty:focus-visible 2px 品牌焦点环", () => {
    assert.match(
        scss,
        /\.sw-home__empty\s*\{[^}]*?&:focus-visible\s*\{[^}]*?box-shadow:\s*0 0 0 2px color-mix\(in srgb, var\(--b3-theme-primary\) 35%, transparent\);/,
        "SCSS 必须为 .sw-home__empty:focus-visible 声明 2px 品牌焦点环",
    );
});

test("T-7541 门禁负向验证: 若空态容器未设置 tabIndex 或缺少 Enter 激活必定精准红", () => {
    assert.throws(() => {
        assert.match(panelTs, /empty\.className = "sw-home__empty";\s*empty\.setAttribute\("role", "status"\);\s*const hasSources/);
    }, assert.AssertionError);

    assert.throws(() => {
        assert.match(scss, /\.sw-home__empty\s*\{[^}]*?&:focus-visible\s*\{[^}]*?box-shadow:\s*none;/);
    }, assert.AssertionError);
});
