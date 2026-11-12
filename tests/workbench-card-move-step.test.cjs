"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const tsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const jsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_05-settings-widgets.scss"));

test("T-7497: second-panel-ui.ts 与 second-panel-ui.js 包含重排步长位置反馈", () => {
    assert.match(
        tsSource,
        /layoutOpLabel\s*=\s*`\$\{this\.i18n\.homeHistoryMove\}\s*\(\$\{pos \+ 1\}\/\$\{result\.list\.length\}\)\`/,
        "TS 移动组件后必须记录序号/总数步长回执",
    );
    assert.match(
        jsSource,
        /layoutOpLabel\s*=\s*`\$\{this\.i18n\.homeHistoryMove\}\s*\(\$\{pos \+ 1\}\/\$\{result\.list\.length\}\)\`/,
        "JS 镜像必须同步记录序号/总数步长回执",
    );
});

test("T-7497: 拖拽把手包含触觉悬停微抬升与点击按压微缩放", () => {
    assert.match(
        scss,
        /\.sw-home__tool--drag\s*\{[\s\S]*?&:hover\s*\{[\s\S]*?transform:\s*translateY\(-1px\);/,
        "把手悬停时必须具有轻微抬升动效",
    );
    assert.match(
        scss,
        /\.sw-home__tool--drag:active\s*\{[\s\S]*?transform:\s*scale\(0\.96\);/,
        "把手按压时必须具有触觉反馈微缩放",
    );
});
