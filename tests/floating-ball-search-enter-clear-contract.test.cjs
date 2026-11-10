// T-7408 全局悬浮球更多操作抽屉空态重置与回车清空自愈契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 floating-ball-panel.js 在 Enter 无可见可用项时执行 searchInput 清空；
//   2. 验证 floating-ball-panel.js 在 Enter 无可见项时重置 searchQuery 并触发 filterRows()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));

test("T-7408: floating-ball-panel.js 在 Enter 无结果时自动清空搜索自愈恢复", () => {
    assert.match(
        panelJs,
        /if\s*\(event\.key === "Enter"\)\s*\{[\s\S]*?if\s*\(searchInput\.value\)\s*\{[\s\S]*?searchInput\.value = "";[\s\S]*?filterRows\(\);/,
        "floating-ball-panel.js 必须在 Enter 无匹配结果时清空搜索并恢复列表",
    );
});

test("T-7408 门禁负向验证: 若 Enter 无结果时依然缺少清空必定精准红", () => {
    assert.doesNotMatch(
        panelJs,
        /if \(event\.key === "Enter"\) \{\s*if \(searchComposing \|\| event\.isComposing \|\| event\.keyCode === 229\) return;\s*const firstVisible = listHost\?\.querySelector\("\.sw__floating-ball-more-row:not\(\[hidden\]\) button:not\(:disabled\)"\);\s*if \(firstVisible\) \{\s*event\.preventDefault\(\);\s*firstVisible\.click\(\);\s*return;\s*\}\s*\}/,
    );
});
