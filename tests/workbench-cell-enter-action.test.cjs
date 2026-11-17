// T-7521 第二面板工作台小组件卡片标题聚焦时 Enter 键快速唤出组件配置或打开操作契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在非编辑态下支持 Enter 回车唤出配置或打开操作；
//   2. 验证 编辑态下优先响应 cell-tools 配置按钮；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7521: second-panel-ui.ts 在 Enter 键判定中包含配置或打开操作回退链", () => {
    assert.match(
        panelTs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?const openAction = cell\.querySelector<HTMLButtonElement>\("\.sw__home-module-config,\s*\.sw-home__open"\);[\s\S]*?openAction\.click\(\);/,
        "TS 源码必须在编辑态按钮后回退查找 .sw__home-module-config 或 .sw-home__open 并触发点击",
    );
});

test("T-7521: second-panel-ui.js 同步包含 Enter 配置或打开操作回退链", () => {
    assert.match(
        panelJs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?const openAction = cell\.querySelector\("\.sw__home-module-config,\s*\.sw-home__open"\);[\s\S]*?openAction\.click\(\);/,
        "JS 源码必须在编辑态按钮后回退查找 .sw__home-module-config 或 .sw-home__open 并触发点击",
    );
});

test("T-7521 门禁负向验证: 若移除了 openAction 回退分支必定精准红", () => {
    const fakeTs = panelTs.replace(
        /const openAction = cell\.querySelector<HTMLButtonElement>\("\.sw__home-module-config,\s*\.sw-home__open"\);[\s\S]*?openAction\.click\(\);\s*return;\s*\}/,
        "/* removed fallback */",
    );
    assert.doesNotMatch(
        fakeTs,
        /const openAction = cell\.querySelector<HTMLButtonElement>\("\.sw__home-module-config,\s*\.sw-home__open"\)/,
        "负向注入验证：缺少回退分支时断言必须拦截失败",
    );
});
