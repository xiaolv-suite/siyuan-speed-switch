// T-7567 次级弹窗全量接入悬浮球避让与 onToggleAction 空指针防御契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 openSecondPanel 构造时调用 suspendFABForDialog 并在 destroy 释放；
//   2. 验证 index.ts 与 index.js 在 openQuickCapture 构造时调用 suspendFABForDialog 并在 destroy 释放；
//   3. 验证 index.ts 与 index.js 在 onToggleAction 实现中对 current.actions[surface] 具备空值防御；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const secondPanelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7567: openSecondPanel 统一接入 suspendFABForDialog 并在销毁时成对释放", () => {
    // TS
    assert.match(
        secondPanelTs,
        /const releaseFab(?::\s*\(\)\s*=>\s*void)?\s*=\s*typeof this\.suspendFABForDialog === "function"\s*\?\s*this\.suspendFABForDialog\(\)\s*:\s*\([^)]*\)\s*(?::\s*void\s*)?=>\s*undefined;[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?releasePanel\(\);[\s\S]*?releaseFab\(\);/,
        "TS 文件 openSecondPanel 必须成对调用并释放 suspendFABForDialog",
    );

    // JS
    assert.match(
        secondPanelJs,
        /const releaseFab(?::\s*\(\)\s*=>\s*void)?\s*=\s*typeof this\.suspendFABForDialog === "function"\s*\?\s*this\.suspendFABForDialog\(\)\s*:\s*\([^)]*\)\s*(?::\s*void\s*)?=>\s*undefined;[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?releasePanel\(\);[\s\S]*?releaseFab\(\);/,
        "JS 文件 openSecondPanel 必须成对调用并释放 suspendFABForDialog",
    );
});

test("T-7567: openQuickCapture 统一接入 suspendFABForDialog 并在销毁时释放", () => {
    // TS
    assert.match(
        indexTs,
        /openQuickCapture\([^)]*\)\s*\{[\s\S]*?const releaseFab = this\.suspendFABForDialog\(\);[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?releaseFab\(\);/,
        "TS 文件 openQuickCapture 必须调用并在 destroyCallback 释放 suspendFABForDialog",
    );

    // JS
    assert.match(
        indexJs,
        /openQuickCapture\([^)]*\)\s*\{[\s\S]*?const releaseFab = this\.suspendFABForDialog\(\);[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?releaseFab\(\);/,
        "JS 文件 openQuickCapture 必须调用并在 destroyCallback 释放 suspendFABForDialog",
    );
});

test("T-7567: onToggleAction 具备 surfaceActions 判空防御杜绝 TypeError", () => {
    // TS
    assert.match(
        indexTs,
        /onToggleAction:\s*\(actionId:\s*string,\s*enabled:\s*boolean\)\s*=>\s*\{[\s\S]*?const surfaceActions = current\?\.actions\?\.\[surface\] \|\| \[\];/,
        "TS 文件 onToggleAction 必须对 surfaceActions 具备空数组兜底",
    );

    // JS
    assert.match(
        indexJs,
        /onToggleAction:\s*\(actionId,\s*enabled\)\s*=>\s*\{[\s\S]*?const surfaceActions = current\?\.actions\?\.\[surface\] \|\| \[\];/,
        "JS 文件 onToggleAction 必须对 surfaceActions 具备空数组兜底",
    );
});

test("T-7567 门禁负向验证: 若 openQuickCapture 未绑定 releaseFab 必被拦截", () => {
    const fakeTs = indexTs.replace(/destroyCallback:\s*\(\)\s*=>\s*\{\s*releaseFab\(\);\s*\},/, "/* removed */");
    assert.doesNotMatch(fakeTs, /openQuickCapture[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{\s*releaseFab\(\);\s*\}/);

    assert.throws(() => {
        assert.match(indexTs, /actions:\s*\{\.\.\.current\.actions,\s*\[surface\]:\s*current\.actions\[surface\]\.map\(/);
    }, assert.AssertionError);
});
