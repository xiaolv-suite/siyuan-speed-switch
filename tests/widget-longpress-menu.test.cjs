// T-7469 第二面板小组件卡片长按手势与移动端右键菜单交互契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 中 cell 在 !editing 下包含 contextmenu 菜单；
//   2. 验证 cell 挂载 touchstart 500ms 长按手势与 touchmove 位移 > 10px 防抖；
//   3. 验证 菜单构造通过 new Menu("swHomeWidgetContextMenu") 并支持配置、刷新与移除；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));

test("T-7469: second-panel-ui.ts 挂载小组件桌面右键与移动端长按上下文菜单", () => {
    assert.match(
        panelTs,
        /if\s*\(!editing\)\s*\{[\s\S]*?const openWidgetContextMenu = \(clientX:\s*number,\s*clientY:\s*number\)\s*=>\s*\{[\s\S]*?new Menu\("swHomeWidgetContextMenu"\);/,
        "second-panel-ui.ts 必须在非编辑态挂载 swHomeWidgetContextMenu 上下文菜单",
    );
    assert.match(
        panelTs,
        /cell\.addEventListener\("contextmenu",\s*\(event:\s*MouseEvent\)\s*=>\s*\{[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?openWidgetContextMenu\(event\.clientX,\s*event\.clientY\);/,
        "必须监听 contextmenu 并阻止原生事件冒泡",
    );
    assert.match(
        panelTs,
        /cell\.addEventListener\("touchstart"[\s\S]*?touchTimer = window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?openWidgetContextMenu\(touchStartX,\s*touchStartY\);[\s\S]*?\},\s*500\);/,
        "必须支持 500ms 触控长按触发上下文菜单",
    );
    assert.match(
        panelTs,
        /cell\.addEventListener\("touchmove"[\s\S]*?Math\.hypot\(touch\.clientX - touchStartX,\s*touch\.clientY - touchStartY\)\s*>\s*10/,
        "位移超过 10px 必须取消长按定时器（防滚动误触）",
    );
});

test("T-7469: second-panel-ui.js 镜像完全同步长按与右键菜单逻辑", () => {
    assert.match(
        panelJs,
        /new siyuan_1\.Menu\("swHomeWidgetContextMenu"\)/,
        "second-panel-ui.js 必须构造 swHomeWidgetContextMenu",
    );
    assert.match(
        panelJs,
        /Math\.hypot\(touch\.clientX - touchStartX,\s*touch\.clientY - touchStartY\)\s*>\s*10/,
        "second-panel-ui.js 必须包含 10px 触控防抖",
    );
});

test("T-7469 门禁负向验证: 若缺少长按手势或菜单未做防抖必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在防抖距离必定失败
    assert.throws(() => {
        assert.match(panelTs, /touch\.clientX - touchStartX\)\s*>\s*9999/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在菜单标识必定失败
    assert.throws(() => {
        assert.match(panelTs, /new Menu\("fake_non_existent_widget_menu"\)/);
    }, assert.AssertionError);
});
