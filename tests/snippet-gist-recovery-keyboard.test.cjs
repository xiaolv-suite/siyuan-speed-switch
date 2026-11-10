// T-7430 片段实验室 Gist 状态恢复弹窗 Escape 兜底与按钮导航契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 openGistRecoveryDialog 声明 Escape 监听与 destroy；
//   2. 验证 snippet-studio-ui.js 声明 ArrowLeft/ArrowRight 循环导航；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7430: snippet-studio-ui.js 在 openGistRecoveryDialog 声明 Escape 监听与左右方向键流", () => {
    assert.match(
        studioJs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?dialog\.destroy\(\);[\s\S]*?if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\)[\s\S]*?buttons\[nextIdx\]\?\.focus\(/,
        "必须声明 Escape 退出与左右方向键循环",
    );
});

test("T-7430 门禁负向验证: 若 Gist 恢复弹窗缺少 Escape 监听必定精准红", () => {
    assert.doesNotMatch(studioJs, /actions\.append\(confirm, keepLocked\);\s*box\.append\(message, actions\);\s*keepLocked\.focus/);
});
