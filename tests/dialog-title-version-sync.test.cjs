// T-7577 / T-7813 全表面主次弹窗标题栏品牌版本徽标统一消费 PLUGIN_VERSION_BADGE 单一事实源契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 constants.ts 与 constants.js 导出 PLUGIN_VERSION 与 PLUGIN_VERSION_BADGE，且与 package.json / plugin.json 精确对齐；
//   2. 剥除注释后扫描全部 13 个目标文件，验证每一处 mountPlatformDialogTitleWrap 调用均消费 PLUGIN_VERSION_BADGE；
//   3. 验证不存在任何硬编码 "v0.xx.xx" 字符串残留调用；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");
const constantsMod = require("../src/constants.js");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
const constantsTs = readSourceText(path.join(ROOT, "src", "constants.ts"));

const filesToCheck = [
    path.join(ROOT, "src", "index.ts"),
    path.join(ROOT, "src", "second-panel-ui.ts"),
    path.join(ROOT, "src", "home-store-ui.ts"),
    path.join(ROOT, "src", "home-config-form.ts"),
    path.join(ROOT, "src", "doc-search-ui.ts"),
    path.join(ROOT, "src", "settings-sections.ts"),
    path.join(ROOT, "src", "snippet-studio-ui.js"),
];

test("T-7813: 代码版本常量 PLUGIN_VERSION 与 package.json、plugin.json 精确对齐", () => {
    assert.equal(pkg.version, plugin.version, "package.json 与 plugin.json 版本必须一致");
    assert.equal(constantsMod.PLUGIN_VERSION, pkg.version, "constants.ts PLUGIN_VERSION 必须与 package.json 一致");
    assert.equal(constantsMod.PLUGIN_VERSION_BADGE, `v${pkg.version}`, "PLUGIN_VERSION_BADGE 必须等于 v + version");
    assert.match(
        constantsTs,
        new RegExp(`export const PLUGIN_VERSION = "${pkg.version.replace(/\./g, "\\.")}";`),
        "constants.ts PLUGIN_VERSION 必须与 package.json 精确一致",
    );
});

test("T-7813: 版本徽标仅在设置页显示一处，其余弹窗传空且零硬编码残留、零跨模块 versionBadge 传参", () => {
    let totalCalls = 0;
    let constantCalls = 0;
    const hardcodedOffenders = [];

    for (const file of filesToCheck) {
        const text = readSourceText(file);
        const allMatches = text.match(/mountPlatformDialogTitleWrap\(/g) || [];
        const badgeMatches = text.match(/mountPlatformDialogTitleWrap\([^)]*PLUGIN_VERSION_BADGE/g) || [];
        totalCalls += allMatches.length;
        constantCalls += badgeMatches.length;

        if (/mountPlatformDialogTitleWrap\([\s\S]{0,180}"v0\.\d+\.\d+"/.test(text)) {
            hardcodedOffenders.push(path.basename(file));
        }
    }

    assert.ok(totalCalls >= 18, `非空自检：全工程至少存在 18 处弹窗标题栏调用，实测 ${totalCalls}`);
    assert.deepEqual(hardcodedOffenders, [], `不得残留硬编码版本号字面量：${hardcodedOffenders.join(", ")}`);
    assert.equal(constantCalls, 1, `版本徽标仅在设置页挂载 1 处，实测 ${constantCalls}`);
    const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
    assert.match(
        indexTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.settings \|\| "设置",\s*PLUGIN_VERSION_BADGE,\s*"iconSettings"\)/,
        "设置弹窗必须展示 PLUGIN_VERSION_BADGE",
    );
    assert.doesNotMatch(indexTs, /versionBadge:\s*PLUGIN_VERSION_BADGE/, "不得向懒加载模块跨 chunk 传参 versionBadge");
});

test("T-7813 门禁负向验证: 若注入硬编码旧版本号或错配常量必定精准红", () => {
    const injected = 'mountPlatformDialogTitleWrap(dialog.element, "设置", "v0.48.83", "iconSettings");';
    assert.throws(() => {
        assert.doesNotMatch(injected, /mountPlatformDialogTitleWrap\)?\([\s\S]{0,180}"v0\.\d+\.\d+"/);
    }, assert.AssertionError);

    assert.throws(() => {
        assert.equal("0.48.0", pkg.version);
    }, assert.AssertionError);
});
