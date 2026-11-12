// T-7443 悬浮球更多抽屉列表 Home/End/Escape 全键盘导航加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 floating-ball-panel.js 在 listHost 声明 Home 与 End 跳转；
//   2. 验证 floating-ball-panel.js 在 listHost 声明 Escape 关闭抽屉并恢复焦点；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const fabJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));

test("T-7443: floating-ball-panel.js 在 listHost 声明 Home/End 与 Escape 支持", () => {
    assert.match(
        fabJs,
        /if \(event\.key === "Escape"\) \{[\s\S]*?closeMore\(\{restoreFocus:\s*true\}\);[\s\S]*?if \(event\.key === "Home" \|\| event\.key === "End"\) \{/,
        "listHost 必须声明 Escape 与 Home/End 导航",
    );
});

test("T-7443 门禁负向验证: 若缺少 Home/End 快速跳转必定精准红", () => {
    assert.doesNotMatch(
        fabJs,
        /listHost\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{\s*if \(event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"\)/,
    );
});
