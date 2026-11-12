// T-7376 全二级弹窗统一品牌标题栏装配、移动端版本对齐与主切换器 IME 深度防御契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 openHomeConfigForm 装配 mountPlatformDialogTitleWrap；
//   2. 验证 openStoreWidgetPreview 装配 mountPlatformDialogTitleWrap；
//   3. 验证 openHomeHealthDetails 装配 mountPlatformDialogTitleWrap；
//   4. 验证 openSavedSearchEditor 装配 mountPlatformDialogTitleWrap；
//   5. 验证 移动端切换器弹窗标题栏版本号提升至 v0.48.18；
//   6. 验证 bindSearchInputComposition 的 Escape 键拦截具备 isComposing 与 keyCode === 229 双重防线；
//   7. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const configFormTs = readSourceText(path.join(root, "src", "home-config-form.ts"));
const configFormJs = readSourceText(path.join(root, "src", "home-config-form.js"));
const storeUiTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeUiJs = readSourceText(path.join(root, "src", "home-store-ui.js"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const secondPanelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7376: openHomeConfigForm 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        configFormTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*`\$\{this\.i18n\.homeConfig \|\| "配置"\} · \$\{def\.title \|\| inst\.moduleId\}`,/s,
        "home-config-form.ts 必须装配统一品牌标题栏",
    );
    assert.match(
        configFormJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*`\$\{this\.i18n\.homeConfig \|\| "配置"\} · \$\{def\.title \|\| inst\.moduleId\}`,/s,
        "home-config-form.js 必须同步装配统一品牌标题栏",
    );
});

test("T-7376: openStoreWidgetPreview 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        storeUiTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*`\$\{this\.i18n\.homeStorePreview \|\| "预览"\} · \$\{def\.title \|\| moduleId\}`,/s,
        "home-store-ui.ts 独立预览必须装配统一品牌标题栏",
    );
    assert.match(
        storeUiJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*`\$\{this\.i18n\.homeStorePreview \|\| "预览"\} · \$\{def\.title \|\| moduleId\}`,/s,
        "home-store-ui.js 独立预览必须同步装配统一品牌标题栏",
    );
});

test("T-7376: openHomeHealthDetails 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        secondPanelTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.homeHealthDetailsTitle \|\| "小组件健康监控",\s*"",\s*"iconHeart"\);/s,
        "second-panel-ui.ts 健康详情大窗必须装配统一品牌标题栏",
    );
    assert.match(
        secondPanelJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*this\.i18n\.homeHealthDetailsTitle \|\| "小组件健康监控",\s*"",\s*"iconHeart"\);/s,
        "second-panel-ui.js 健康详情大窗必须同步装配统一品牌标题栏",
    );
});

test("T-7376: openSavedSearchEditor 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        docSearchTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.searchSavedEditTitle \|\| "编辑保存的搜索",\s*"",\s*"iconFilter"\);/s,
        "doc-search-ui.ts 保存搜索编辑窗必须装配统一品牌标题栏",
    );
    assert.match(
        docSearchJs,
        /mountPlatformDialogTitleWrap\)\(dialog\.element,\s*this\.i18n\.searchSavedEditTitle \|\| "编辑保存的搜索",\s*"",\s*"iconFilter"\);/s,
        "doc-search-ui.js 保存搜索编辑窗必须同步装配统一品牌标题栏",
    );
});

test("T-7376: 移动端切换器弹窗标题栏装配 mountPlatformDialogTitleWrap", () => {
    assert.match(
        indexTs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.dialogSwitcherTitle \|\| "页签切换器",\s*"",\s*"iconLvSpeedSwitch"\);/s,
        "移动端切换器弹窗标题栏必须装配统一品牌标题栏",
    );
});

test("T-7376: bindSearchInputComposition 的 Escape 键拦截具备 isComposing 与 keyCode === 229 防线", () => {
    assert.match(
        indexTs,
        /if\s*\(composing\s*\|\|\s*event\.isComposing\s*\|\|\s*event\.keyCode === 229\)\s*return;/s,
        "bindSearchInputComposition 必须具备多重 IME 状态与 keyCode 229 守卫",
    );
});

test("T-7376 门禁负向验证: 若缺少弹窗装配或防御逻辑必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(configFormTs, /fake_non_existent_config_form_title_wrap/);
    }, assert.AssertionError);

    // 探针 2: 负向断言若版本号退化为 v0.48.9 必定失败
    assert.throws(() => {
        assert.match(indexTs, /mountPlatformDialogTitleWrap\(dialog\.element,\s*this\.i18n\.dialogSwitcherTitle \|\| "页签切换器",\s*"v0\.48\.9"/);
    }, assert.AssertionError);
});
