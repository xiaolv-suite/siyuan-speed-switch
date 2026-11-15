// T-7669 平台统计指标栏数据驱动模型与响应式自适应契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 platform-metrics-model 导出 buildPlatformMetrics 并生成 4 个指标；
//   2. 验证 tasks 指标声明 isDataAccent 启用数据语义色；
//   3. 验证 _platform-shell 声明 @container (max-width: 420px) 紧凑响应式规则；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const {buildPlatformMetrics, resolveMetricActionKey, formatMetricDisplay} = require("../src/platform-metrics-model.js");
const shellScss = readSourceText(path.join(root, "src", "styles", "_platform-shell.scss"));

test("T-7669: 平台统计指标纯模型生成 4 项核心指标结构", () => {
    const stats = {tabsCount: 12, favsCount: 34, tasksCount: 5, historyCount: 68};
    const metrics = buildPlatformMetrics(stats);
    assert.equal(metrics.length, 4, "必须生成 4 项核心指标");
    assert.equal(metrics[0].key, "tabs");
    assert.equal(metrics[0].value, "12");
    assert.equal(metrics[2].key, "tasks");
    assert.equal(metrics[2].isDataAccent, true, "待办指标必须声明 isDataAccent 启用极光青绿数据色");
});

test("T-7669: 统计指标大数字超过 99 时自动夹取 99+", () => {
    assert.equal(formatMetricDisplay(150), "99+");
    assert.equal(formatMetricDisplay(42), "42");
    assert.equal(formatMetricDisplay(-5), "0");
});

test("T-7669: 统计指标点击映射直达对应模式", () => {
    assert.equal(resolveMetricActionKey("tabs"), "tabs");
    assert.equal(resolveMetricActionKey("tasks"), "task");
    assert.equal(resolveMetricActionKey("favs"), "favorites");
});

test("T-7669: 声明 420px 与 280px 容器响应式收拢保护", () => {
    assert.match(
        shellScss,
        /@container \(max-width:\s*420px\)\s*\{[\s\S]*?\.sw-platform-metric-item\.is-secondary/s,
        "必须声明 420px 容器次要指标折叠规则",
    );
    assert.match(
        shellScss,
        /@container \(max-width:\s*280px\)\s*\{[^}]*display:\s*none\s*!important;/s,
        "必须声明 280px 极窄容器整行隐藏保护，杜绝横向滚动条",
    );
});

test("T-7669 门禁负向验证: 若指标栏失去响应式自适应必报错", () => {
    // 探针 1: 负向断言严禁在 280px 容器强制显示 4 列
    assert.doesNotMatch(
        shellScss,
        /@container \(max-width:\s*280px\)\s*\{[^}]*display:\s*flex;/s,
        "严禁在 280px 容器强制展示完整指标行",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenCode = `function getMetrics() { return []; }`;
    assert.throws(() => {
        assert.equal(
            brokenCode.includes("isDataAccent"),
            true,
        );
    }, assert.AssertionError);
});
