// T-7437 动作画板多页签一键导出为任务思维导图/大纲契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-model.js 包含 export-tabs-mindmap 动作；
//   2. 验证 index.ts 与 index.js 声明 exportTabsAsMindmap；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");
const {getBuiltinActionDefinitions} = require("../src/action-palette-model.js");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7437: action-palette-model.js 包含 export-tabs-mindmap 动作", () => {
    const actions = getBuiltinActionDefinitions({
        actionPaletteExportTabs: "将所有打开页签导出为思维导图/大纲",
    });
    const found = actions.find((a) => a.id === "export-tabs-mindmap");
    assert.ok(found, "必须存在 export-tabs-mindmap 动作");
    assert.equal(found.shortcut, "⌥⇧M");
    assert.equal(found.label, "将所有打开页签导出为思维导图/大纲");
});

test("T-7437: index.ts 与 index.js 声明 exportTabsAsMindmap", () => {
    assert.match(
        indexTs,
        /exportTabsAsMindmap\(\): boolean \{[\s\S]*?siyuan:\/\/blocks\/\$\{rootId\}[\s\S]*?navigator\?\.clipboard\?\.writeText/,
        "index.ts 必须声明 exportTabsAsMindmap",
    );
    assert.match(
        indexJs,
        /exportTabsAsMindmap\(\) \{[\s\S]*?siyuan:\/\/blocks\/\$\{rootId\}[\s\S]*?navigator\.clipboard/,
        "index.js 必须声明 exportTabsAsMindmap",
    );
});

test("T-7437 门禁负向验证: 若画板定义移除了 export-tabs-mindmap 必定精准红", () => {
    const actions = getBuiltinActionDefinitions();
    assert.ok(actions.some((a) => a.id === "export-tabs-mindmap"));
});
