// T-7438 工作台健康监控弹窗 Escape 退出与键盘流加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 openHomeHealthDetails 绑定 Escape 监听；
//   2. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7438: second-panel-ui 在 openHomeHealthDetails 声明 Escape 退出", () => {
    assert.match(
        panelTs,
        /mountPlatformDialogCloseHint\(dialog\.element,[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(event: KeyboardEvent\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?dialog\.destroy\(\);/,
        "TS 文件必须包含健康监控弹窗 Escape 监听",
    );
    assert.match(
        panelJs,
        /mountPlatformDialogCloseHint\)\(dialog\.element,[\s\S]*?dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?dialog\.destroy\(\);/,
        "JS 文件必须包含健康监控弹窗 Escape 监听",
    );
});

test("T-7438 门禁负向验证: 若健康弹窗缺少 Escape 监听必定精准红", () => {
    assert.doesNotMatch(panelTs, /mountPlatformDialogCloseHint\(dialog\.element, this\.i18n\.platformCloseHint \|\| "to close"\);\s*const listRoot = dialog\.element\.querySelector/);
});
