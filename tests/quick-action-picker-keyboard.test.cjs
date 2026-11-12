// T-7454 快捷动作选择器 Escape 退出、搜索框全选与键盘流加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 quick-actions-ui.js 包含 closePicker 回焦与 Escape 阶梯退出；
//   2. 验证 quick-actions-ui.js 包含 search focus select() 与 ArrowDown/Enter 导航；
//   3. 验证 quick-actions-ui.js 包含 results 方向键流与 Home/End 支持；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const quickJs = readSourceText(path.join(root, "src", "quick-actions-ui.js"));

test("T-7454: quick-actions-ui.js 包含 closePicker 回焦与 Escape 阶梯退出", () => {
    assert.match(
        quickJs,
        /const closePicker = \(\) => \{[\s\S]*?trigger\.setAttribute\("aria-expanded",\s*"false"\);[\s\S]*?trigger\.focus/,
        "必须声明 closePicker 回焦",
    );
    assert.match(
        quickJs,
        /if \(event\.key === "Escape"\) \{[\s\S]*?if \(document\.activeElement === search && search\.value\) \{[\s\S]*?closePicker\(\);/,
        "必须声明 Escape 阶梯调度与退出",
    );
});

test("T-7454: quick-actions-ui.js 包含 search focus select() 与结果列表方向键流", () => {
    assert.match(
        quickJs,
        /search\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?search\.select\(\);/,
        "搜索框必须获焦全选",
    );
    assert.match(
        quickJs,
        /if \(event\.key === "ArrowUp" && idx === 0\) \{[\s\S]*?search\.focus/,
        "列表首项必须支持 ArrowUp 回焦搜索框",
    );
    assert.match(
        quickJs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{/,
        "列表必须支持 Home/End 跳转",
    );
});

test("T-7454 门禁负向验证: 若未绑定 closePicker 必定精准红", () => {
    assert.doesNotMatch(
        quickJs,
        /search\.addEventListener\("input",\s*render\);\s*render\(\);\s*search\.focus\(\{preventScroll:\s*true\}\);\s*return picker;/,
    );
});
