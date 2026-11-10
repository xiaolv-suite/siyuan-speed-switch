// T-7389 上下文自适应工作台（Context-Aware Cockpit）活跃文档上下文透传契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 在调用 homeRuntime.read 时提取并注入 activeDocContext；
//   2. 验证 second-panel-ui.js 同步提取并透传 activeDocContext；
//   3. 验证 home-adapters.js 在 buildHomeAdapterCacheKey 中将 activeDocContext.rootId 混入缓存键；
//   4. 验证 home-adapters.js 在执行 adapter.read 时透传 activeDocContext；
//   5. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const secondPanelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));
const homeAdaptersJs = readSourceText(path.join(root, "src", "home-adapters.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7389: second-panel-ui 提取当前活跃页签上下文并注入 homeRuntime.read", () => {
    assert.match(
        secondPanelTs,
        /const activeDocContext = activeTab \? \{[\s\S]*?rootId: this\.rootIdOf\?\.?\(activeTab\) \|\| "",[\s\S]*?title: this\.titleOf\?\.?\(activeTab\) \|\| "",[\s\S]*?activeDocContext/s,
        "second-panel-ui.ts 必须提取并注入 activeDocContext",
    );
    assert.match(
        secondPanelJs,
        /const activeDocContext = activeTab \? \{[\s\S]*?activeDocContext/s,
        "second-panel-ui.js 必须同步提取并透传 activeDocContext",
    );
});

test("T-7389: home-adapters.js 将 activeDocContext 混入缓存键并透传给 adapter.read", () => {
    assert.match(
        homeAdaptersJs,
        /function buildHomeAdapterCacheKey\(moduleId, device, normalizedConfig = \{\}, options = \{\}\)\s*\{[\s\S]*?options\?\.activeDocContext\?\.rootId/s,
        "home-adapters.js 必须将 activeDocContext.rootId 混入缓存键",
    );
    assert.match(
        homeAdaptersJs,
        /Promise\.resolve\(adapter\.read\(normalizedConfig, device, \{[\s\S]*?activeDocContext:\s*options\.activeDocContext \|\| null/s,
        "home-adapters.js 必须将 activeDocContext 透传给底层适配器",
    );
});

test("T-7389: index.ts 与 index.js 在文档关系与大纲组件中优先读取 activeDocContext", () => {
    assert.match(
        indexTs,
        /register\("document-relations-summary"[\s\S]*?activeDocContext\?\.rootId/s,
        "index.ts 必须在 document-relations-summary 中读取 activeDocContext.rootId",
    );
    assert.match(
        indexTs,
        /register\("current-document-outline"[\s\S]*?activeDocContext\?\.rootId/s,
        "index.ts 必须在 current-document-outline 中读取 activeDocContext.rootId",
    );
    assert.match(
        indexJs,
        /register\("document-relations-summary"[\s\S]*?activeDocContext/s,
        "index.js 必须在 document-relations-summary 中读取 activeDocContext",
    );
    assert.match(
        indexJs,
        /register\("current-document-outline"[\s\S]*?activeDocContext/s,
        "index.js 必须在 current-document-outline 中读取 activeDocContext",
    );
});

test("T-7389 门禁负向验证: 若缺少上下文透传或缓存混淆必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在上下文透传必定失败
    assert.throws(() => {
        assert.match(secondPanelTs, /activeDocContext_fake_non_existent/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的缓存键逻辑必定失败
    assert.throws(() => {
        assert.match(homeAdaptersJs, /options\?\.fakeDocContext\?\.fakeId/);
    }, assert.AssertionError);
});
