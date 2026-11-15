// T-7412 动作画板搜索框获焦自动全选与空匹配结果 Enter 自愈清空契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-ui.js 在 focus 时执行 select()；
//   2. 验证 action-palette-navigation.js 在 Enter 无匹配动作时返回 CLEAR 意图；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");
const {
    createPaletteNavigationState,
    dispatchPaletteKey,
    PALETTE_KEY_ACTIONS,
    updatePaletteQuery,
} = require("../src/action-palette-navigation.js");

const root = path.resolve(__dirname, "..");
const uiJs = readSourceText(path.join(root, "src", "action-palette-ui.js"));

test("T-7412: action-palette-ui.js 搜索框 focus 执行 select()", () => {
    assert.match(
        uiJs,
        /const onFocus = \(\) => \{[\s\S]*?searchInput\.select\(\);/,
        "必须绑定 onFocus 执行 select()",
    );
});

test("T-7412: dispatchPaletteKey 在无匹配动作且有搜索词时按 Enter 返回 CLEAR 意图", () => {
    const rawState = createPaletteNavigationState(
        [{id: "action-1", title: "复制块超链接"}],
        {isOpen: true},
    );
    // 输入一个完全不匹配的查询词
    const queryState = updatePaletteQuery(rawState, "xyz_no_match");
    assert.equal(queryState.filteredActions.length, 0);

    const result = dispatchPaletteKey(queryState, {key: "Enter"});
    assert.equal(result.intent, PALETTE_KEY_ACTIONS.CLEAR, "无匹配时按 Enter 必须派发 CLEAR 自愈意图");
    assert.equal(result.state.query, "", "状态 query 必须被重置为空");
    assert.ok(result.state.filteredActions.length > 0, "恢复全部动作列表");
});

test("T-7412 门禁负向验证: 若 Enter 在无匹配词时仍返回 NOOP 必定精准红", () => {
    const rawState = createPaletteNavigationState(
        [{id: "action-1", title: "复制块超链接"}],
        {isOpen: true},
    );
    const queryState = updatePaletteQuery(rawState, "xyz_no_match");
    const result = dispatchPaletteKey(queryState, {key: "Enter"});
    assert.notEqual(result.intent, PALETTE_KEY_ACTIONS.NOOP, "绝不能保持为未接管的 NOOP");
});
