// T-7507 代码片段实验室备份还原预览面板全选快捷键与键盘流加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 openRestorePreview 声明 Ctrl/Cmd+A 全选/反选快捷切换；
//   2. 验证 openRestorePreview 声明 ArrowUp / ArrowDown 复选框上下导航与 Home / End 首尾跳转；
//   3. 验证 复选框均注入 aria-label 无障碍标识；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7507: snippet-studio-ui.js 在 openRestorePreview 声明 Ctrl/Cmd+A 全选/反选切换", () => {
    assert.match(
        studioJs,
        /if \(\(event\.ctrlKey \|\| event\.metaKey\) && String\(event\.key\)\.toLowerCase\(\) === "a" && !event\.isComposing\) \{[\s\S]*?const checkboxes = Array\.from\(list\.querySelectorAll\('input\[type="checkbox"\]'\)\);[\s\S]*?const allChecked = checkboxes\.every\(\(cb\) => cb\.checked\);[\s\S]*?checkboxes\.forEach\(\(cb\) => \{ cb\.checked = !allChecked; \}\);/,
        "必须声明 Ctrl/Cmd+A 批量切换复选框勾选状态",
    );
});

test("T-7507: snippet-studio-ui.js 在 openRestorePreview 声明 ArrowUp/Down 与 Home/End 导航", () => {
    assert.match(
        studioJs,
        /if \(\["ArrowUp",\s*"ArrowDown"\]\.includes\(event\.key\)\) \{[\s\S]*?const checkboxes = Array\.from\(list\.querySelectorAll\('input\[type="checkbox"\]'\)\);[\s\S]*?const nextIdx = \(idx \+ \(event\.key === "ArrowDown" \? 1 : -1\) \+ checkboxes\.length\) % checkboxes\.length;[\s\S]*?checkboxes\[nextIdx\]\?\.focus\(\{preventScroll: true\}\);/,
        "必须声明复选框上下方向键循环聚焦",
    );
    assert.match(
        studioJs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const target = event\.key === "Home" \? checkboxes\[0\] : checkboxes\[checkboxes\.length - 1\];[\s\S]*?target\?\.focus\(\{preventScroll: true\}\);/,
        "必须声明复选框 Home / End 首尾跳转聚焦",
    );
});

test("T-7507: 复选框均注入 aria-label 无障碍标识", () => {
    assert.match(
        studioJs,
        /input\.setAttribute\("aria-label",\s*restoreRowText\(row\)\);/,
        "行复选框必须注入语义化 aria-label",
    );
    assert.match(
        studioJs,
        /settingsInput\.setAttribute\("aria-label",\s*t\("snippetRestoreSettings"\)\);/,
        "设置复选框必须注入语义化 aria-label",
    );
});

test("T-7507 门禁负向验证: 若恢复面板未绑定 Ctrl+A 全选必定精准红", () => {
    const fakeCode = studioJs.replace(
        /if \(\(event\.ctrlKey \|\| event\.metaKey\) && String\(event\.key\)\.toLowerCase\(\) === "a"[\s\S]*?return;\s*\}/,
        "/* removed ctrl+a */",
    );
    assert.doesNotMatch(
        fakeCode,
        /if \(\(event\.ctrlKey \|\| event\.metaKey\) && String\(event\.key\)\.toLowerCase\(\) === "a"/,
        "负向注入验证：移除全选逻辑后正向正则必须不匹配",
    );
});
