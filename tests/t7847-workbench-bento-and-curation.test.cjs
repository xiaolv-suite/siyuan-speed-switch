// T-7847: 第二面板 Bento 3.0 网格现代化与组件库 18 款核心精品收敛专项契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. HOME_FEATURED_MODULE_IDS 收敛为 18 款核心殿堂级精品组件；
//   2. 小组件商店默认打开展示 recommended 殿堂精选视图；
//   3. .sw-home__grid 声明 grid-auto-flow: dense 致密自动填充；
//   4. .sw-home__cell 声明 Bento 柔影与 hover/active 触觉动效；
//   5. 破坏性负向注入验证。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeModelJs = readSourceText(path.join(root, "src", "home-store-model.js"));
const storeUiTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7847: HOME_FEATURED_MODULE_IDS 完整覆盖 18 款殿堂级核心精品组件", () => {
    const requiredGems = [
        "recent-documents",
        "today-journal",
        "today-tasks",
        "favorites",
        "quick-capture",
        "checkin-streak",
        "checkin-weekly",
        "checkin-year-heatmap",
        "flashcard-due",
        "year-progress",
        "countdown",
        "external-local-time",
        "external-weather-open-meteo",
        "on-this-day",
        "note-stats",
        "database-list",
        "tags",
        "bookmarks",
    ];
    requiredGems.forEach((gem) => {
        assert.ok(
            storeModelJs.includes(`"${gem}"`),
            `HOME_FEATURED_MODULE_IDS 必须包含精品小组件 ${gem}`,
        );
    });
});

test("T-7847: 小组件商店默认打开展示 recommended 殿堂精选推荐视图", () => {
    assert.match(
        storeUiTs,
        /let storeTab = typeof persistedStoreState\.tab === "string" \? persistedStoreState\.tab : "recommended";/,
        "商店打开必须优先展示 recommended 精选推荐视图",
    );
});

test("T-7847: .sw-home__grid 声明 grid-auto-flow: dense 致密自动填充", () => {
    assert.match(
        widgetsScss,
        /\.sw-home__grid\s*\{[\s\S]*?grid-auto-flow:\s*dense;/,
        "工作台网格必须声明 grid-auto-flow: dense 消除布局空隙",
    );
});

test("T-7847: .sw-home__cell 声明 Bento 3.0 物理触觉动效", () => {
    assert.match(
        polishScss,
        /\.sw-home__cell:hover\s*\{[\s\S]*?transform:\s*translateY\(-1\.5px\);/,
        "工作台卡片悬停必须具备 1.5px 微浮动",
    );
    assert.match(
        polishScss,
        /\.sw-home__cell:active\s*\{[\s\S]*?transform:\s*translateY\(0\.5px\)\s*scale\(0\.99\);/,
        "工作台卡片按压必须具备 0.99 弹性微缩放",
    );
});

test("T-7847 门禁破坏性负向验证探针", () => {
    const fakeStore = storeUiTs.replace(/"recommended"/, '"all"');
    assert.doesNotMatch(
        fakeStore,
        /let storeTab = typeof persistedStoreState\.tab === "string" \? persistedStoreState\.tab : "recommended";/,
        "负向注入验证：缺少默认 recommended 视图时断言必须拦截失败",
    );

    const fakeGrid = widgetsScss.replace(/grid-auto-flow:\s*dense;/, "/* removed dense */");
    assert.doesNotMatch(
        fakeGrid,
        /\.sw-home__grid\s*\{[\s\S]*?grid-auto-flow:\s*dense;/,
        "负向注入验证：缺少 dense 填充时断言必须拦截失败",
    );
});
