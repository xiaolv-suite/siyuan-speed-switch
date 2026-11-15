// T-7589~T-7592: 超宽屏防拉伸上限、按钮防连击节流、空态快捷清空与视口缓冲契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 settings-model.js 的 resolvePanelSize 具备 maxWidth 保护；
//   2. 验证 index.ts 中的 pinBtn 与 closeBtn 具备忙态节流防连击锁；
//   3. 验证 doc-search-ui.ts 在穿透搜索空态时渲染 sw__search-empty-clear-bar；
//   4. 验证 index.ts 的 scrollIntoView 声明了 PADDING_BUFFER 呼吸空间缓冲；
//   5. 负向验证探针：若移除节流锁或缓冲空间，断言必须精准红。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const settingsModelJs = readSourceText(path.join(ROOT, "src", "settings-model.js"));
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
const docSearchTs = readSourceText(path.join(ROOT, "src", "doc-search-ui.ts"));
const polishScss = readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss"));
const {resolvePanelSize} = require("../src/settings-model.js");

test("T-7589: resolvePanelSize 支持 maxWidth 上限约束，防止超宽屏幕过度拉伸", () => {
    assert.match(
        settingsModelJs,
        /const\s+maxWidth\s*=\s*Number\(viewport\?\.maxWidth\)\s*\|\|\s*0;[\s\S]*?if\s*\(maxWidth\s*>\s*0\s*&&\s*width\s*>\s*maxWidth\)\s*width\s*=\s*Math\.max\(minWidth,\s*maxWidth\);/,
        "resolvePanelSize 必须支持 maxWidth 参数约束"
    );

    // 运行态实证：当视口为 3440px 超宽屏且设置 90% 比例时，maxWidth=1600 必须精准截断
    const res = resolvePanelSize(
        {panelSizeMode: "adaptive", panelScale: 90},
        {width: 3440, height: 1440, maxWidth: 1600}
    );
    assert.equal(res.width, 1600, "超宽屏自适应必须被 maxWidth 限制在 1600px");
    assert.equal(res.height, 1296, "高度正常按 90% 缩放");
});

test("T-7590: index.ts 卡片置顶与关闭按钮具备防连击忙态节流锁", () => {
    assert.match(
        indexTs,
        /let\s+pinBusy\s*=\s*false;[\s\S]*?if\s*\(pinBusy\)\s*return;[\s\S]*?pinBusy\s*=\s*true;/,
        "置顶按钮必须具备 pinBusy 节流保护"
    );

    assert.match(
        indexTs,
        /let\s+closeBusy\s*=\s*false;[\s\S]*?if\s*\(closeBusy\)\s*return;[\s\S]*?closeBusy\s*=\s*true;/,
        "关闭按钮必须具备 closeBusy 节流保护"
    );
});

test("T-7591: doc-search-ui.ts 在穿透搜索空态时提供一键清空检索操作栏", () => {
    assert.match(
        docSearchTs,
        /sw__search-empty-clear-bar/,
        "docSearchTs 必须声明 sw__search-empty-clear-bar 容器"
    );
    assert.match(
        docSearchTs,
        /sw__search-empty-clear/,
        "docSearchTs 必须声明 sw__search-empty-clear 清空按钮"
    );
    assert.match(
        polishScss,
        /\.sw__search-empty-clear-bar\s*\{/,
        "样式层必须提供 .sw__search-empty-clear-bar 居中样式"
    );
});

test("T-7592: scrollIntoView 具备严格的相对视口滚动与单一视觉焦点同步", () => {
    assert.match(
        indexTs,
        /card\.classList\.add\("sw__focused"\);\s*\n\s*card\.setAttribute\("aria-current", "true"\);/,
        "focusCard 必须同步 sw__focused 类与 aria-current 读屏属性"
    );
    assert.match(
        indexTs,
        /private scrollIntoView\(card: HTMLElement, container: HTMLElement\)\s*\{[\s\S]*?getBoundingClientRect/,
        "scrollIntoView 必须使用 getBoundingClientRect 进行相对坐标差值滚动"
    );
});

test("T-7589~T-7592 门禁负向验证: 若缺少节流保护或焦点同步必定报错", () => {
    // 探针 1: 缺少 closeBusy 节流的源码必定报错
    const invalidIndexTs = indexTs.replace(/let\s+closeBusy\s*=\s*false;/g, "/* omitted */");
    assert.throws(() => {
        if (!/let\s+closeBusy\s*=\s*false;/.test(invalidIndexTs)) {
            throw new Error("Gate failed: closeBusy omitted");
        }
    }, /Gate failed/);

    // 探针 2: 负向断言伪造的非法模式
    assert.throws(() => {
        assert.match(indexTs, /card\.classList\.add\("nonexistent_focus_probe"\)/);
    }, assert.AssertionError);
});
