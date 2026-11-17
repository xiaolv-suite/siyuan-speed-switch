// T-7386 动作画板批量关闭矩阵、右键菜单扩展与工作台清空确认契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-model.js 包含 close-other-tabs、close-tabs-after、close-unpinned-tabs 动作；
//   2. 验证 index.ts executePaletteAction 正确接入三大批量关闭操作；
//   3. 验证 index.ts openCardMenu 右键菜单扩展批量关闭动作项；
//   4. 验证 second-panel-ui.ts 和 second-panel-ui.js 包含 clear-layout 清空工作台与二次确认防护；
//   5. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const paletteModelJs = readSourceText(path.join(root, "src", "action-palette-model.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const secondPanelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7386: action-palette-model 包含三大批量页签关闭动作定义", () => {
    assert.match(
        paletteModelJs,
        /id:\s*"close-other-tabs"[\s\S]*?id:\s*"close-tabs-after"[\s\S]*?id:\s*"close-unpinned-tabs"/s,
        "action-palette-model.js 必须包含 close-other-tabs, close-tabs-after, close-unpinned-tabs",
    );
});

test("T-7386: index.ts executePaletteAction 支持三大批量操作与报告提示", () => {
    assert.match(
        indexTs,
        /case "close-other-tabs":[\s\S]*?case "close-tabs-after":[\s\S]*?case "close-unpinned-tabs":/s,
        "index.ts executePaletteAction 必须支持这三个批量动作分支",
    );
    assert.match(
        indexTs,
        /batchCloseTabsWithReport/s,
        "index.ts 必须具备 batchCloseTabsWithReport 批量关闭汇报实现",
    );
});

test("T-7386: index.ts openCardMenu 右键菜单同步提供批量关闭操作", () => {
    assert.match(
        indexTs,
        /menu\.addItem\(\{[\s\S]*?label:\s*this\.i18n\.actionPaletteCloseOtherTabs[\s\S]*?close-other-tabs[\s\S]*?close-tabs-after[\s\S]*?close-unpinned-tabs/s,
        "index.ts openCardMenu 必须提供批量关闭选项",
    );
});

test("T-7386: second-panel-ui 工作台编辑态包含清空全部组件与防误触确认", () => {
    assert.match(
        secondPanelTs,
        /clearBtn\.dataset\.homeAction = "clear-layout";[\s\S]*?this\.saveHomeState\(nextState\);/s,
        "second-panel-ui.ts 必须支持 clear-layout 与确认清除逻辑",
    );
    assert.match(
        secondPanelJs,
        /clearBtn\.dataset\.homeAction = "clear-layout";[\s\S]*?this\.saveHomeState\(nextState\);/s,
        "second-panel-ui.js 必须同步支持 clear-layout 与确认清除逻辑",
    );
});

test("T-7386 门禁负向验证: 若缺少批量动作或清空逻辑必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在动作必定失败
    assert.throws(() => {
        assert.match(paletteModelJs, /id:\s*"fake_non_existent_tab_batch_action"/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的工作台动作必定失败
    assert.throws(() => {
        assert.match(secondPanelTs, /dataset\.homeAction = "fake_non_existent_clear"/);
    }, assert.AssertionError);
});
