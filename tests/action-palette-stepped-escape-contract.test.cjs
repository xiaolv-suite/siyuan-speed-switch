// T-7401 动作画板（⌘K）阶梯式 Escape 清空机制契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 PALETTE_KEY_ACTIONS 声明 CLEAR 意图；
//   2. 验证有查询词时按 Escape 触发 CLEAR 并清空状态，不关闭画板；
//   3. 验证无查询词时按 Escape 触发 CLOSE 并关闭画板；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const {
    PALETTE_KEY_ACTIONS,
    createPaletteNavigationState,
    dispatchPaletteKey,
} = require("../src/action-palette-navigation.js");

const mockActions = [
    {id: "act-1", label: "复制链接", section: "copy"},
    {id: "act-2", label: "置顶页签", section: "manage"},
];

test("T-7401: PALETTE_KEY_ACTIONS 包含 CLEAR 意图", () => {
    assert.equal(PALETTE_KEY_ACTIONS.CLEAR, "clear");
});

test("T-7401: 有搜索词时按 Escape 返回 CLEAR 意图且保留 isOpen", () => {
    const state = createPaletteNavigationState(mockActions, {
        isOpen: true,
        query: "复制",
    });
    assert.equal(state.query, "复制");
    assert.equal(state.isOpen, true);

    const res = dispatchPaletteKey(state, {key: "Escape"});
    assert.equal(res.intent, PALETTE_KEY_ACTIONS.CLEAR, "有查询词时必须返回 clear 意图");
    assert.equal(res.state.query, "", "查询词必须被清空");
    assert.equal(res.state.isOpen, true, "画板必须保持打开");
    assert.equal(res.state.filteredActions.length, 2, "动作列表必须恢复全量");
});

test("T-7401: 无搜索词时按 Escape 返回 CLOSE 意图并关闭画板", () => {
    const state = createPaletteNavigationState(mockActions, {
        isOpen: true,
        query: "",
    });
    assert.equal(state.query, "");

    const res = dispatchPaletteKey(state, {key: "Escape"});
    assert.equal(res.intent, PALETTE_KEY_ACTIONS.CLOSE, "无查询词时必须返回 close 意图");
    assert.equal(res.state.isOpen, false, "画板必须被关闭");
});

test("T-7401 门禁负向验证: 若有词时仍直接关闭必定精准红", () => {
    const state = createPaletteNavigationState(mockActions, {
        isOpen: true,
        query: "test_keyword",
    });
    const res = dispatchPaletteKey(state, {key: "Escape"});
    assert.notEqual(res.intent, PALETTE_KEY_ACTIONS.CLOSE, "有词时绝不得直接触发 close 意图");
    assert.notEqual(res.state.isOpen, false, "有词时绝不得直接关闭画板");
});
