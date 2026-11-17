const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("lvBackup 联合灾备：注册切面、全生态全量导出与一键恢复", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_BACKUP_HUB__;
    delete dom.window.__LV_BACKUP_REGISTRY__;

    const {lvBackup, lvEcosystem} = require("../src/libs/lv-notice-kit.ts");

    let restoredRaikiriData = null;
    let restoredQuickgateData = null;

    // 1. 注册雷切备份切面
    const cleanRaikiri = lvBackup.register(
        "siyuan-speed-switch",
        async () => ({
            snippetStack: {version: 1, items: [{id: "s1", title: "原子切片"}]},
            homeState: {layout: "bento", modules: ["tags", "recent"]},
        }),
        async (data) => {
            restoredRaikiriData = data;
            return true;
        },
    );

    // 2. 注册快门备份切面
    const cleanQuickgate = lvBackup.register(
        "siyuan-quickgate",
        async () => ({
            customShortcuts: [{key: "ctrl+k", action: "open"}],
        }),
        async (data) => {
            restoredQuickgateData = data;
            return true;
        },
    );

    // 3. 验证生态自省已识别已联结插件
    const diag = lvEcosystem.getDiagnostics();
    assert.ok(diag.version >= 130);
    assert.ok(diag.registeredPlugins.includes("siyuan-speed-switch"));
    assert.ok(diag.registeredPlugins.includes("siyuan-quickgate"));

    const badgeText = lvEcosystem.getStatusBadgeText();
    assert.match(badgeText, /🐴 小驴全家桶/);
    assert.match(badgeText, /2 插件已联结/);

    // 4. 全量导出联合灾备总包
    const bundle = await lvBackup.exportFull();
    assert.equal(bundle.v, 1);
    assert.equal(bundle.ecosystem, "xiaolv");
    assert.ok(bundle.plugins["siyuan-speed-switch"]);
    assert.ok(bundle.plugins["siyuan-quickgate"]);
    assert.deepEqual(bundle.plugins["siyuan-speed-switch"].data.snippetStack, {
        version: 1,
        items: [{id: "s1", title: "原子切片"}],
    });

    // 5. 联合灾备一键恢复
    const result = await lvBackup.restoreFull(bundle);
    assert.deepEqual(result.success.sort(), ["siyuan-quickgate", "siyuan-speed-switch"]);
    assert.equal(result.failed.length, 0);
    assert.ok(restoredRaikiriData);
    assert.ok(restoredQuickgateData);

    // 6. 清洁注销验证
    cleanRaikiri();
    cleanQuickgate();

    const afterDiag = lvEcosystem.getDiagnostics();
    assert.equal(afterDiag.registeredPlugins.length, 0);

    delete global.window;
    dom.window.close();
});

test("T-Phase4 源码契约：雷切必须注册全生态灾备切面并展示生态指示器", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));
    const secondPanelSource = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
    const settingsSource = readSourceText(path.join(root, "src", "settings-sections.ts"));

    // 灾备切面注册与卸载契约
    assert.match(
        indexSource,
        /lvBackup\.register\s*\(\s*["']siyuan-speed-switch["']\s*,\s*async\s*\(\s*\)\s*=>\s*this\.dumpData\(\)\s*,\s*async\s*\(data\)\s*=>\s*this\.restoreData\(data\)\s*\)/,
        "雷切必须向 lvBackup 登记 siyuan-speed-switch 备份与恢复切面",
    );

    assert.match(
        indexSource,
        /this\.backupCleaner\?\.\(\)/,
        "雷切必须在 onunload 中注销 backupCleaner",
    );

    // dumpData & restoreData 实现完备性
    assert.match(
        indexSource,
        /dumpData\s*\(\s*\)\s*:\s*Promise<Record<string,\s*unknown>>/,
        "雷切必须导出 dumpData 供联合灾备调用",
    );

    assert.match(
        indexSource,
        /restoreData\s*\(\s*data\s*:\s*Record<string,\s*unknown>\s*\)\s*:\s*Promise<boolean>/,
        "雷切必须导出 restoreData 供联合灾备恢复",
    );

    // 工作台指示器契约
    assert.match(
        secondPanelSource,
        /sw-home__receipt-ecosystem/,
        "第二面板回执条必须挂载 sw-home__receipt-ecosystem 节点",
    );

    assert.match(
        secondPanelSource,
        /lvEcosystem\.getStatusBadgeText\(\)/,
        "第二面板回执条必须嵌入 lvEcosystem.getStatusBadgeText() 状态胶囊",
    );

    // 侧边栏与设置页指示器契约
    assert.match(
        indexSource,
        /sw__ecosystem-status/,
        "侧边栏必须挂载 sw__ecosystem-status 节点",
    );

    assert.match(
        settingsSource,
        /sw-settings__eco-badge/,
        "设置页存储分节必须挂载 sw-settings__eco-badge 生态徽章",
    );
});

test("T-Phase4 门禁负向验证：非法灾备包与未注册插件精准拦截", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_BACKUP_HUB__;
    delete dom.window.__LV_BACKUP_REGISTRY__;

    const {lvBackup} = require("../src/libs/lv-notice-kit.ts");

    // 负向探针 1：篡改或非法格式的 bundle 必须拒绝
    await assert.rejects(
        async () => {
            await lvBackup.restoreFull({
                v: 1,
                ecosystem: "fake-host",
                exportedAt: new Date().toISOString(),
                plugins: {},
            });
        },
        /非合法的小驴全生态灾备包格式/,
        "非法生态标识总包必须拒绝",
    );

    // 负向探针 2：恢复未安装或未注册切面的插件应记入 failed 列表
    const result = await lvBackup.restoreFull({
        v: 1,
        ecosystem: "xiaolv",
        exportedAt: new Date().toISOString(),
        plugins: {
            "siyuan-nonexistent-plugin": {
                plugin: "siyuan-nonexistent-plugin",
                version: "1.0.0",
                exportedAt: new Date().toISOString(),
                data: {},
            },
        },
    });

    assert.equal(result.success.length, 0);
    assert.equal(result.failed.length, 1);
    assert.match(result.failed[0], /未安装或未注册恢复切面/);

    delete global.window;
    dom.window.close();
});
