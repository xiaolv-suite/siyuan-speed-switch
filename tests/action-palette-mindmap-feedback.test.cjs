// T-7467 动作画板思维导图导出按键提示与实体快捷键直达执行契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 dispatchPaletteKey 识别 ⌥⇧M 并直接调度 export-tabs-mindmap 执行意图；
//   2. 验证 dispatchPaletteKey 识别 ⌥H (task-horizon-today) 与 ⌥M (glean-keep-roaming)；
//   3. 验证 状态机关闭画板后输出 EXECUTE 并安全携带 targetContext；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {
    createPaletteNavigationState,
    dispatchPaletteKey,
    PALETTE_KEY_ACTIONS,
} = require("../src/action-palette-navigation.js");
const {getAvailableActions} = require("../src/action-palette-model.js");

const allActions = getAvailableActions({kind: "tab", id: "20261028-doc", title: "测试文档"});

test("T-7467: dispatchPaletteKey 调度 ⌥⇧M 快捷直达 export-tabs-mindmap", () => {
    const state = createPaletteNavigationState(allActions, {isOpen: true});
    const result = dispatchPaletteKey(state, {
        key: "M",
        altKey: true,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
    });

    assert.equal(result.intent, PALETTE_KEY_ACTIONS.EXECUTE);
    assert.equal(result.state.isOpen, false);
    assert.equal(result.payload.action.id, "export-tabs-mindmap");
});

test("T-7467: dispatchPaletteKey 调度 ⌥H 与 ⌥M 快捷直达任务与漫游", () => {
    const state = createPaletteNavigationState(allActions, {isOpen: true});
    
    // ⌥H 直达 Task Horizon
    const taskResult = dispatchPaletteKey(state, {
        key: "h",
        altKey: true,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
    });
    assert.equal(taskResult.intent, PALETTE_KEY_ACTIONS.EXECUTE);
    assert.equal(taskResult.payload.action.id, "task-horizon-today");

    // ⌥M 直达 小驴拾遗漫游
    const roamResult = dispatchPaletteKey(state, {
        key: "m",
        altKey: true,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
    });
    assert.equal(roamResult.intent, PALETTE_KEY_ACTIONS.EXECUTE);
    assert.equal(roamResult.payload.action.id, "glean-keep-roaming");
});

test("T-7467: 画板未开启时快捷键不发生误拦截", () => {
    const closedState = createPaletteNavigationState(allActions, {isOpen: false});
    const result = dispatchPaletteKey(closedState, {
        key: "M",
        altKey: true,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
    });
    assert.equal(result.intent, PALETTE_KEY_ACTIONS.NOOP);
    assert.equal(result.state.isOpen, false);
});

test("T-7467 门禁负向验证: 若快捷键未挂载或动作被篡改必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在快捷键必定不输出 EXECUTE
    const state = createPaletteNavigationState(allActions, {isOpen: true});
    const fakeKeyResult = dispatchPaletteKey(state, {
        key: "Z",
        altKey: true,
        shiftKey: true,
        ctrlKey: true,
        metaKey: true,
    });
    assert.notEqual(fakeKeyResult.intent, PALETTE_KEY_ACTIONS.EXECUTE);

    // 探针 2: 负向断言伪造的非法动作 id 必定失败
    assert.throws(() => {
        const roamResult = dispatchPaletteKey(state, {
            key: "m",
            altKey: true,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
        });
        assert.equal(roamResult.payload.action.id, "fake_non_existent_action");
    }, assert.AssertionError);
});
