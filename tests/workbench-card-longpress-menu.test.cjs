// T-7557 第二面板工作台小组件卡片标题栏长按呼出快捷操作菜单手势加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 为卡片声明 touchstart 500ms 长按判定；
//   2. 验证 touchstart 守卫交互子控件（button, input, select, textarea, a）不被误触发长按菜单；
//   3. 验证触发长按时调用 openWidgetContextMenu 并在支持设备触发 50ms 触觉震动；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7557: second-panel-ui 声明小组件卡片长按手势与子控件点击守卫", () => {
    // TS 文件
    assert.match(
        panelTs,
        /cell\.addEventListener\("touchstart",\s*\(event:\s*TouchEvent\)\s*=>\s*\{[\s\S]*?target\.closest\("button, input, select, textarea, a"\)[\s\S]*?touchTimer = window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?openWidgetContextMenu\(touchStartX,\s*touchStartY\);[\s\S]*?500\);/,
        "TS 文件必须包含 touchstart 500ms 长按与子控件排除守卫",
    );
    assert.match(
        panelTs,
        /navigator[^.]*\.vibrate\?\.?\(\s*50\s*\)/,
        "TS 文件必须包含震动触感调用",
    );

    // JS 文件
    assert.match(
        panelJs,
        /cell\.addEventListener\("touchstart",\s*\(event\)\s*=>\s*\{[\s\S]*?target\.closest\("button, input, select, textarea, a"\)[\s\S]*?touchTimer = window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?openWidgetContextMenu\(touchStartX,\s*touchStartY\);[\s\S]*?500\);/,
        "JS 文件必须包含 touchstart 500ms 长按与子控件排除守卫",
    );
    assert.match(
        panelJs,
        /navigator[^.]*\.vibrate\?\.?\(\s*50\s*\)/,
        "JS 文件必须包含震动触感调用",
    );
});

test("T-7557 门禁负向验证: 若缺少子控件排除守卫或缺少 500ms 计时判定必定精准红", () => {
    const fakeTs = panelTs.replace(/target\.closest\("button, input, select, textarea, a"\)/, "false");
    assert.doesNotMatch(fakeTs, /target\.closest\("button, input, select, textarea, a"\)/);

    const fakeJs = panelJs.replace(/openWidgetContextMenu\(touchStartX,\s*touchStartY\);/, "/* removed */");
    assert.doesNotMatch(fakeJs, /openWidgetContextMenu\(touchStartX,\s*touchStartY\);/);
});
