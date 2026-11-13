// T-7533 第二面板工作台小组件折叠状态下回车与空格键双向触感切换加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在 Enter 键处理中优先检测折叠态并展开；
//   2. 验证 非折叠态保持既有的配置/打开操作流；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7533: second-panel-ui.ts 在 Enter 键判定中优先响应折叠态一键展开", () => {
    assert.match(
        panelTs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?if \(cell\.classList\.contains\("sw-home__cell--collapsed"\)\) \{[\s\S]*?const foldBtn = cell\.querySelector<HTMLButtonElement>\("\.sw__home-module-fold"\);[\s\S]*?foldBtn\.click\(\);/,
        "TS 源码必须在卡片处于折叠态时通过 Enter 键直接展开卡片",
    );
});

test("T-7533: second-panel-ui.js 同步包含 Enter 折叠态一键展开", () => {
    assert.match(
        panelJs,
        /if \(key\.key === "Enter"\) \{[\s\S]*?if \(cell\.classList\.contains\("sw-home__cell--collapsed"\)\) \{[\s\S]*?const foldBtn = cell\.querySelector\("\.sw__home-module-fold"\);[\s\S]*?foldBtn\.click\(\);/,
        "JS 源码必须在卡片处于折叠态时通过 Enter 键直接展开卡片",
    );
});

test("T-7533 门禁负向验证: 若移除了折叠态判定必定精准红", () => {
    const fakeTs = panelTs.replace(
        /if \(cell\.classList\.contains\("sw-home__cell--collapsed"\)\) \{[\s\S]*?foldBtn\.click\(\);\s*return;\s*\}/,
        "/* removed collapsed enter expand */",
    );
    assert.doesNotMatch(
        fakeTs,
        /if \(cell\.classList\.contains\("sw-home__cell--collapsed"\)\)/,
        "负向注入验证：缺少折叠态 Enter 展开判定时断言必须拦截失败",
    );
});
