"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const studioJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));

test("T-7503: snippet-studio-ui.js 为冲突差异容器声明 tabIndex 与 region 无障碍语义", () => {
    assert.match(
        studioJs,
        /diffBox\.tabIndex\s*=\s*0;[\s\S]*?diffBox\.setAttribute\("role",\s*"region"\);/,
        "diffBox 必须声明 tabIndex=0 与 role='region'",
    );
    assert.match(
        studioJs,
        /diffBox\.addEventListener\("keydown",\s*\(e\) => \{[\s\S]*?e\.key === "ArrowDown"[\s\S]*?diffBox\.scrollTop \+= 32;/,
        "diffBox 必须支持 ArrowDown 键盘垂直滚动",
    );
});

test("T-7503: 冲突对话框声明 Tab 与 Shift+Tab 焦点环捕获循环流", () => {
    assert.match(
        studioJs,
        /if \(event\.key === "Tab"\) \{[\s\S]*?const focusableList = \[diffBox, continueButton, copyButton, reloadButton, cancelButton\]/,
        "必须将 diffBox 与各操作按钮纳入 Tab 焦点捕获列表",
    );
    assert.match(
        studioJs,
        /if \(event\.shiftKey\) \{[\s\S]*?focusableList\[focusableList\.length - 1\]\?\.focus/,
        "Shift+Tab 首项必须循环回焦末项",
    );
});

test("T-7503: 样式层声明 .sw-studio__conflict-diff:focus-visible 键盘聚焦轮廓", () => {
    assert.match(
        scss,
        /\.sw-studio__conflict-diff\s*\{[\s\S]*?&:focus-visible\s*\{[\s\S]*?border-color:\s*var\(--studio-accent\);/,
        "_snippet-studio.scss 必须声明 conflict-diff focus-visible 聚焦环",
    );
});
