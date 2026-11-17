// T-7426 全局悬浮球首层快捷动作栏方向键循环焦点流与 Escape 退出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 floating-ball-panel.js 在 firstLayerHost 声明方向键循环流；
//   2. 验证 floating-ball-panel.js 声明 Escape 回焦 trigger；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));

test("T-7426: floating-ball-panel.js 在 firstLayerHost 声明方向键循环流与 Escape 回焦", () => {
    assert.match(
        panelJs,
        /firstLayerHost\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(open\) return;[\s\S]*?if \(\["ArrowRight",\s*"ArrowLeft",\s*"ArrowDown",\s*"ArrowUp"\]\.includes\(event\.key\)\)[\s\S]*?buttons\[nextIdx\]\?\.focus\(/,
        "firstLayerHost 必须声明方向键循环焦点流",
    );
    assert.match(
        panelJs,
        /if \(event\.key === "Escape"\) \{[\s\S]*?const trigger = container\.querySelector\?\.?\("\.sw-fab-trigger"\);[\s\S]*?trigger\.focus\(\);/,
        "firstLayerHost 必须声明 Escape 回焦 trigger",
    );
});

test("T-7426 门禁负向验证: 若缺少 !open 状态守卫导致抽屉冲突必定精准红", () => {
    assert.doesNotMatch(panelJs, /firstLayerHost\.addEventListener\("keydown", \(event\) => \{\s*if \(\["ArrowRight"/);
});
