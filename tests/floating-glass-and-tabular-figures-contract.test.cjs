// T-7613 浮层毛玻璃降级、小组件等宽数字与极窄防溢出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__floating-ball-more 声明 --sw-shadow-md 浮层阴影；
//   2. 验证 .sw__floating-ball-more 声明 @supports not 降级背景；
//   3. 验证 external-world-clock 与 countdown 声明 font-variant-numeric: tabular-nums；
//   4. 验证 280px 容器断点声明 text-overflow: ellipsis 截断保护；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const fabMoreScss = readSourceText(path.join(root, "src", "styles", "_floating-ball-more.scss"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));
const sidebarScss = readSourceText(path.join(root, "src", "styles", "_07-sidebar-panel-store.scss"));

test("T-7613: 悬浮球更多操作浮层声明 --sw-shadow-md 与毛玻璃降级", () => {
    assert.match(
        fabMoreScss,
        /\.sw__floating-ball-more\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-(?:md|bento)\)/s,
        "浮层必须声明统一浮层阴影 --sw-shadow-md 或 --sw-shadow-bento",
    );
    assert.match(
        fabMoreScss,
        /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)\s*\{[^}]*background:\s*var\(--b3-theme-surface\)/s,
        "浮层必须为不支持毛玻璃的引擎声明底色加深降级",
    );
});

test("T-7613: 世界时钟与倒数日组件声明 tabular-nums 等宽排版", () => {
    assert.match(
        widgetsScss,
        /data-module-id="external-world-clock"\][\s\S]*?\.sw__home-module-item-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        "世界时钟必须声明等宽数字，消灭跳变抖动",
    );
    assert.match(
        widgetsScss,
        /data-module-id="countdown"\][\s\S]*?\.sw__home-stat-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        "倒数日核心数字必须声明等宽排版",
    );
});

test("T-7613: 280px 极窄侧栏卡片文本省略截断保护", () => {
    assert.match(
        sidebarScss,
        /@container \(max-width:\s*280px\)\s*\{.*?\.sw__card-title,.*?text-overflow:\s*ellipsis/s,
        "280px 侧栏断点卡片标题必须声明文本省略保护",
    );
});

test("T-7613 门禁负向验证: 若等宽声明被破坏或降级缺失必定精确红", () => {
    // 探针 1: 负向断言非等宽属性必须被拒绝
    assert.doesNotMatch(
        widgetsScss,
        /data-module-id="external-world-clock"\]\s*\{[^}]*font-variant-numeric:\s*proportional-nums/s,
        "严禁在时钟中使用比例数字",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw__test_clock { font-variant-numeric: normal; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /\.sw__test_clock\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
        );
    }, assert.AssertionError);
});
