// T-7455 动作画板键盘状态机扩展 Home/End 首末项快速跳转契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 dispatchPaletteKey 在 key === "Home" 时跳转至索引 0；
//   2. 验证 dispatchPaletteKey 在 key === "End" 时跳转至末尾索引；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    createPaletteNavigationState,
    dispatchPaletteKey,
    PALETTE_KEY_ACTIONS,
} = require("../src/action-palette-navigation.js");

const mockActions = [
    {id: "act-1", label: "动作 1", section: "open"},
    {id: "act-2", label: "动作 2", section: "copy"},
    {id: "act-3", label: "动作 3", section: "manage"},
];

test("T-7455: dispatchPaletteKey 调度 Home 键跳转首项，End 键跳转末项", () => {
    const initialState = createPaletteNavigationState(mockActions, {isOpen: true});
    assert.equal(initialState.selectedIndex, 0);

    // 移动到中间项
    const stateAtMiddle = {...initialState, selectedIndex: 1};

    // 按 End 键
    const endRes = dispatchPaletteKey(stateAtMiddle, {key: "End"});
    assert.equal(endRes.intent, PALETTE_KEY_ACTIONS.NAVIGATE);
    assert.equal(endRes.state.selectedIndex, 2, "End 键必须直达末项");

    // 按 Home 键
    const homeRes = dispatchPaletteKey(endRes.state, {key: "Home"});
    assert.equal(homeRes.intent, PALETTE_KEY_ACTIONS.NAVIGATE);
    assert.equal(homeRes.state.selectedIndex, 0, "Home 键必须直达首项");
});

test("T-7455: 空动作列表安全兜底为 -1", () => {
    const emptyState = createPaletteNavigationState([], {isOpen: true});
    const homeRes = dispatchPaletteKey(emptyState, {key: "Home"});
    assert.equal(homeRes.state.selectedIndex, -1);
    const endRes = dispatchPaletteKey(emptyState, {key: "End"});
    assert.equal(endRes.state.selectedIndex, -1);
});

test("T-7455 门禁负向验证: 若状态机未识别 Home 键必定返回 NOOP", () => {
    const closedState = createPaletteNavigationState(mockActions, {isOpen: false});
    const res = dispatchPaletteKey(closedState, {key: "Home"});
    assert.equal(res.intent, PALETTE_KEY_ACTIONS.NOOP, "未开启时按 Home 必须为 NOOP");
});
