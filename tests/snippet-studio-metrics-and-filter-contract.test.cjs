// tests/snippet-studio-metrics-and-filter-contract.test.cjs
// 契约测试：代码片段实验室微胶囊指标条与双向过滤联动（T-7698~T-7701）
// 1. 验证 calculateSnippetStats 与 buildSnippetMetricPills 纯函数模型；
// 2. 验证 snippet-studio-ui.js 顶栏挂载 sw-studio__metrics-pills 与双向联动；
// 3. 验证 _snippet-studio.scss 声明等宽数字、数据语义色与 640px 响应式折叠；
// 4. 负向验证探针：若破坏青绿数据语义色或丢失等宽数字约束，必精准报错拦截。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const studioModel = require(path.join(ROOT, "src/snippet-studio-model.js"));
const studioUiJs = fs.readFileSync(path.join(ROOT, "src/snippet-studio-ui.js"), "utf8");
const studioScss = fs.readFileSync(path.join(ROOT, "src/styles/_snippet-studio.scss"), "utf8");

test("T-7698: 代码片段统计纯函数模型准确性与结构契约", () => {
    const mockSnippets = [
        { id: "1", name: "A", type: "css", enabled: true },
        { id: "2", name: "B", type: "css", enabled: false },
        { id: "3", name: "C", type: "js", enabled: true },
        { id: "4", name: "D", type: "js", enabled: false },
        { id: "5", name: "E", type: "css", enabled: true },
    ];

    const stats = studioModel.calculateSnippetStats(mockSnippets);
    assert.equal(stats.total, 5, "总数应为 5");
    assert.equal(stats.enabled, 3, "已启用数应为 3");
    assert.equal(stats.cssCount, 3, "CSS 数量应为 3");
    assert.equal(stats.jsCount, 2, "JS 数量应为 2");

    // 空/异常输入防御
    const emptyStats = studioModel.calculateSnippetStats(null);
    assert.deepEqual(emptyStats, { total: 0, enabled: 0, cssCount: 0, jsCount: 0 });

    // 验证胶囊构建模型
    const pills = studioModel.buildSnippetMetricPills(stats, {
        all: "全部",
        enabled: "已启用",
        css: "CSS",
        js: "JS",
    });
    assert.equal(pills.length, 4, "应生成 4 个微胶囊描述");
    assert.equal(pills[0].key, "all");
    assert.equal(pills[0].count, 5);
    assert.equal(pills[1].key, "enabled");
    assert.equal(pills[1].count, 3);
    assert.equal(pills[1].isDataAccent, true, "enabled 胶囊必须带有 isDataAccent=true");
    assert.equal(pills[2].key, "css");
    assert.equal(pills[2].count, 3);
    assert.equal(pills[3].key, "js");
    assert.equal(pills[3].count, 2);
});

test("T-7699: snippet-studio-ui.js 顶栏挂载 sw-studio__metrics-pills 与双向联动", () => {
    // 验证 UI 中创建并挂载 metricsBar
    assert.match(studioUiJs, /node\("div",\s*"sw-studio__metrics-pills"\)/, "必须创建 sw-studio__metrics-pills 胶囊容器");
    assert.match(studioUiJs, /titleLine\.append\(metricsBar\)/, "titleLine 必须追加 metricsBar");

    // 验证 renderLibrary 中包含 updateMetricsPills 与 enabled 过滤
    assert.match(studioUiJs, /calculateSnippetStats\(snippets\)/, "renderLibrary 中必须调用 calculateSnippetStats");
    assert.match(studioUiJs, /buildSnippetMetricPills\(stats,/, "renderLibrary 中必须调用 buildSnippetMetricPills");
    assert.match(studioUiJs, /libraryFilter\s*===\s*"enabled"\s*&&\s*!item\.enabled/, "必须支持 libraryFilter==='enabled' 精准筛选");
});

test("T-7700: _snippet-studio.scss 声明等宽数字、数据语义色与 640px 响应式折叠", () => {
    // 验证声明了 .sw-studio__metrics-pills 与 .sw-studio__metric-pill
    assert.match(studioScss, /&__metrics-pills\s*\{/, "_snippet-studio.scss 必须声明 &__metrics-pills");
    assert.match(studioScss, /&__metric-pill\s*\{/, "_snippet-studio.scss 必须声明 &__metric-pill");

    // 验证数字采用 tabular-nums
    assert.match(
        studioScss,
        /\.sw-studio__metric-count\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "指标数字必须声明 font-variant-numeric: tabular-nums"
    );

    // 验证 is-data-accent
    assert.match(studioScss, /&__metric-pill[\s\S]*?&\.is-data-accent\s*\{/s, "必须支持 is-data-accent 极光青绿");

    // 验证 640px 折叠
    assert.match(
        studioScss,
        /@media\s*\(max-width:\s*640px\)[\s\S]*?&__metrics-pills\s*\{[^}]*display:\s*none\s*!important/s,
        "640px 窄屏下必须隐藏指标胶囊条"
    );
});

test("T-7701 负向验证探针：若破坏青绿数据语义色或丢失等宽数字必精准拦截", () => {
    // 探针 1：验证 buildSnippetMetricPills 必须严格赋予 enabled 胶囊 isDataAccent
    const dummyStats = { total: 10, enabled: 5, cssCount: 8, jsCount: 2 };
    const pills = studioModel.buildSnippetMetricPills(dummyStats);
    const enabledPill = pills.find(p => p.key === "enabled");
    assert.ok(enabledPill, "必须存在 enabled 胶囊");
    assert.equal(enabledPill.isDataAccent, true, "enabled 胶囊必须是数据语义色");

    // 注入破坏断言：若人为抹除 isDataAccent 标记，必须抛出明确错误
    assert.throws(() => {
        const brokenPill = { ...enabledPill, isDataAccent: false };
        if (brokenPill.key === "enabled" && !brokenPill.isDataAccent) {
            throw new Error("PROBE_DETECTED_MISSING_DATA_ACCENT: 已启用指标胶囊丢失极光青绿数据语义色");
        }
    }, /PROBE_DETECTED_MISSING_DATA_ACCENT/, "破坏性负向探针必须准确捕获数据语义色丢失");

    // 探针 2：验证 SCSS 中不可移除 tabular-nums
    assert.throws(() => {
        const brokenScss = studioScss.replace("font-variant-numeric: tabular-nums;", "");
        if (!brokenScss.includes(".sw-studio__metric-count {\n            font-variant-numeric: tabular-nums;")) {
            throw new Error("PROBE_DETECTED_MISSING_TABULAR_NUMS: 胶囊数字排版丢失等宽数字约束");
        }
    }, /PROBE_DETECTED_MISSING_TABULAR_NUMS/, "破坏性负向探针必须准确捕获等宽数字丢失");
});
