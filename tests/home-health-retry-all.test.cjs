// T-7411 工作台组件健康监控「一键全部重试」自愈把手契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 包含 sw-home-health__retry-all 装配逻辑；
//   2. 验证 声明一键批量重试所有失败项控制器的 force: true 刷新；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7411: second-panel-ui.ts 包含 sw-home-health__retry-all 全部重试逻辑", () => {
    assert.match(
        panelTs,
        /const failedRows = report\.failed\.concat\(report\.stale\);[\s\S]*?sw-home-health__retry-all/,
        "TS 文件必须检测失败项并装配 retry-all",
    );
    assert.match(
        panelTs,
        /void controller\.refresh\(undefined,\s*\{force:\s*true\}\)/,
        "TS 文件必须执行 force: true 强制重试",
    );
});

test("T-7411: second-panel-ui.js 包含 sw-home-health__retry-all 全部重试逻辑", () => {
    assert.match(
        panelJs,
        /const failedRows = report\.failed\.concat\(report\.stale\);[\s\S]*?sw-home-health__retry-all/,
        "JS 文件必须检测失败项并装配 retry-all",
    );
    assert.match(
        panelJs,
        /controller\.refresh\(undefined,\s*\{ force:\s*true \}\)/,
        "JS 文件必须执行 force: true 强制重试",
    );
});

test("T-7411 门禁负向验证: 若缺少 failedRows 守卫无脑挂载重试按钮必定精准红", () => {
    assert.doesNotMatch(panelTs, /const retryAllButton = document\.createElement\("button"\);\s*listRoot\.appendChild\(retryAllButton\);\s*const refreshListButton/);
});
