"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {resolveWidgetRefreshInterval, REFRESH_INTERVAL_PRESETS} = require("../src/home-model.js");
const {computeWidgetBackoffDelay} = require("../src/home-controller.js");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");

test("T-7485: resolveWidgetRefreshInterval 纯模型正确解析周期并执行上下限钳制", () => {
    // 1. 默认兜底
    assert.deepEqual(resolveWidgetRefreshInterval(null), {minutes: 15, ms: 900000});
    assert.deepEqual(resolveWidgetRefreshInterval({}), {minutes: 15, ms: 900000});
    assert.deepEqual(resolveWidgetRefreshInterval({refreshIntervalMinutes: 0}), {minutes: 15, ms: 900000});

    // 2. 自定义有效值
    assert.deepEqual(resolveWidgetRefreshInterval({refreshIntervalMinutes: 30}), {minutes: 30, ms: 1800000});
    assert.deepEqual(resolveWidgetRefreshInterval({refreshInterval: 60}), {minutes: 60, ms: 3600000});

    // 3. 上下限钳制（1 ~ 1440 分钟）
    assert.deepEqual(resolveWidgetRefreshInterval({refreshIntervalMinutes: -5}), {minutes: 15, ms: 900000});
    assert.deepEqual(resolveWidgetRefreshInterval({refreshIntervalMinutes: 0.5}), {minutes: 1, ms: 60000});
    assert.deepEqual(resolveWidgetRefreshInterval({refreshIntervalMinutes: 5000}), {minutes: 1440, ms: 86400000});

    // 4. 预设数组必须冻结且包含系统默认选项
    assert.ok(Object.isFrozen(REFRESH_INTERVAL_PRESETS), "预设集合必须冻结");
    assert.equal(REFRESH_INTERVAL_PRESETS[0].value, 0);
});

test("T-7485: computeWidgetBackoffDelay 纯函数正确实现指数退避与上限封顶", () => {
    assert.equal(computeWidgetBackoffDelay(0), 0, "0 次失败不退避");
    assert.equal(computeWidgetBackoffDelay(1), 15000, "第 1 次失败为基础 15 秒");
    assert.equal(computeWidgetBackoffDelay(2), 30000, "第 2 次失败为 30 秒");
    assert.equal(computeWidgetBackoffDelay(3), 60000, "第 3 次失败为 60 秒");
    assert.equal(computeWidgetBackoffDelay(4), 120000, "第 4 次失败为 120 秒");
    assert.equal(computeWidgetBackoffDelay(10), 300000, "高频失败严格封顶在 300 秒（5分钟）");
});

test("T-7485: second-panel-ui.ts 与 second-panel-ui.js 镜像接入 offline 离线容灾状态", () => {
    const tsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
    const jsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));
    const scssSource = readSourceText(path.join(ROOT, "src", "styles", "_05-settings-widgets.scss"));

    // 1. TS 与 JS 镜像判定
    assert.ok(tsSource.includes('cell.dataset.swHealth = "offline"'), "TS 必须包含 offline 状态分流");
    assert.ok(jsSource.includes('cell.dataset.swHealth = "offline"'), "JS 镜像必须同步包含 offline 状态分流");
    assert.ok(tsSource.includes("this.i18n.homeHealthOffline"), "TS 必须注入 homeHealthOffline 文本");
    assert.ok(jsSource.includes("this.i18n.homeHealthOffline"), "JS 必须同步注入 homeHealthOffline 文本");

    // 2. 样式层声明
    assert.ok(scssSource.includes('.sw-home__cell[data-sw-health="offline"]'), "SCSS 必须声明 offline 容灾样式");
});
