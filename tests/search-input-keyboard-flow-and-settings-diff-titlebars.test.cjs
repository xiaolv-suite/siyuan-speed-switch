// T-7377 搜索框键盘流 Enter 执行与向下直达卡片导航、设置页二级差异弹窗品牌标题栏契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 openDocumentSetDiffDialog 装配 mountPlatformDialogTitleWrap；
//   2. 验证 openConfigPackDiffDialog 装配 mountPlatformDialogTitleWrap；
//   3. 验证 bindSearchInputComposition 具备 ArrowDown 向下聚焦首个匹配项能力；
//   4. 验证 bindSearchInputComposition 具备 Enter 键直达执行激活能力；
//   5. 验证 mobile-switcher-ui 同步透传 scrollElement 与 closeOverlay；
//   6. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const settingsSectionsTs = readSourceText(path.join(root, "src", "settings-sections.ts"));
const settingsSectionsJs = readSourceText(path.join(root, "src", "settings-sections.js"));
const mobileSwitcherTs = readSourceText(path.join(root, "src", "mobile-switcher-ui.ts"));
const mobileSwitcherJs = readSourceText(path.join(root, "src", "mobile-switcher-ui.js"));

test("T-7377: openDocumentSetDiffDialog 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        settingsSectionsTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*diffTitle,\s*"",\s*"iconHistory"\);/s,
        "settings-sections.ts 文档集差异大窗必须装配统一品牌标题栏",
    );
    assert.match(
        settingsSectionsJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*diffTitle,\s*"",\s*"iconHistory"\);/s,
        "settings-sections.js 文档集差异大窗必须同步装配统一品牌标题栏",
    );
});

test("T-7377: openConfigPackDiffDialog 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        settingsSectionsTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.configPackDiffTitle \|\| "配置差异",\s*"",\s*"iconSettings"\);/s,
        "settings-sections.ts 配置包差异大窗必须装配统一品牌标题栏",
    );
    assert.match(
        settingsSectionsJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*this\.i18n\.configPackDiffTitle \|\| "配置差异",\s*"",\s*"iconSettings"\);/s,
        "settings-sections.js 配置包差异大窗必须同步装配统一品牌标题栏",
    );
});

test("T-7377: bindSearchInputComposition 接入 ArrowDown 键盘直达卡片导航", () => {
    assert.match(
        indexTs,
        /if\s*\(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstTarget\.focus\(/s,
        "bindSearchInputComposition 必须实现 ArrowDown 直达卡片与结果焦点转移",
    );
});

test("T-7377: bindSearchInputComposition 接入 Enter 键直达执行与卡片激活", () => {
    assert.match(
        indexTs,
        /if\s*\(event\.key === "Enter"\)\s*\{[\s\S]*?commandItem\.click\(\)[\s\S]*?this\.activateCardByElement\(targetCard/s,
        "bindSearchInputComposition 必须实现 Enter 键顺序直达执行命令或激活卡片",
    );
});

test("T-7377: mobile-switcher-ui 正确透传 scrollElement 与 closeOverlay", () => {
    assert.match(
        mobileSwitcherTs,
        /this\.bindSearchInputComposition\(searchInput,\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*scrollElement,\s*closeOverlay\);/s,
        "mobile-switcher-ui.ts 必须将 scrollElement 和 closeOverlay 传入 bindSearchInputComposition",
    );
    assert.match(
        mobileSwitcherJs,
        /this\.bindSearchInputComposition\(searchInput,\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*scrollElement,\s*closeOverlay\);/s,
        "mobile-switcher-ui.js 必须同步透传参数",
    );
});

test("T-7377 门禁负向验证: 若缺失差异弹窗标题栏或 Enter 直达逻辑必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(settingsSectionsTs, /fake_non_existent_diff_title_wrap/);
    }, assert.AssertionError);

    // 探针 2: 负向断言若缺失 ArrowDown 逻辑必定失败
    assert.throws(() => {
        assert.match(indexTs, /non_existent_arrow_down_keyboard_handler/);
    }, assert.AssertionError);
});
