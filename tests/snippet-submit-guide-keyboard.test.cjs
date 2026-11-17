// T-7448 片段商店投稿指引弹窗 Escape 兜底与按钮左右方向键流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 在 openSubmitGuide 声明 Escape 监听与 overlay.remove()；
//   2. 验证 snippet-studio-ui.js 声明 ArrowLeft/ArrowRight 循环导航与 closeBtn.focus()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7448: snippet-studio-ui.js 在 openSubmitGuide 声明 Escape 监听与左右方向键流", () => {
    assert.match(
        studioJs,
        /overlay\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?overlay\.remove\(\);[\s\S]*?if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\)[\s\S]*?buttons\[nextIdx\]\?\.focus\(/,
        "必须声明 Escape 退出与左右方向键循环",
    );
    assert.match(
        studioJs,
        /closeBtn\.focus\(\{preventScroll:\s*true\}\);/,
        "必须默认聚焦 closeBtn",
    );
});

test("T-7448 门禁负向验证: 若投稿浮层缺少 Escape 监听必定精准红", () => {
    assert.doesNotMatch(
        studioJs,
        /actions\.append\(copyJsonBtn, closeBtn\);\s*box\.append\(head, desc, actions\);\s*overlay\.appendChild\(box\);\s*doc\.body\.appendChild\(overlay\);\s*closeBtn\.focus/,
    );
});
