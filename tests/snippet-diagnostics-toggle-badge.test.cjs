"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const studioJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));

test("T-7499: snippet-studio-ui.js 为样式诊断摘要声明 data-findings 计数属性", () => {
    assert.match(
        studioJs,
        /const totalFindings = counts\.hit \+ counts\.miss \+ counts\.unknown \+ diagnostics\.errors\.length;/,
        "必须计算诊断规则与错误的总和计数",
    );
    assert.match(
        studioJs,
        /diagnosticsSummary\.dataset\.findings = String\(totalFindings\);/,
        "必须将总计数绑定至 diagnosticsSummary 的 dataset.findings",
    );
});

test("T-7499: 支持 Ctrl/Cmd+Shift+D 与 Alt+D 快捷折叠/展开诊断抽屉", () => {
    assert.match(
        studioJs,
        /\(event\.ctrlKey \|\| event\.metaKey\) && event\.shiftKey && String\(event\.key\)\.toLowerCase\(\) === "d"/,
        "必须支持 Ctrl/Cmd+Shift+D 切换诊断抽屉",
    );
    assert.match(
        studioJs,
        /event\.altKey && String\(event\.key\)\.toLowerCase\(\) === "d"/,
        "必须支持 Alt+D 快捷切换诊断抽屉",
    );
    assert.match(
        studioJs,
        /diagnosticsDetails\.open = !diagnosticsDetails\.open;/,
        "触发时必须切换 diagnosticsDetails 的 open 属性",
    );
});

test("T-7499: 样式层声明 .sw-studio__diagnostics-summary 计数角标伪类", () => {
    assert.match(
        scss,
        /&\[data-findings\]::after\s*\{[\s\S]*?content:\s*attr\(data-findings\);/,
        "_snippet-studio.scss 必须声明 &[data-findings]::after 计数角标",
    );
});
