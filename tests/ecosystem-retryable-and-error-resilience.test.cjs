// T-7398 生态小组件重试把手自愈与单向异常隔离契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 wrapEcosystemModuleRead 异常捕获返回 status: "error" 与 retryable: true；
//   2. 验证 wrapEcosystemModuleRead 移除了 console.warn，保证控制台干净；
//   3. 验证 home-view.js 在空态下当 retryable === true 时渲染重试按钮并响应点击；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const bridgeTs = readSourceText(path.join(root, "src", "api", "external-bridge.ts"));
const homeView = require("../src/home-view.js");
const {wrapEcosystemModuleRead} = require("../src/api/external-bridge.ts");

test("T-7398: wrapEcosystemModuleRead 异常与超时返回 error 与 retryable", async () => {
    assert.match(bridgeTs, /status:\s*"error",\s*retryable:\s*true/);

    // 运行时真值验证
    const throwingRead = wrapEcosystemModuleRead(async () => {
        throw new Error("mock_network_failure");
    }, 100, 1000);
    const result = await throwingRead({}, "desktop");
    assert.equal(result.status, "error");
    assert.equal(result.retryable, true);
    assert.equal(result.emptyHint, "📦 数据暂未返回，点击重试");
    assert.deepEqual(result.items, []);
});

test("T-7398: wrapEcosystemModuleRead 不包含未经保护的 console.warn", () => {
    assert.doesNotMatch(bridgeTs, /console\.warn\(/);
});

test("T-7398: home-view.js 在空态且 retryable 为真时挂载重试把手", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    let retried = false;
    const view = {
        moduleId: "test-eco-widget",
        title: "测试组件",
        status: "ready",
        items: [],
        emptyHint: "暂无数据 · 请重试",
        retryable: true,
    };
    const rendered = homeView.renderHomeModuleView(dom.window.document, view, {
        onRetry: () => { retried = true; },
    });
    assert.ok(rendered, "必须成功渲染组件视图");
    const retryBtn = rendered.querySelector(".sw__home-module-retry");
    assert.ok(retryBtn, "必须挂载 .sw__home-module-retry 重试按钮");
    retryBtn.click();
    assert.equal(retried, true, "点击重试按钮必须触发 onRetry 回调");
});

test("T-7398 门禁负向验证: 若缺少 retryable 必定不挂载重试把手", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const view = {
        moduleId: "test-eco-widget",
        title: "测试组件",
        status: "ready",
        items: [],
        emptyHint: "正常空态",
        retryable: false, // 负向断言：非可重试状态
    };
    const rendered = homeView.renderHomeModuleView(dom.window.document, view, {
        onRetry: () => {},
    });
    const retryBtn = rendered.querySelector(".sw__home-module-retry");
    assert.equal(retryBtn, null, "不可重试空态绝不得挂载重试按钮");
});
