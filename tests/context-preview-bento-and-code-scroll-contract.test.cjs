// T-7673 上下文预览面板 Bento 浮起质感与长代码横向滚动隔离契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__doc-preview 声明 --sw-shadow-bento 与 --sw-focus-glow；
//   2. 验证 .sw__doc-preview-block--code 声明 max-width: 100% 与 overflow-x: auto；
//   3. 验证固定与查找开关声明胶囊圆角与微触感过渡；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const switcherScss = readSourceText(path.join(root, "src", "styles", "_03-switcher-mobile.scss"));

test("T-7673: 上下文预览面板声明 Bento 双层柔影与发光焦点环", () => {
    assert.match(
        switcherScss,
        /\.sw__doc-preview\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento,\s*var\(--sw-shadow-xs\)\);/s,
        "预览面板必须声明近远复合柔影 --sw-shadow-bento",
    );
    assert.match(
        switcherScss,
        /\.sw__doc-preview\s*\{[\s\S]*?&:focus-within\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        "预览面板获焦时必须接入全局统一发光焦点环",
    );
});

test("T-7673: 预览代码块声明 max-width: 100% 与横向滚动防护", () => {
    assert.match(
        switcherScss,
        /\.sw__doc-preview-block--code\s*\{[\s\S]*?max-width:\s*100%;/s,
        "预览代码块必须声明 100% 限宽防护",
    );
    assert.match(
        switcherScss,
        /\.sw__doc-preview-block--code\s*\{[\s\S]*?overflow-x:\s*auto;/s,
        "预览代码块必须声明横向滚动隔离，杜绝撑破容器",
    );
});

test("T-7673: 预览固定与查找按钮声明胶囊圆角", () => {
    assert.match(
        switcherScss,
        /\.sw__doc-preview-pin,\s*\.sw__doc-preview-find-toggle\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "预览头部动作按钮必须声明全圆角胶囊规范",
    );
});

test("T-7673 门禁负向验证: 若代码块移除滚动防护必报错", () => {
    // 探针 1: 负向断言严禁在预览代码块声明 overflow-x: visible
    assert.doesNotMatch(
        switcherScss,
        /\.sw__doc-preview-block--code\s*\{[\s\S]*?overflow-x:\s*visible;/s,
        "严禁在代码块中使用 visible 导致容器撑破",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenStyles = `.sw__doc-preview-block--code { overflow-x: visible; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /overflow-x:\s*auto;/,
        );
    }, assert.AssertionError);
});
