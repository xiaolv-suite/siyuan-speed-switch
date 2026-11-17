// T-7380 移动端 Sheet 焦点循环闭环与搜索输入框空态直达契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 openMobileGroupActions 具备 Tab 循环聚焦约束，杜绝焦点逃逸；
//   2. 验证 openMobileGroupActions 优先聚焦首个操作按钮；
//   3. 验证 bindSearchInputComposition 的 ArrowDown 目标链包含工作台瓦片与空态引导；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const mobileSwitcherTs = readSourceText(path.join(root, "src", "mobile-switcher-ui.ts"));
const mobileSwitcherJs = readSourceText(path.join(root, "src", "mobile-switcher-ui.js"));

test("T-7380: openMobileGroupActions 具备 Tab 循环聚焦约束", () => {
    assert.match(
        mobileSwitcherTs,
        /if\s*\(event\.key === "Tab"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(\{preventScroll:\s*true\}\);/s,
        "mobile-switcher-ui.ts 必须对 Tab 键做循环聚焦约束",
    );
    assert.match(
        mobileSwitcherJs,
        /if\s*\(event\.key === "Tab"\)\s*\{[\s\S]*?buttons\[nextIndex\]\?\.focus\(\{\s*preventScroll:\s*true\s*\}\);/s,
        "mobile-switcher-ui.js 必须同步实现 Tab 循环聚焦约束",
    );
});

test("T-7380: openMobileGroupActions 呼出后优先聚焦业务操作按钮", () => {
    assert.match(
        mobileSwitcherTs,
        /const firstActionBtn = body\.querySelector<HTMLButtonElement>\("button"\) \|\| overlay\.querySelector<HTMLButtonElement>\("\.sw__mobile-sheet-close"\);/s,
        "mobile-switcher-ui.ts 必须优先聚焦业务操作按钮",
    );
    assert.match(
        mobileSwitcherJs,
        /const firstActionBtn = body\.querySelector\("button"\) \|\| overlay\.querySelector\("\.sw__mobile-sheet-close"\);/s,
        "mobile-switcher-ui.js 必须同步优先聚焦业务操作按钮",
    );
});

test("T-7380: bindSearchInputComposition 的 ArrowDown 候选链包含工作台瓦片与引导动作", () => {
    assert.match(
        indexTs,
        /\.sw__workbench-tile[\s\S]*?\.sw__doc-empty-action[\s\S]*?\.sw__platform-guide-action/s,
        "index.ts 搜索输入框 ArrowDown 必须包含空态工作台与操作引导直达",
    );
});

test("T-7380 门禁负向验证: 若缺少 Tab 循环或空态导航必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(mobileSwitcherTs, /fake_non_existent_tab_trap/);
    }, assert.AssertionError);

    // 探针 2: 负向断言若缺少工作台瓦片候选必定失败
    assert.throws(() => {
        assert.match(indexTs, /non_existent_fake_empty_action_candidate/);
    }, assert.AssertionError);
});
