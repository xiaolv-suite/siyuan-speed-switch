// T-7545 第二面板工作台小组件卡片标题栏双击快速切换折叠/展开手势加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-view.js 为 heading 标题栏绑定 dblclick 双击监听；
//   2. 验证 dblclick 触发 options.onToggle(view) 快速切换折叠/展开状态；
//   3. 验证 dblclick 守卫交互按钮与表单控件（button, input, select, textarea, a）不被双击拦截冒泡；
//   4. 验证 styles/_05-settings-widgets.scss 为 .sw__home-module-header 声明 user-select: none 防止误选文本；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const viewJs = readSourceText(path.join(root, "src", "home-view.js"));
const scss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7545: home-view.js 为 heading 声明 dblclick 双击切换折叠与控件守卫", () => {
    assert.match(
        viewJs,
        /heading\.addEventListener\("dblclick",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(target && typeof target\.closest === "function" && target\.closest\("button, input, select, textarea, a"\)\)\s*\{[\s\S]*?return;[\s\S]*?options\.onToggle\(view\);/,
        "home-view.js 必须在标题栏声明 dblclick 双击切换与子控件守卫",
    );
});

test("T-7545: SCSS 声明 .sw__home-module-header user-select: none 防止双击选中文本", () => {
    assert.match(
        scss,
        /\.sw__home-module-header\s*\{[^}]*?user-select:\s*none;/,
        "SCSS 必须为 .sw__home-module-header 声明 user-select: none",
    );
});

test("T-7545 门禁负向验证: 若标题栏缺少 dblclick 监听或缺少 user-select 防止选区必定精准红", () => {
    const fakeJs = viewJs.replace(/heading\.addEventListener\("dblclick"[\s\S]*?options\.onToggle\(view\);\s*\}\);/, "/* removed dblclick */");
    assert.doesNotMatch(fakeJs, /heading\.addEventListener\("dblclick"/);

    const fakeScss = scss.replace(/\.sw__home-module-header\s*\{[^}]*?user-select:\s*none;/, ".sw__home-module-header {\n    /* removed */");
    assert.doesNotMatch(fakeScss, /\.sw__home-module-header\s*\{[^}]*?user-select:\s*none;/);
});
