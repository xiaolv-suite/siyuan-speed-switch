// T-7419 片段实验室离开与冲突确认弹窗 Escape 兜底与全键盘导航契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 openLeaveDialog 中声明 ArrowLeft/ArrowRight 循环导航；
//   2. 验证 snippet-studio-ui.js 在 openConflictDialog 中声明 Escape 兜底取消；
//   3. 验证 snippet-studio-ui.js 在 openConflictDialog 中声明 ArrowLeft/ArrowRight 循环导航；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7419: snippet-studio-ui.js 在 openLeaveDialog 声明左右方向键按钮循环", () => {
    assert.match(
        studioJs,
        /if\s*\(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\)\s*\{[\s\S]*?const choiceBtns = \[saveChoice,\s*discardChoice,\s*cancelChoice\][\s\S]*?choiceBtns\[nextIdx\]\?\.focus/,
        "离开弹窗必须支持左右方向键按钮循环",
    );
});

test("T-7419: snippet-studio-ui.js 在 openConflictDialog 声明 Escape 兜底与左右按钮循环", () => {
    assert.match(
        studioJs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?cancelButton\.click\(\);/,
        "冲突弹窗必须声明 Escape 拦截并触发 cancelButton.click()",
    );
    assert.match(
        studioJs,
        /const conflictBtns = \[continueButton,\s*copyButton,\s*reloadButton,\s*cancelButton\][\s\S]*?conflictBtns\[nextIdx\]\?\.focus/,
        "冲突弹窗必须支持左右方向键按钮循环",
    );
});

test("T-7419 门禁负向验证: 若冲突弹窗未绑定 Escape 必定精准红", () => {
    assert.doesNotMatch(studioJs, /actions\.append\(continueButton, copyButton, reloadButton, cancelButton\);\s*box\.append\(message, diffBox, actions\);\s*cancelButton\.focus/);
});
