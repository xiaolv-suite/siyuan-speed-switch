// T-7841 ~ T-7843 体验精进批次专项契约测试与负向验证探针
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. T-7841: 悬浮球更多动作抽屉支持字母按键单键拼音首字母快速跳转聚焦；
//   2. T-7842: 快速记录弹窗支持常用标签胶囊栏一键追加 (#闪念#/#待办#/#灵感#/#会议#)；
//   3. T-7843: 工作台卡片双击标题栏与按 C 键折叠/展开并持久化记忆；
//   4. 破坏性负向注入验证。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));

test("T-7841: 悬浮球更多动作抽屉接入拼音首字母与字母键单键跳转聚焦", () => {
    assert.match(
        panelJs,
        /function getPinyinFirstLetter\(str\)[\s\S]*?tiny-pinyin[\s\S]*?convertToPinyin/,
        "必须包含拼音引擎首字母提取逻辑",
    );
    assert.match(
        panelJs,
        /if \(\/\^\[a-zA-Z\]\$\/\.test\(event\.key\)\) \{[\s\S]*?getPinyinFirstLetter[\s\S]*?nextMatch\.focus\(\);/,
        "抽屉按键监听必须捕获字母键并循环聚焦下一个首字母匹配的动作按钮",
    );
});

test("T-7842: 快速记录弹窗装配常用标签胶囊栏并支持点击在光标处追加", () => {
    assert.match(
        indexTs,
        /const quickTagsBar = document\.createElement\("div"\);[\s\S]*?sw-quick-capture__tags[\s\S]*?defaultTags = \["#闪念#", "#待办#", "#灵感#"\];/,
        "快速记录弹窗必须装配包含常用标签的标签胶囊栏",
    );
    assert.match(
        indexTs,
        /input\.value = text\.slice\(0, start\) \+ insert \+ text\.slice\(end\);[\s\S]*?input\.focus\(\);/,
        "点击标签胶囊必须在光标处或末尾追加对应标签并恢复输入框焦点",
    );
});

test("T-7843: 工作台小组件标题栏双击与按 C 键均触发 controller.toggle() 并持久化", () => {
    assert.match(
        secondPanelTs,
        /if \(target\?\.closest\("\.sw__home-module-header"\)\) \{[\s\S]*?controller\.toggle\(\);[\s\S]*?return;/,
        "双击卡片标题栏必须触发 controller.toggle() 进行折叠或展开",
    );
    assert.match(
        secondPanelTs,
        /if \(key\.key === "c" \|\| key\.key === "C"\) \{[\s\S]*?controller\.toggle\(\);[\s\S]*?return;/,
        "卡片聚焦按 C 键必须触发 controller.toggle() 进行折叠或展开",
    );
});

test("T-7841~T-7843 门禁破坏性负向验证探针", () => {
    const fakePanel = panelJs.replace(/getPinyinFirstLetter/, "// removed pinyin");
    assert.doesNotMatch(
        fakePanel,
        /function getPinyinFirstLetter\(str\)/,
        "负向注入验证：缺少拼音首字母提取时断言必须拦截失败",
    );

    const fakeIndex = indexTs.replace(/sw-quick-capture__tags/, "// removed tags");
    assert.doesNotMatch(
        fakeIndex,
        /quickTagsBar\.className = "sw-quick-capture__tags";/,
        "负向注入验证：缺少常用标签栏时断言必须拦截失败",
    );

    const fakeSecond = secondPanelTs.replace(/target\?\.closest\("\.sw__home-module-header"\)/, "// removed header toggle");
    assert.doesNotMatch(
        fakeSecond,
        /if \(target\?\.closest\("\.sw__home-module-header"\)\) \{/,
        "负向注入验证：缺少标题栏双击折叠时断言必须拦截失败",
    );
});
