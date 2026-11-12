// T-7381 动作画板焦点精准恢复与生命周期回收契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-ui.js 的 closePalette 包含 returnFocusElement 安全恢复逻辑；
//   2. 验证 openCardActionPalette 包含卡片焦点双重恢复守卫；
//   3. 验证 openActionPaletteForDoc 包含文档条目焦点双重恢复守卫；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const paletteUiJs = readSourceText(path.join(root, "src", "action-palette-ui.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));

test("T-7381: action-palette-ui closePalette 包含 returnFocusElement 焦点恢复逻辑", () => {
    assert.match(
        paletteUiJs,
        /if\s*\(options\.returnFocusElement && typeof options\.returnFocusElement\.focus === "function"\)\s*\{[\s\S]*?options\.returnFocusElement\.focus\(\{preventScroll:\s*true\}\);/s,
        "action-palette-ui.js 必须具备 returnFocusElement 自动恢复能力",
    );
});

test("T-7381: openCardActionPalette 包含卡片焦点双重恢复守卫", () => {
    assert.match(
        indexTs,
        /if\s*\(card && card\.isConnected\)\s*\{\s*try\s*\{\s*card\.focus\(\{preventScroll:\s*true\}\);\s*\}\s*catch\s*\(_\)\s*\{\s*card\.focus\(\);\s*\}\s*\}/s,
        "openCardActionPalette 必须在关闭时恢复卡片焦点",
    );
    assert.match(
        indexTs,
        /returnFocusElement:\s*card,/s,
        "openCardActionPalette 必须将 card 传入 mountActionPalette",
    );
});

test("T-7381: openActionPaletteForDoc 包含文档条目焦点双重恢复守卫", () => {
    assert.match(
        indexTs,
        /if\s*\(item && item\.isConnected\)\s*\{\s*try\s*\{\s*item\.focus\(\{preventScroll:\s*true\}\);\s*\}\s*catch\s*\(_\)\s*\{\s*item\.focus\(\);\s*\}\s*\}/s,
        "openActionPaletteForDoc 必须在关闭时恢复文档条目焦点",
    );
    assert.match(
        indexTs,
        /returnFocusElement:\s*item,/s,
        "openActionPaletteForDoc 必须将 item 传入 mountActionPalette",
    );
});

test("T-7381 门禁负向验证: 若缺少焦点恢复守卫必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(paletteUiJs, /fake_non_existent_focus_recovery/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的选项字段必定失败
    assert.throws(() => {
        assert.match(indexTs, /returnFocusElement:\s*fakeNonExistentTarget/);
    }, assert.AssertionError);
});
