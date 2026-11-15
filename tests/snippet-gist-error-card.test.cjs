"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const studioJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7491: snippet-studio-ui.js 在 Gist 发布失败时装配 .sw-studio__gist-error 状态卡片", () => {
    assert.match(
        studioJs,
        /const errCard = node\("div",\s*"sw-studio__gist-error"\);[\s\S]*?errCard\.setAttribute\("role",\s*"alert"\);/,
        "失败时必须动态创建带 role='alert' 的 .sw-studio__gist-error 卡片",
    );
    assert.match(
        studioJs,
        /error\?\.message === "gist-access-denied"[\s\S]*?snippetGistRateLimitHint[\s\S]*?snippetGistRetryHint/,
        "必须对限频与常规异常分别提供定向指引文案",
    );
    assert.match(
        studioJs,
        /gistPreviewBox\.appendChild\(errCard\);/,
        "必须将错误卡片注入至 gistPreviewBox 容器中展示",
    );
});

test("T-7491: 双语词典完整定义限频与重试指引文案且非空", () => {
    for (const key of ["snippetGistRateLimit", "snippetGistRateLimitHint", "snippetGistRetryHint"]) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7491: 样式层声明 .sw-studio__gist-error 告警卡片布局与错误前景色", () => {
    assert.match(
        scss,
        /\.sw-studio__gist-error\s*\{[\s\S]*?border:\s*1px solid color-mix\(/,
        "_snippet-studio.scss 必须声明 .sw-studio__gist-error 卡片样式",
    );
});
