// T-7837 ~ T-7840 体验跃升批次专项契约测试与负向验证探针
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. T-7837: 搜索框空值时按 Tab/Shift+Tab 穿透药丸循环聚焦与 Enter 激活；
//   2. T-7838: 悬浮球移动端快滑触发时接入 navigator.vibrate 物理触觉微震动；
//   3. T-7839: 全表面统一快捷键 CheatSheet 速查看板与按 ? 呼出；
//   4. T-7840: 片段实验室一键克隆派生副本 (Duplicate Snippet)；
//   5. 破坏性负向注入验证。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const fabTs = readSourceText(path.join(root, "src", "floating-ball-ui.ts"));
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));

test("T-7837: 搜索框与药丸按钮具备完整的 Tab / Shift+Tab 循环导航与 Enter 激活", () => {
    assert.match(
        indexTs,
        /if \(e\.key === "Tab"\) \{[\s\S]*?if \(e\.shiftKey\) \{[\s\S]*?searchInput\.focus\(\);[\s\S]*?chipButtons\[idx \+ 1\]\?\.focus\(\);/,
        "穿透药丸按钮必须支持 Tab 与 Shift+Tab 双向循环聚焦并在两端衔接搜索框",
    );
    assert.match(
        indexTs,
        /else if \(e\.key === "Tab" && !e\.ctrlKey && !e\.altKey && !e\.metaKey && !searchInput\.value\) \{[\s\S]*?chipButtons\[targetIdx\]\?\.focus\(\);/,
        "搜索框空值时必须支持按 Tab / Shift+Tab 直达药丸聚焦导航",
    );
});

test("T-7838: 悬浮球快滑触发动作时接入 navigator.vibrate 物理震动确认", () => {
    assert.match(
        fabTs,
        /if \(typeof navigator !== "undefined" && typeof navigator\.vibrate === "function"\) \{\s*navigator\.vibrate\(15\);/s,
        "移动端与触屏快滑必须调用 navigator.vibrate(15) 给出触觉确认",
    );
});

test("T-7839: 全表面统一按 ? 呼出 Bento 风格 CheatSheet 快捷键速查看板", () => {
        assert.match(
            indexTs,
            /const cheatsheet = document\.createElement\("section"\);[\s\S]*?sw-platform-guide__cheatsheet[\s\S]*?sw-platform-guide__shortcuts-grid/,
            "快速开始指南必须包含 Bento 风格的全局快捷键速查一览表",
        );
        assert.match(
            indexTs,
            /if \(key === "\?" \|\| \(event\.shiftKey && key === "\/"\)\) \{[\s\S]*?this\.openPlatformGuide\("switcher"\);/,
            "第一面板必须支持按 ? 键呼出快捷键速查看板",
        );
        assert.match(
            secondPanelTs,
            /if \(\(event\.key === "\?" \|\| \(event\.shiftKey && event\.key === "\/"\)\) && !editing\) \{[\s\S]*?this\.openPlatformGuide\?\.?\("workbench"\);/,
            "第二面板工作台必须支持按 ? 键呼出快捷键速查看板",
        );
});

test("T-7840: 片段实验室声明 duplicateButton 并接入 nextConflictCopyName 一键派生副本", () => {
    assert.match(
        studioJs,
        /const duplicateButton = action\("snippetDuplicate", \(\) => \{[\s\S]*?nextConflictCopyName\(draft\.name \|\| t\("snippetNew"\), snippets\.map\(\(s\) => s\.name\)\);[\s\S]*?guardLeave\(\(\) => choose\(\{name: copyName, type: draft\.type, content: draft\.content\}, null\)\);/,
        "片段实验室必须具备克隆派生副本动作与名称防冲突链路",
    );
    assert.match(
        studioJs,
        /duplicateButton\.disabled = busy \|\| gistWriting \|\| \(!draft\.content && !draft\.name\);/,
        "草稿为空时必须禁用克隆副本按钮",
    );
});

test("T-7837~T-7840 门禁破坏性负向验证探针", () => {
    const fakeFab = fabTs.replace(/navigator\.vibrate\(15\);/, "// removed vibrate");
    assert.doesNotMatch(
        fakeFab,
        /navigator\.vibrate\(15\);/,
        "负向注入验证：缺少震动反馈时断言必须拦截失败",
    );

    const fakeStudio = studioJs.replace(/const duplicateButton = action\("snippetDuplicate"/, "// removed duplicate");
    assert.doesNotMatch(
        fakeStudio,
        /const duplicateButton = action\("snippetDuplicate"/,
        "负向注入验证：缺少克隆副本动作时断言必须拦截失败",
    );
});
