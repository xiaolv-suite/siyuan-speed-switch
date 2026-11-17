"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const panelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));

test("T-7501: second-panel-ui.ts 与 second-panel-ui.js 包含重试冷却倒计时防护", () => {
    // 1. TS 镜像冷却防护
    assert.match(
        panelTs,
        /if \(retryAllButton\.disabled\) return;[\s\S]*?retryAllButton\.disabled = true;[\s\S]*?retryAllButton\.setAttribute\("aria-disabled",\s*"true"\);/,
        "TS 必须在点击全部重试后立即进入禁用与冷却态",
    );
    assert.match(
        panelTs,
        /retryAllButton\.textContent = `\$\{this\.i18n\.homeHealthRetryAll \|\| "全部重试"\} \(\$\{cooldown\}s\)\`;/,
        "TS 必须动态呈现秒级倒计时回显",
    );

    // 2. JS 镜像同步
    assert.match(
        panelJs,
        /if \(retryAllButton\.disabled\)\s*return;[\s\S]*?retryAllButton\.disabled = true;[\s\S]*?retryAllButton\.setAttribute\("aria-disabled",\s*"true"\);/,
        "JS 镜像必须同步声明禁用与冷却态",
    );
    assert.match(
        panelJs,
        /retryAllButton\.textContent = `\$\{this\.i18n\.homeHealthRetryAll \|\| "全部重试"\} \(\$\{cooldown\}s\)\`;/,
        "JS 镜像必须同步呈现秒级倒计时回显",
    );
});
