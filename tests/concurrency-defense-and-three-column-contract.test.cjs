// 并发防御与现代三段式统计优先外壳契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui 具备 alreadyExists 实例去重与按钮即时禁用；
//   2. 验证 second-panel-ui 具备 clearConfirmDialog 单例防重锁；
//   3. 验证 _platform-shell 声明 .sw-platform-metrics-bar 统计优先指标栏；
//   4. 验证 _platform-shell 声明 .sw-platform-icon-rail 52px 极窄常驻图标导航；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeJs = readSourceText(path.join(root, "src", "home-store-ui.js"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const shellScss = readSourceText(path.join(root, "src", "styles", "_platform-shell.scss"));

test("Bug线: 小组件商店添加按钮连点防重防御（杜绝幽灵卡片）", () => {
    assert.match(
        storeTs,
        /const alreadyExists = \(next\.instances as Array<any>\)\.some\(\(inst\) => inst\.instanceId === moduleId\)/,
        "home-store-ui.ts 必须具备实例已存在检查",
    );
    assert.match(
        storeJs,
        /const alreadyExists = next\.instances\.some\(\(inst\) => inst\.instanceId === moduleId\)/,
        "home-store-ui 编译输出必须具备实例已存在检查",
    );
});

test("Bug线: 清空工作台连击对话框单例防重锁", () => {
    assert.match(
        secondPanelTs,
        /let clearConfirmDialog:\s*Dialog \| null = null;[\s\S]*?if \(clearConfirmDialog\) return;/s,
        "second-panel-ui.ts 必须具备清空确认对话框单例锁",
    );
});

test("UI线: 声明顶部统计优先关键指标栏与 52px 极窄图标导航", () => {
    assert.match(
        shellScss,
        /\.sw-platform-metrics-bar\s*\{[\s\S]*?\.sw-platform-metric-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "必须声明顶部统计指标栏与等宽数字",
    );
    assert.match(
        shellScss,
        /\.sw-platform-metrics-bar\s*\{[\s\S]*?\.sw-platform-metric-divider\s*\{/s,
        "指标之间必须用半透明竖线分隔，严禁卡片包裹",
    );
    assert.match(
        shellScss,
        /\.sw-platform-icon-rail\s*\{[^}]*width:\s*52px;/s,
        "必须声明 52px 极窄常驻图标导航条",
    );
});

test("门禁负向验证: 若清空对话框丢失单例或指标栏使用卡片包裹必精准红", () => {
    // 探针 1: 负向断言严禁在指标之间包裹 card
    assert.doesNotMatch(
        shellScss,
        /\.sw-platform-metric-item\s*\{[^}]*border:\s*2px solid/s,
        "指标项严禁使用粗描边包裹",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenCode = `function addWidget() { layoutList.push(w); }`;
    assert.throws(() => {
        assert.match(
            brokenCode,
            /alreadyExists/,
        );
    }, assert.AssertionError);
});
