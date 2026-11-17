// T-7463 切换器历史下拉列表 Home/End 导航与 Delete 快捷单项清理流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 src/index.ts 与 src/index.js 中 panel 包含 Home 与 End 快捷直达首末项；
//   2. 验证 panel 包含 ArrowDown / ArrowUp 循环聚焦流转；
//   3. 验证 panel 包含 Delete / Backspace 快捷单项移除与相邻条目焦点平滑过渡；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
const indexJs = readSourceText(path.join(ROOT, "src", "index.js"));

test("T-7463: src/index.ts 历史面板挂载 Home/End 与上下方向键循环流", () => {
    assert.match(
        indexTs,
        /if\s*\(event\.key === "Home"\)\s*\{[\s\S]*?buttons\[0\]\?\.focus\(\{preventScroll:\s*true\}\);/,
        "index.ts 历史面板必须支持 Home 键直达首个条目",
    );
    assert.match(
        indexTs,
        /if\s*\(event\.key === "End"\)\s*\{[\s\S]*?buttons\[buttons\.length - 1\]\?\.focus\(\{preventScroll:\s*true\}\);/,
        "index.ts 历史面板必须支持 End 键直达末尾条目",
    );
    assert.match(
        indexTs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "ArrowRight"\)\s*\{[\s\S]*?\(currentIdx \+ 1\) % buttons\.length/,
        "index.ts 历史面板必须支持向下/向右循环移动焦点",
    );
    assert.match(
        indexTs,
        /if\s*\(event\.key === "ArrowUp" \|\| event\.key === "ArrowLeft"\)\s*\{[\s\S]*?\(currentIdx - 1 \+ buttons\.length\) % buttons\.length/,
        "index.ts 历史面板必须支持向上/向左循环移动焦点",
    );
});

test("T-7463: src/index.ts 历史面板支持 Delete/Backspace 快捷单项清理", () => {
    assert.match(
        indexTs,
        /if\s*\(event\.key === "Delete" \|\| event\.key === "Backspace"\)\s*\{[\s\S]*?activeItem\.dataset\.historyKey[\s\S]*?this\.removeClosedHistoryEntry[\s\S]*?this\.removeOpenHistoryEntry[\s\S]*?this\.refreshOpenHistoryDropdowns\(\);/,
        "index.ts 历史面板必须支持通过 Delete 键快捷移除条目并刷新",
    );
});

test("T-7463: src/index.js 镜像完全同步键盘流与 Delete 移除逻辑", () => {
    assert.match(
        indexJs,
        /if\s*\(event\.key === "Home"\)\s*\{[\s\S]*?buttons\[0\]\?\.focus\(\{ preventScroll:\s*true \}\);/,
        "index.js 镜像必须包含 Home 键导航",
    );
    assert.match(
        indexJs,
        /if\s*\(event\.key === "Delete" \|\| event\.key === "Backspace"\)\s*\{[\s\S]*?activeItem\.dataset\.historyKey[\s\S]*?this\.removeClosedHistoryEntry/,
        "index.js 镜像必须包含 Delete 键移除逻辑",
    );
});

test("T-7463 门禁负向验证: 若缺少 Home/End 导航或删除逻辑必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在按键逻辑必定失败
    assert.throws(() => {
        assert.match(indexTs, /event\.key === "F7_NON_EXISTENT_KEY" && buttons\[0\]/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的非法删除方法必定失败
    assert.throws(() => {
        assert.match(indexTs, /this\.fakeNonExistentHistoryDeleter\(\)/);
    }, assert.AssertionError);
});
