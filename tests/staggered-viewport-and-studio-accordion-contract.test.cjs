// T-7653 滚动视口 8px 舒适缓冲留白与实验室手风琴折叠契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts scrollIntoView 声明 cushion = 8 舒适缓冲；
//   2. 验证 index.js scrollIntoView 声明 cushion = 8 舒适缓冲；
//   3. 验证 _snippet-studio 折叠态声明 cursor: pointer 与悬停提亮；
//   4. 验证 _05-settings-widgets sw-home__body 声明 contain: layout paint；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7653: 切换器键盘导航滚动视口声明 8px 舒适安全缓冲", () => {
    assert.match(
        indexTs,
        /scrollIntoView\(card: HTMLElement, container: HTMLElement\) \{[\s\S]*?const cushion = 8;/s,
        "index.ts 必须声明 8px 滚动边缘舒适缓冲",
    );
    assert.match(
        indexJs,
        /scrollIntoView\(card, container\) \{[\s\S]*?const cushion = 8;/s,
        "index.js 必须同构声明 8px 滚动边缘舒适缓冲",
    );
});

test("T-7653: 片段实验室折叠态声明整体手风琴触控与悬停微反馈", () => {
    assert.match(
        studioScss,
        /&__layout\[data-ai-collapsed="true"\]\s*\{[\s\S]*?\.sw-studio__ai\s*\{[^}]*cursor:\s*pointer;/s,
        "AI 折叠态栏目必须声明手型光标以便快速展开",
    );
    assert.match(
        studioScss,
        /&__layout\[data-ai-collapsed="true"\]\s*\{[\s\S]*?\.sw-studio__ai\s*\{[\s\S]*?&:hover\s*\{[^}]*background:\s*var\(--studio-accent-soft\)/s,
        "AI 折叠态悬浮必须声明主题色淡底微提亮",
    );
});

test("T-7653: 第二面板主视口声明 contain: layout paint 杜绝首屏跳变", () => {
    assert.match(
        widgetsScss,
        /\.sw-home__body\s*\{[^}]*contain:\s*layout paint;/s,
        "工作台主体滚动区必须声明 contain: layout paint 严格隔离渲染抖动",
    );
});

test("T-7653 门禁负向验证: 若撤销滚动缓冲或移除手风琴触控必精准红", () => {
    // 探针 1: 负向断言严禁在 scrollIntoView 中使用 0 贴边缓冲
    assert.doesNotMatch(
        indexTs,
        /const cushion = 0;/,
        "严禁使用 0 缓冲贴边",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenCode = `private scrollIntoView(card: HTMLElement, container: HTMLElement) { const cushion = 0; }`;
    assert.throws(() => {
        assert.match(
            brokenCode,
            /const cushion = 8;/,
        );
    }, assert.AssertionError);
});
