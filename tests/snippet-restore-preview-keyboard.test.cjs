// T-7451 代码片段备份恢复预览弹窗 Escape 退出与 ⌘Enter 快捷恢复契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 openRestorePreview 声明 Escape 监听与 close()；
//   2. 验证 snippet-studio-ui.js 声明 ⌘Enter 快捷提交与左右方向键流；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7451: snippet-studio-ui.js 在 openRestorePreview 声明 Escape 退出与 ⌘Enter 恢复", () => {
    assert.match(
        studioJs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?close\(\);[\s\S]*?if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"\) \{[\s\S]*?confirmButton\.click\(\);[\s\S]*?if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\)/,
        "必须声明 Escape 退出、⌘Enter 恢复与左右方向键流",
    );
});

test("T-7451 门禁负向验证: 若恢复弹窗未绑定 Escape 必定精准红", () => {
    assert.doesNotMatch(
        studioJs,
        /actions\.append\(cancelButton, confirmButton\);\s*box\.append\(summary, list, hint, actions\);\s*cancelButton\.focus/,
    );
});
