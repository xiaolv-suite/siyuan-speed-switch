"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const studioJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));

test("T-7487: snippet-studio-ui.js 为预览窗格声明 tabIndex 与 region 无障碍语义", () => {
    assert.match(
        studioJs,
        /savedPane\.tabIndex\s*=\s*0;[\s\S]*?savedPane\.setAttribute\("role",\s*"region"\);/,
        "savedPane 必须声明 tabIndex=0 与 role='region'",
    );
    assert.match(
        studioJs,
        /draftPane\.tabIndex\s*=\s*0;[\s\S]*?draftPane\.setAttribute\("role",\s*"region"\);/,
        "draftPane 必须声明 tabIndex=0 与 role='region'",
    );
});

test("T-7487: 预览双栏支持 Arrow 方向键滚动与 Ctrl/Cmd 视口缩放（+/-/0）", () => {
    // 1. 键盘方向键滚动
    assert.match(
        studioJs,
        /e\.key === "ArrowDown"[\s\S]*?target\.scrollTop \+= 40/,
        "窗格必须支持 ArrowDown 键盘垂直滚动",
    );
    assert.match(
        studioJs,
        /e\.key === "ArrowUp"[\s\S]*?target\.scrollTop -= 40/,
        "窗格必须支持 ArrowUp 键盘垂直滚动",
    );

    // 2. 缩放快捷键
    assert.match(
        studioJs,
        /previewSection\.addEventListener\("keydown",\s*\(e\) => \{[\s\S]*?\(e\.ctrlKey \|\| e\.metaKey\) && !e\.altKey/,
        "previewSection 必须挂载 Ctrl/Cmd 快捷键监听",
    );
    assert.match(
        studioJs,
        /applyPreviewZoom\(previewZoomLevel \+ 0\.1\)/,
        "必须支持放大缩放",
    );
    assert.match(
        studioJs,
        /applyPreviewZoom\(previewZoomLevel - 0\.1\)/,
        "必须支持缩小缩放",
    );
    assert.match(
        studioJs,
        /applyPreviewZoom\(1\.0\)/,
        "按 0 必须重置为 1.0 原始缩放",
    );
});

test("T-7487: 样式层声明 &__preview-pane:focus-visible 键盘聚焦轮廓", () => {
    assert.match(
        scss,
        /&__preview-pane\s*\{[\s\S]*?&:focus-visible\s*\{[\s\S]*?box-shadow:\s*0 0 0 2px var\(--studio-accent\);/,
        "_snippet-studio.scss 必须声明 preview-pane focus-visible 聚焦环",
    );
});
