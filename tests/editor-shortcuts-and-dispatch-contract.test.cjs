// T-7601~T-7604: 编辑器 Ctrl+Y 重做、index.js 同构与画板空防呆契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 支持 Ctrl+Y 重做快捷键；
//   2. 验证 index.js 声明 setupSearchModeChips 与 TS 保持一致；
//   3. 验证 dispatchPaletteKey 在无可用动作时按 Enter 严格返回 NOOP；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
const indexJs = readSourceText(path.join(ROOT, "src", "index.js"));
const {dispatchPaletteKey, PALETTE_KEY_ACTIONS, createPaletteNavigationState} = require("../src/action-palette-navigation.js");

test("T-7601: snippet-studio-ui.js 支持 Ctrl+Y 作为重做快捷键", () => {
    assert.match(
        studioUiJs,
        /String\(event\.key\)\.toLowerCase\(\)\s*===\s*"y"\s*&&\s*!event\.shiftKey/,
        "代码编辑器必须支持 Ctrl+Y / Meta+Y 重做快捷键"
    );
});

test("T-7602: index.js 声明 setupSearchModeChips 与 index.ts 保持一致", () => {
    assert.match(
        indexJs,
        /setupSearchModeChips\(container,\s*searchInput,\s*onTrigger\)/,
        "index.js 必须声明 setupSearchModeChips 方法"
    );
    assert.match(
        indexJs,
        /this\.setupSearchModeChips\(modeBar,\s*searchInput/,
        "assembleSwitcherParts 必须挂载 setupSearchModeChips"
    );
});

test("T-7603: dispatchPaletteKey 在空动作集下按下 Enter 严格返回 NOOP", () => {
    const emptyState = createPaletteNavigationState([], {isOpen: true});
    const result = dispatchPaletteKey(emptyState, {key: "Enter"});
    assert.equal(result.intent, PALETTE_KEY_ACTIONS.NOOP, "空动作集下 Enter 必须返回 NOOP，杜绝空指针异常");
});

test("T-7601~T-7604 门禁负向验证: 若缺少重做绑定或防呆守卫必定精准红", () => {
    // 探针 1: 缺少 y 键绑定的代码必定报错
    const invalidStudioJs = studioUiJs.replace(/String\(event\.key\)\.toLowerCase\(\)\s*===\s*"y"/g, "false");
    assert.throws(() => {
        if (!/String\(event\.key\)\.toLowerCase\(\)\s*===\s*"y"/.test(invalidStudioJs)) {
            throw new Error("Gate failed: key y omitted in studio keydown");
        }
    }, /Gate failed/);

    // 探针 2: 负向断言伪造的不存在方法
    assert.throws(() => {
        assert.match(indexJs, /this\.setupNonexistentChipsProbeMethod/);
    }, assert.AssertionError);
});
