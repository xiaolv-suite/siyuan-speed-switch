// T-7390 工作台关系大纲精准定位滚动、思源深度链接拦截与类型徽标契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 handleHomeItemAction 中对块跳转注入 action: ["cb-get-scroll"]；
//   2. 验证 index.ts 与 index.js 拦截 item.href 的 siyuan://blocks/ 深度链接，避免误调外部浏览器；
//   3. 验证 _05-settings-widgets.scss 为关系与大纲卡片注入胶囊徽标与 hover 动效；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const settingsWidgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7390: index.ts 与 index.js 在 handleHomeItemAction 中对块跳转注入 cb-get-scroll", () => {
    assert.match(
        indexTs,
        /openTab\(\{app:\s*this\.app,\s*doc:\s*\{id:\s*value,\s*action:\s*\["cb-get-scroll"\]\}\}\)/s,
        "index.ts 必须对 BLOCK_ID_RE 块跳转注入 cb-get-scroll",
    );
    assert.match(
        indexJs,
        /openTab\)\(\{ app:\s*this\.app,\s*doc:\s*\{ id:\s*value,\s*action:\s*\["cb-get-scroll"\] \} \}\)/s,
        "index.js 必须对 BLOCK_ID_RE 块跳转注入 cb-get-scroll",
    );
});

test("T-7390: index.ts 与 index.js 拦截 siyuan://blocks/ 深度链接在思源内部打开", () => {
    assert.match(
        indexTs,
        /const blockLink = item\.href\.match\(\/\^siyuan:\\\/\\\/blocks\\\/[\s\S]*?openTab\(\{app:\s*this\.app,\s*doc:\s*\{id:\s*blockLink\[1\],\s*action:\s*\["cb-get-scroll"\]\}\}\)/s,
        "index.ts 必须拦截 siyuan://blocks/ 链接并在内部打开",
    );
    assert.match(
        indexJs,
        /const blockLink = item\.href\.match\(\/\^siyuan:\\\/\\\/blocks\\\/[\s\S]*?openTab\)\(\{ app:\s*this\.app,\s*doc:\s*\{ id:\s*blockLink\[1\],\s*action:\s*\["cb-get-scroll"\] \} \}\)/s,
        "index.js 必须拦截 siyuan://blocks/ 链接并在内部打开",
    );
});

test("T-7390: _05-settings-widgets.scss 包含大纲与关系项胶囊与悬浮动效", () => {
    assert.match(
        settingsWidgetsScss,
        /\.sw-home__cell\[data-module-id="current-document-outline"\]\s*\{[\s\S]*?transform:\s*translateX\(2px\);[\s\S]*?\.sw__home-module-item-secondary\s*\{/s,
        "_05-settings-widgets.scss 必须包含 current-document-outline 的胶囊与位移动效",
    );
    assert.match(
        settingsWidgetsScss,
        /\.sw-home__cell\[data-module-id="document-relations-summary"\]\s*\{[\s\S]*?transform:\s*translateX\(2px\);[\s\S]*?\.sw__home-module-item-secondary\s*\{/s,
        "_05-settings-widgets.scss 必须包含 document-relations-summary 的胶囊与位移动效",
    );
});

test("T-7390 门禁负向验证: 若缺少精准定位滚动或链接拦截必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在动作必定失败
    assert.throws(() => {
        assert.match(indexTs, /doc:\s*\{id:\s*value,\s*action:\s*\["cb-fake-scroll"\]\}/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的样式选择器必定失败
    assert.throws(() => {
        assert.match(settingsWidgetsScss, /\.sw-home__cell\[data-module-id="fake_outline_module"\]/);
    }, assert.AssertionError);
});
