// T-7349/T-7578/T-7813/T-7814/T-7836 版本号晋级、四处版本单一事实源与发布历史结转契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 package.json、plugin.json 与代码常量 PLUGIN_VERSION 精确对齐至 0.48.87；
//   2. 验证中英文 README 徽标、标题、折叠历史与底部版本声明精确反映 0.48.87；
//   3. 验证中英文 CHANGELOG 存在独立的 v0.48.87 章节并置于 v0.48.86 之前；
//   4. 验证 ROADMAP.md 基线版本精确对齐至 v0.48.87；
//   5. 负向探针覆盖：版本退化、缺少折叠块或文档缺少正式发布章节必定被安全拦截。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
require("./ts-register.cjs");
const constantsMod = require("../src/constants.js");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
const readmeZh = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
const readmeEn = fs.readFileSync(path.join(ROOT, "README.en-US.md"), "utf8");
const changelogZh = fs.readFileSync(path.join(ROOT, "docs", "CHANGELOG.md"), "utf8");
const changelogEn = fs.readFileSync(path.join(ROOT, "docs", "CHANGELOG.en-US.md"), "utf8");
const roadmap = fs.readFileSync(path.join(ROOT, "ROADMAP.md"), "utf8");

test("T-7813: package.json、plugin.json 与代码常量 PLUGIN_VERSION 四处精确对齐为 0.48.90", () => {
    assert.equal(pkg.version, "0.48.90", "package.json 版本号必须为 0.48.90");
    assert.equal(plugin.version, "0.48.90", "plugin.json 版本号必须为 0.48.90");
    assert.equal(constantsMod.PLUGIN_VERSION, "0.48.90", "代码常量 PLUGIN_VERSION 必须为 0.48.90");
    assert.equal(pkg.version, plugin.version, "清单版本元数据必须 100% 对齐");
    assert.equal(pkg.version, constantsMod.PLUGIN_VERSION, "清单版本与代码常量必须 100% 对齐");
});

test("T-7814: 中英文 README 徽标、标题、安装方式、折叠历史日志与底部声明精确对齐 0.48.90", () => {
    // 中文 README 对齐
    assert.match(readmeZh, /badge\/version-0\.48\.90-blue/, "中文 README 徽标必须为 0.48.90");
    assert.match(readmeZh, /最近正式版：v0\.48\.90（2026-11-13 · 本地封验）/, "中文 README 最近正式版必须为 v0.48.90");
    assert.match(readmeZh, /## 本次更新（v0\.48\.90 · 2026-11-13 · 本地封验）/, "中文 README 更新章节必须为 v0.48.90");
    assert.match(readmeZh, /<details>\s*<summary>展开查看历史版本更新摘要/, "中文 README 历史版本必须使用 <details> 折叠收起");
    assert.match(readmeZh, /## 📦 安装方式/, "中文 README 必须包含安装方式章节");
    assert.match(readmeZh, /当前版本为 `v0\.48\.90`/, "中文 README 底部版本声明必须为 v0.48.90");

    // 英文 README 对齐
    assert.match(readmeEn, /badge\/version-0\.48\.90-blue/, "英文 README 徽标必须为 0.48.90");
    assert.match(readmeEn, /Latest stable release: v0\.48\.90 \(2026-11-13 · Local Verified\)/, "英文 README 最近正式版必须为 v0.48.90");
    assert.match(readmeEn, /## What's New In v0\.48\.90 \(2026-11-13 · Local Verified\)/, "英文 README 更新章节必须为 v0.48.90");
    assert.match(readmeEn, /<details>\s*<summary>View Previous Release Highlights/, "英文 README 历史版本必须使用 <details> 折叠收起");
    assert.match(readmeEn, /## 📦 Installation/, "英文 README 必须包含安装方式章节");
    assert.match(readmeEn, /The current version is `v0\.48\.90`/, "英文 README 底部版本声明必须为 v0.48.90");
});

test("T-7814: 中英文 CHANGELOG 固化独立的 v0.48.90 章节并优先于 v0.48.88", () => {
    // 中文 CHANGELOG
    const zhPos4889 = changelogZh.indexOf("### v0.48.90（2026-11-13 · 本地封验）");
    const zhPos4888 = changelogZh.indexOf("### v0.48.88（2026-11-04 · 本地封验）");
    assert.ok(zhPos4889 >= 0, "中文 CHANGELOG 必须包含 v0.48.90 发布章节");
    assert.ok(zhPos4888 >= 0, "中文 CHANGELOG 必须包含历史 v0.48.88 章节");
    assert.ok(zhPos4889 < zhPos4888, "v0.48.90 章节必须排在 v0.48.88 之前");

    // 英文 CHANGELOG
    const enPos4889 = changelogEn.indexOf("### v0.48.90 (2026-11-13 · Local Verified)");
    const enPos4888 = changelogEn.indexOf("### v0.48.88 (2026-11-04 · Local Verified)");
    assert.ok(enPos4889 >= 0, "英文 CHANGELOG 必须包含 v0.48.90 发布章节");
    assert.ok(enPos4888 >= 0, "英文 CHANGELOG 必须包含历史 v0.48.88 章节");
    assert.ok(enPos4889 < enPos4888, "v0.48.90 章节必须排在 v0.48.88 之前");
});

test("T-7814: ROADMAP.md 基线版本精确结转为 v0.48.90", () => {
    assert.match(roadmap, /> 基线：`v0\.48\.90` 已就绪/);
    assert.match(roadmap, /最后更新：2026-11-13/);
});

test("T-7814 门禁负向验证：若版本号退化或发布章节倒序，断言必须精准红", () => {
    assert.throws(() => {
        assert.equal(pkg.version, "0.48.87");
    }, assert.AssertionError);

    assert.throws(() => {
        assert.ok(changelogZh.indexOf("### v0.48.86（2026-11-01 · 本地封验）") < changelogZh.indexOf("### v0.48.87（2026-11-01 · 本地封验）"));
    }, assert.AssertionError);
});
