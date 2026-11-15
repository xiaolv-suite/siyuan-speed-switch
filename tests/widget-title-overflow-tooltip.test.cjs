// T-7509 第二面板工作台小组件卡片标题超长省略与悬停完整气泡提示加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 在 updateCellDescription 将 descriptor.title 纳入 detail 并挂载至 cell.title；
//   2. 验证 home-view.js 为 title 与 context 节点默认挂载完整的 title 气泡提示；
//   3. 验证 _05-settings-widgets.scss 声明标题与上下文的省略号规范；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const homeViewJs = readSourceText(path.join(root, "src", "home-view.js"));
const scss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7509: second-panel-ui.ts 将 descriptor.title 纳入 detail 并在 cell.title 完整回显", () => {
    assert.match(
        secondPanelTs,
        /const detail = \[descriptor\.title,\s*source,\s*descriptor\.subtitle,\s*\.\.\.capabilities\]\.filter\(Boolean\)\.join\(" · "\);[\s\S]*?cell\.title = detail;/,
        "必须在卡片 cell.title 中完整包含组件标题，供超长截断时悬停查阅",
    );
});

test("T-7509: home-view.js 为 title 与 context 挂载原生 title 原文字符串", () => {
    assert.match(
        homeViewJs,
        /title\.textContent = view\.title \|\| view\.moduleId;\s*\n\s*title\.title = title\.textContent;/,
        "模块标题元素必须具备初始 title 原文",
    );
    assert.match(
        homeViewJs,
        /context\.textContent = view\.contextTitle;\s*\n\s*context\.title = view\.contextTitle;/,
        "上下文元素必须具备初始 title 原文",
    );
});

test("T-7509: _05-settings-widgets.scss 声明模块标题与上下文的单行文本省略规范", () => {
    assert.match(
        scss,
        /\.sw__home-module-title\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
        "模块标题必须声明 text-overflow: ellipsis",
    );
    assert.match(
        scss,
        /\.sw__home-module-context\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
        "模块上下文必须声明 text-overflow: ellipsis",
    );
});

test("T-7509 门禁负向验证: 若 cell.title 漏掉组件标题必定精准红", () => {
    const fakeTs = secondPanelTs.replace(
        "const detail = [descriptor.title, source, descriptor.subtitle, ...capabilities]",
        "const detail = [source, descriptor.subtitle, ...capabilities]",
    );
    assert.doesNotMatch(
        fakeTs,
        /const detail = \[descriptor\.title,\s*source,\s*descriptor\.subtitle,\s*\.\.\.capabilities\]/,
        "负向注入验证：缺少 descriptor.title 时断言必须不通过",
    );
});
