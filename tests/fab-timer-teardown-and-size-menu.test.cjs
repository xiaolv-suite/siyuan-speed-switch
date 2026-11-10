// T-7572 浮动球定时器对称清理与工作台重绘尺寸菜单解绑契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 floating-ball-ui.ts 与 floating-ball-ui.js destroy 时对 busyTimer 提供 view 缺失下的全局 clearTimeout 兜底；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 renderPanel 重绘起始阶段主动调用 disposeSizeMenu()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const fabTs = readSourceText(path.join(root, "src", "floating-ball-ui.ts"));
const fabJs = readSourceText(path.join(root, "src", "floating-ball-ui.js"));
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7572: floating-ball-ui destroy 时对 busyTimer 具备对称兜底清理", () => {
    // TS
    assert.match(
        fabTs,
        /if \(this\.busyTimer !== null\)\s*\{[\s\S]*?if \(view\)\s*view\.clearTimeout\(this\.busyTimer\);[\s\S]*?else\s*clearTimeout\(this\.busyTimer\);[\s\S]*?this\.busyTimer = null;/,
        "TS floating-ball-ui destroy 必须包含 busyTimer 对称清理",
    );

    // JS
    assert.match(
        fabJs,
        /if \(this\.busyTimer !== null\)\s*\{[\s\S]*?if \(view\)[\s\S]*?else\s*clearTimeout\(this\.busyTimer\);[\s\S]*?this\.busyTimer = null;/,
        "JS floating-ball-ui destroy 必须包含 busyTimer 对称清理",
    );
});

test("T-7572: second-panel-ui 在 renderPanel 重绘时主动调用 disposeSizeMenu", () => {
    // TS
    assert.match(
        panelTs,
        /panelEventCleanup = null;[\s\S]*?disposeSizeMenu\(\);[\s\S]*?clearDeferredRefreshes\(\);/,
        "TS second-panel-ui 必须在 renderPanel 清理已打开的尺寸菜单",
    );

    // JS
    assert.match(
        panelJs,
        /panelEventCleanup = null;[\s\S]*?disposeSizeMenu\(\);[\s\S]*?clearDeferredRefreshes\(\);/,
        "JS second-panel-ui 必须在 renderPanel 清理已打开的尺寸菜单",
    );
});

test("T-7572 门禁负向验证: 若 renderPanel 未调用 disposeSizeMenu 必被拦截", () => {
    assert.throws(() => {
        assert.match(panelTs, /panelEventCleanup = null;\s*clearDeferredRefreshes\(\);/);
    }, assert.AssertionError);
});
