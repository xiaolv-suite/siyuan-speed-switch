"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const formTs = readSourceText(path.join(ROOT, "src", "home-config-form.ts"));
const formJs = readSourceText(path.join(ROOT, "src", "home-config-form.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_05-settings-widgets.scss"));
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7493: home-config-form 包含恢复默认二次确认保护与 TS/JS 镜像对齐", () => {
    assert.match(
        formTs,
        /window\.confirm\(this\.i18n\.homeConfigResetConfirm \|\| "确定恢复默认配置吗？"\)/,
        "TS 必须在重置时弹出二次确认",
    );
    assert.match(
        formJs,
        /window\.confirm\(this\.i18n\.homeConfigResetConfirm \|\| "确定恢复默认配置吗？"\)/,
        "JS 镜像必须同步在重置时弹出二次确认",
    );
    assert.ok(zh.homeConfigResetConfirm, "zh-CN 必须定义 homeConfigResetConfirm");
    assert.ok(en.homeConfigResetConfirm, "en 必须定义 homeConfigResetConfirm");
});

test("T-7493: 保存校验失败时动态应用 sw-form--shake 提示动效", () => {
    assert.match(
        formTs,
        /root\.classList\.add\("sw-form--shake"\);/,
        "TS 校验失败必须挂载 sw-form--shake 动效类",
    );
    assert.match(
        formJs,
        /root\.classList\.add\("sw-form--shake"\);/,
        "JS 镜像必须同步挂载 sw-form--shake 动效类",
    );
    assert.ok(scss.includes(".sw-form--shake"), "SCSS 必须声明 .sw-form--shake 类");
    assert.ok(scss.includes("@keyframes sw-form-shake"), "SCSS 必须声明 @keyframes sw-form-shake 动画");
});
