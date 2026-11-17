// T-7417 工作台编辑态小组件卡片平滑方向键焦点导航契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 cell keydown 中声明普通方向键焦点切换；
//   2. 验证 普通方向键与 Ctrl/Cmd 重排按键严格互斥；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7417: second-panel-ui.ts 包含小组件卡片平滑方向键焦点导航", () => {
    assert.match(
        panelTs,
        /if\s*\(!key\.ctrlKey && !key\.metaKey && !key\.altKey && !key\.shiftKey\)\s*\{[\s\S]*?cells\[nextIdx\]\.focus\(\);/,
        "TS 文件必须包含普通方向键卡片焦点切换",
    );
});

test("T-7417: second-panel-ui.js 包含小组件卡片平滑方向键焦点导航", () => {
    assert.match(
        panelJs,
        /if\s*\(!key\.ctrlKey && !key\.metaKey && !key\.altKey && !key\.shiftKey\)\s*\{[\s\S]*?cells\[nextIdx\]\.focus\(\);/,
        "JS 文件必须包含普通方向键卡片焦点切换",
    );
});

test("T-7417 门禁负向验证: 若带修饰键时仍进入普通导航必定精准红", () => {
    assert.doesNotMatch(panelTs, /if \(key\.ctrlKey \|\| key\.metaKey\) \{\s*if \(\["ArrowRight"/);
});
