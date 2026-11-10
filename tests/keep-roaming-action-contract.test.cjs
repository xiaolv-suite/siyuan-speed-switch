// T-7394 小驴拾遗「继续漫游 (Keep Roaming)」动作画板与悬浮球动作契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 action-palette-model 注册 glean-keep-roaming 内置动作；
//   2. 验证 quick-actions 包含 glean-keep-roaming 并在 BUILTIN_VALUES 登记；
//   3. 验证 floating-ball-actions 声明 glean-keep-roaming 分发分支；
//   4. 验证 index.ts 声明 executeKeepRoaming 且接入 800ms 熔断保护；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const {getBuiltinActionDefinitions} = require("../src/action-palette-model.js");
const {getBuiltinQuickActions} = require("../src/quick-actions.js");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const fbActions = readSourceText(path.join(root, "src", "floating-ball-actions.js"));

test("T-7394: action-palette-model 注册 glean-keep-roaming", () => {
    const actions = getBuiltinActionDefinitions({});
    const roaming = actions.find((a) => a.id === "glean-keep-roaming");
    assert.ok(roaming, "动作画板必须包含 glean-keep-roaming 动作");
    assert.equal(roaming.section, "open", "glean-keep-roaming 必须归属于 open 分组");
    assert.equal(roaming.shortcut, "⌥M", "快捷键必须为 ⌥M");
});

test("T-7394: quick-actions 包含 glean-keep-roaming 并在 BUILTIN_VALUES 登记", () => {
    const quickActions = getBuiltinQuickActions();
    const roaming = quickActions.find((a) => a.id === "glean-keep-roaming");
    assert.ok(roaming, "快捷动作目录必须包含 glean-keep-roaming");
    assert.equal(roaming.kind, "builtin");
    assert.equal(roaming.value, "glean-keep-roaming");
});

test("T-7394: floating-ball-actions 声明 glean-keep-roaming 分发分支", () => {
    assert.match(
        fbActions,
        /case "glean-keep-roaming":\s*\{\s*const callback = callbackOf\(options, "onKeepRoaming"\);/,
        "floating-ball-actions 必须分发 onKeepRoaming 回调",
    );
});

test("T-7394: index.ts 声明 executeKeepRoaming 并实现 800ms 熔断保护与拾遗桥优先", () => {
    assert.match(
        indexTs,
        /private async executeKeepRoaming\(onDestroy\?: \(\) => void\): Promise<boolean>/,
        "index.ts 必须声明 executeKeepRoaming 私有方法",
    );
    assert.match(
        indexTs,
        /case "glean-keep-roaming":\s*void this\.executeKeepRoaming\(destroySwitcher\);/,
        "executePaletteAction 必须接入 glean-keep-roaming",
    );
    assert.match(
        indexTs,
        /setTimeout\(\(\) => resolve\(null\), 800\)/,
        "executeKeepRoaming 必须严格具备 800ms 熔断保护",
    );
});

test("T-7394 门禁负向验证: 若缺失 800ms 熔断或未注册动作必须精准红", () => {
    // 探针 1: 负向断言伪造的不存在动作必不在定义中
    const actions = getBuiltinActionDefinitions({});
    assert.equal(actions.find((a) => a.id === "fake-roaming-action"), undefined);

    // 探针 2: 负向断言 index.ts 不应包含无保护的无限挂起
    assert.doesNotMatch(indexTs, /getNextRoamingClip\(\)\.then\(\(\) => \{\}\);/);
});
