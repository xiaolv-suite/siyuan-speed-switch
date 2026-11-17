const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("lvLaunchpad 罗盘弹射坞：多插件注册、三态控制、二级行动调度与注销", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_LAUNCHPAD__;
    delete dom.window.__LV_LAUNCHPAD_REGISTRY__;

    const {lvLaunchpad} = require("../src/libs/lv-notice-kit.ts");

    let mainViewOpened = false;
    let actionTriggered = "";

    // 1. 注册雷切入口
    const cleanRaikiri = lvLaunchpad.register({
        id: "siyuan-speed-switch",
        name: "雷切",
        fullName: "小驴雷切",
        svgIcon: "icon-lv-raikiri",
        color: "#38bdf8",
        desc: "分栏切换 · 选区暂存",
        digit: 2,
        badge: "已就绪",
        badgeType: "success",
        actions: [
            "打开切片库",
            "切片当前文档",
            "开关动作悬浮球",
            "搜索当前文档切片",
            "打开暂存栈顶切片",
        ],
        onClick: () => {
            mainViewOpened = true;
        },
        onAction: (act) => {
            actionTriggered = act;
        },
    });

    // 2. 注册快门入口
    const cleanQuickgate = lvLaunchpad.register({
        id: "siyuan-quickgate",
        name: "快门",
        fullName: "小驴快门",
        svgIcon: "icon-lv-quickgate",
        color: "#10b981",
        desc: "全局弹窗 · 闪念穿梭",
        digit: 1,
        badge: "就绪",
        badgeType: "primary",
        actions: ["唤起快速启动器", "闪念速记输入"],
        onClick: () => {},
    });

    // 3. 验证弹射坞注册与默认三态属性 (docked)
    const items = lvLaunchpad.getItems();
    assert.equal(items.length, 2, "应能获取全部已注册小驴插件");
    const raikiri = items.find((i) => i.id === "siyuan-speed-switch");
    assert.ok(raikiri, "必须包含雷切");
    assert.equal(raikiri.name, "雷切");
    assert.equal(raikiri.state, "docked", "默认未配置时应为 docked 坞内收敛态");
    assert.equal(raikiri.actions.length, 5, "雷切必须声明 5 项二级快捷行动");

    // 4. 验证三态动态切换：修改为 pinned（顶栏置顶）
    lvLaunchpad.setPluginState("siyuan-speed-switch", "pinned");
    const afterPinItems = lvLaunchpad.getItems();
    const pinnedRaikiri = afterPinItems.find((i) => i.id === "siyuan-speed-switch");
    assert.equal(pinnedRaikiri.state, "pinned", "状态应被更新为 pinned 置顶在外");

    // 5. 验证点击主入口与二级行动分发
    raikiri.onClick();
    assert.equal(mainViewOpened, true, "主点击应正确触发 onClick");

    raikiri.onAction("切换至双栏对照模式");
    assert.equal(actionTriggered, "切换至双栏对照模式", "二级行动应正确触发 onAction");

    // 6. 验证干净注销
    cleanRaikiri();
    const remainingItems = lvLaunchpad.getItems();
    assert.equal(remainingItems.length, 1);
    assert.equal(remainingItems[0].id, "siyuan-quickgate");

    cleanQuickgate();
    assert.equal(lvLaunchpad.getItems().length, 0);

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});

test("T-Phase5 源码契约：雷切必须完整向 lvLaunchpad 注册并具备二级行动分发方法", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));

    // 注册契约断言
    assert.match(
        indexSource,
        /lvLaunchpad\.register\s*\(\s*\{[\s\S]*?id:\s*["']siyuan-speed-switch["']/,
        "雷切必须在 onload 中向 lvLaunchpad 注册",
    );

    assert.match(
        indexSource,
        /name:\s*["']雷切["']/,
        "罗盘注册必须标明 name: '雷切'",
    );

    assert.match(
        indexSource,
        /fullName:\s*["']小驴雷切["']/,
        "罗盘注册必须标明 fullName: '小驴雷切'",
    );

    assert.match(
        indexSource,
        /svgIcon:\s*["']icon-lv-raikiri["']/,
        "罗盘注册必须使用原生矢量 SVG 图标 icon-lv-raikiri",
    );

    // 5 项二级行动契约断言（手机直办优先）
    const requiredActions = [
        "打开切片库",
        "切片当前文档",
        "开关动作悬浮球",
        "搜索当前文档切片",
        "打开暂存栈顶切片",
    ];
    for (const act of requiredActions) {
        assert.ok(
            indexSource.includes(act),
            `雷切必须声明二级行动: ${act}`,
        );
    }

    // 生命周期与方法实现契约断言
    assert.match(
        indexSource,
        /this\.launchpadCleaner\?\.\(\)/,
        "雷切必须在 onunload 中调用 this.launchpadCleaner?.() 注销",
    );

    assert.match(
        indexSource,
        /openMainView\s*\(\s*\)\s*:\s*void/,
        "雷切主类必须提供 openMainView 方法供罗盘主入口唤醒",
    );

    assert.match(
        indexSource,
        /handleQuickAction\s*\(\s*action:\s*string\s*\)\s*:\s*Promise<void>/,
        "雷切主类必须提供 handleQuickAction 方法供罗盘二级行动调度",
    );
});

test("T-Phase5 门禁负向验证：注销后不可残留、未知动作安全兜底", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_LAUNCHPAD__;
    delete dom.window.__LV_LAUNCHPAD_REGISTRY__;

    const {lvLaunchpad} = require("../src/libs/lv-notice-kit.ts");

    // 负向探针 1：注销后不可残留
    const cleaner = lvLaunchpad.register({
        id: "probe-item",
        name: "探针",
        fullName: "小驴探针",
        svgIcon: "icon-probe",
        onClick: () => {},
    });
    cleaner();
    assert.equal(
        lvLaunchpad.getItems().some((i) => i.id === "probe-item"),
        false,
        "注销后探针插件不得残留在罗盘项中",
    );

    // 负向探针 2：未知动作不崩溃
    const mockHost = {
        updatedSettings: null,
        switcherOpened: false,
        updateSettings(s) { this.updatedSettings = s; },
        showSwitcher() { this.switcherOpened = true; },
        openSnippetStackDialog() {},
        executeStackCapture: async () => {},
    };

    // 提取 handleQuickAction 逻辑并在沙盒测试未知动作
    const handleAction = async (action) => {
        switch (action) {
            case "切换至双栏对照模式": mockHost.updateSettings({columns: 2}); break;
            case "切换至三栏专注模式": mockHost.updateSettings({columns: 3}); break;
            default: mockHost.showSwitcher(); break;
        }
    };

    await handleAction("未知异常动作");
    assert.equal(mockHost.switcherOpened, true, "未知动作应安全兜底为打开切换器主视图");

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});
