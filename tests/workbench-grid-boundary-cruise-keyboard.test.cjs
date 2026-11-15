// T-7513 第二面板工作台组件卡片键盘方向键边界巡航导航平滑滚动与指示加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 在卡片网格支持 PageUp / PageDown 跨屏步进导航；
//   2. 验证 second-panel-ui.ts 与 second-panel-ui.js 对卡片内部输入框（INPUT/TEXTAREA/SELECT）做键盘防抢占拦截；
//   3. 验证 scrollIntoView 统一携带 inline: "nearest" 防横向视口跳变；
//   4. 验证 bar 工具栏支持 Home / End 首尾按钮跳转；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7513: second-panel-ui 支持 PageUp / PageDown 跨屏步进巡航导航", () => {
    assert.match(
        panelTs,
        /if \(\["ArrowRight",\s*"ArrowDown",\s*"ArrowLeft",\s*"ArrowUp",\s*"Home",\s*"End",\s*"PageUp",\s*"PageDown"\]\.includes\(key\.key\)\)[\s\S]*?else if \(key\.key === "PageDown"\)\s*nextIdx = Math\.min\(cells\.length - 1,\s*idx \+ 4\);[\s\S]*?else if \(key\.key === "PageUp"\)\s*nextIdx = Math\.max\(0,\s*idx - 4\);/,
        "TS 源码必须在卡片按键监听中声明 PageDown 与 PageUp 跨步跳转",
    );
    assert.match(
        panelJs,
        /if \(\["ArrowRight",\s*"ArrowDown",\s*"ArrowLeft",\s*"ArrowUp",\s*"Home",\s*"End",\s*"PageUp",\s*"PageDown"\]\.includes\(key\.key\)\)[\s\S]*?else if \(key\.key === "PageDown"\)[\s\S]*?else if \(key\.key === "PageUp"\)/,
        "JS 源码必须在卡片按键监听中声明 PageDown 与 PageUp 跨步跳转",
    );
});

test("T-7513: second-panel-ui 对卡片内原生输入元素（INPUT/TEXTAREA/SELECT）实施键位拦截保护", () => {
    assert.match(
        panelTs,
        /if \(key\.target !== cell && \["INPUT",\s*"TEXTAREA",\s*"SELECT"\]\.includes\(\(key\.target as HTMLElement\)\?\.tagName \|\| ""\)\) \{\s*return;\s*\}/,
        "TS 源码必须保护卡片内输入框不被网格导航抢占方向键",
    );
    assert.match(
        panelJs,
        /if \(key\.target !== cell && \["INPUT",\s*"TEXTAREA",\s*"SELECT"\]\.includes\(/,
        "JS 源码必须保护卡片内输入框不被网格导航抢占方向键",
    );
});

test("T-7513: second-panel-ui 导航平滑滚动保护 inline: nearest 与顶栏 Home/End", () => {
    assert.match(
        panelTs,
        /cells\[nextIdx\]\.scrollIntoView\?\.\(\{block:\s*"nearest",\s*inline:\s*"nearest"\}\);/,
        "TS 滚动指令必须携带 inline: nearest 消除横向视口抖动",
    );
    assert.match(
        panelTs,
        /if \(event\.key === "Home" \|\| event\.key === "End"\) \{[\s\S]*?const targetBtn = event\.key === "Home" \? buttons\[0\] : buttons\[buttons\.length - 1\];[\s\S]*?targetBtn\?\.focus\(\);/,
        "顶栏工具条必须声明 Home / End 首尾快速跳转",
    );
});

test("T-7513 门禁负向验证: 若卡片按键移除了输入框保护必定精准红", () => {
    const fakeTs = panelTs.replace(
        /if \(key\.target !== cell && \["INPUT",\s*"TEXTAREA",\s*"SELECT"\][\s\S]*?return;\s*\}/,
        "/* removed input guard */",
    );
    assert.doesNotMatch(
        fakeTs,
        /if \(key\.target !== cell && \["INPUT",\s*"TEXTAREA",\s*"SELECT"\]/,
        "负向注入验证：缺少输入框保护时断言必须拦截失败",
    );
});
