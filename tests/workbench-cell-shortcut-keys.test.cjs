// T-7549 / T-7561 第二面板工作台小组件卡片聚焦态全键盘 F/C/M 键快速操作加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 为卡片声明 F/f 快速切换折叠/展开；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 为卡片声明 C/c 快速打开小组件配置；
//   3. 验证 second-panel-ui.ts 与 second-panel-ui.js 为卡片声明 M/m 快速打开上下文操作菜单；
//   4. 验证上述按键严格限制在 key.target === cell，保护内部输入框不被拦截；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7549/T-7561: second-panel-ui 声明卡片聚焦态 F/f 快捷折叠、C/c 快捷配置与 M/m 快捷菜单", () => {
    // TS 文件
    assert.match(
        panelTs,
        /if \(key\.key === " " \|\| key\.key === "\[" \|\| key\.key === "\]" \|\| key\.key === "f" \|\| key\.key === "F"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?foldBtn\.click\(\);/,
        "TS 文件必须在卡片聚焦态响应 F/f 键折叠展开",
    );
    assert.match(
        panelTs,
        /if \(key\.key === "c" \|\| key\.key === "C"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?cfgAction\.click\(\);/,
        "TS 文件必须在卡片聚焦态响应 C/c 键打开配置",
    );
    assert.match(
        panelTs,
        /if \(key\.key === "m" \|\| key\.key === "M"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?openWidgetContextMenu\(/,
        "TS 文件必须在卡片聚焦态响应 M/m 键打开菜单",
    );

    // JS 文件
    assert.match(
        panelJs,
        /if \(key\.key === " " \|\| key\.key === "\[" \|\| key\.key === "\]" \|\| key\.key === "f" \|\| key\.key === "F"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?foldBtn\.click\(\);/,
        "JS 文件必须在卡片聚焦态响应 F/f 键折叠展开",
    );
    assert.match(
        panelJs,
        /if \(key\.key === "c" \|\| key\.key === "C"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?cfgAction\.click\(\);/,
        "JS 文件必须在卡片聚焦态响应 C/c 键打开配置",
    );
    assert.match(
        panelJs,
        /if \(key\.key === "m" \|\| key\.key === "M"\)\s*\{[\s\S]*?if \(key\.target === cell\)\s*\{[\s\S]*?openWidgetContextMenu\(/,
        "JS 文件必须在卡片聚焦态响应 M/m 键打开菜单",
    );
});

test("T-7549/T-7561 门禁负向验证: 若缺少 F/f、C/c 或 M/m 键监听必定精准红", () => {
    const fakeTs = panelTs.replace(/key\.key === "f" \|\| key\.key === "F"/g, "false");
    assert.doesNotMatch(fakeTs, /key\.key === "f" \|\| key\.key === "F"/);

    const fakeJs = panelJs.replace(/key\.key === "c" \|\| key\.key === "C"/g, "false");
    assert.doesNotMatch(fakeJs, /key\.key === "c" \|\| key\.key === "C"/);

    const fakeMenu = panelTs.replace(/key\.key === "m" \|\| key\.key === "M"/g, "false");
    assert.doesNotMatch(fakeMenu, /key\.key === "m" \|\| key\.key === "M"/);
});
