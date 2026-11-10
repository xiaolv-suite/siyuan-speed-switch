const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const {
    resolveWorkspace,
    findAvailablePort,
    resolveKernel,
    PREFERRED_PORT,
    FORBIDDEN_PORTS,
    WORKSPACE,
} = require("../scripts/serve-isolated.cjs");

test("serve-isolated: 端口规范与禁入端口隔离门禁", async () => {
    assert.equal(PREFERRED_PORT, 43928, "默认专属端口必须为 43928，区别于日常与各兄弟插件");
    assert.ok(FORBIDDEN_PORTS.has(43919), "必须严格禁止小驴管家端口 43919");
    assert.ok(FORBIDDEN_PORTS.has(6806), "必须严格禁止日常主端口 6806");
    assert.ok(FORBIDDEN_PORTS.has(3727), "必须严格禁止本机日常思源主进程端口 3727");
    assert.ok(FORBIDDEN_PORTS.has(43920), "必须严格禁止小驴人脉端口 43920");
    assert.ok(FORBIDDEN_PORTS.has(43921), "必须严格禁止小驴考试端口 43921");
    assert.ok(FORBIDDEN_PORTS.has(43925), "必须严格禁止小驴常用端口 43925");
    assert.ok(FORBIDDEN_PORTS.has(43929), "必须严格禁止小驴打卡端口 43929");
    assert.ok(FORBIDDEN_PORTS.has(43930), "必须严格禁止小驴卡片端口 43930");
    assert.ok(FORBIDDEN_PORTS.has(43939), "必须严格禁止快捷网关端口 43939");
    assert.ok(FORBIDDEN_PORTS.has(46919), "必须严格禁止小驴拾遗端口 46919");

    const port = await findAvailablePort(PREFERRED_PORT);
    assert.ok(!FORBIDDEN_PORTS.has(port), `分配的端口 ${port} 绝不可属于禁止列表`);
    assert.ok(port >= 43900 && port < 44000, `端口应在 439xx 段：当前为 ${port}`);
});

test("serve-isolated: 隔离工作区严格定位在 D 盘", () => {
    assert.ok(WORKSPACE.startsWith("D:\\") || WORKSPACE.startsWith("d:\\"), `隔离工作区必须严格放置在 D 盘，当前为 ${WORKSPACE}`);
    assert.ok(WORKSPACE.includes("小驴雷切-isolated-preview") || WORKSPACE.includes("siyuan-speed-switch"), `工作区命名必须带隔离标识: ${WORKSPACE}`);
});

test("serve-isolated: 内核定位能正确找到思源安装与 resources 前端", () => {
    const {kernel, appDir} = resolveKernel();
    assert.ok(fs.existsSync(kernel), `内核路径必须真实存在: ${kernel}`);
    assert.ok(fs.existsSync(path.join(appDir, "stage")), `思源 stage 目录必须存在: ${appDir}`);
    assert.ok(fs.existsSync(path.join(appDir, "appearance")), `思源 appearance 目录必须存在: ${appDir}`);
});

test("serve-isolated: 负向验证 - 显式注入冲突端口时必须自动后移寻找空闲合法端口", async () => {
    const originalEnv = process.env.TEST_ISOLATED_PORT;
    try {
        process.env.TEST_ISOLATED_PORT = "43919"; // 尝试注入小驴管家端口
        const port = await findAvailablePort(PREFERRED_PORT);
        assert.notEqual(port, 43919, "即便环境变量强制 43919，也必须被 FORBIDDEN_PORTS 拦截");
        assert.ok(!FORBIDDEN_PORTS.has(port), "分配的端口不得是禁入端口");
    } finally {
        if (originalEnv !== undefined) {
            process.env.TEST_ISOLATED_PORT = originalEnv;
        } else {
            delete process.env.TEST_ISOLATED_PORT;
        }
    }
});

test("serve-isolated: 真实运行中实例网页端与双端插件就绪走查", async () => {
    const {chromium} = require("@playwright/test");
    const {resolveBrowserExecutable} = require("./support/browser.cjs");

    const desktopUrl = `http://127.0.0.1:${PREFERRED_PORT}/stage/build/desktop/`;
    const mobileUrl = `http://127.0.0.1:${PREFERRED_PORT}/stage/build/mobile/`;

    // 1. 确保内核在线
    const probeRes = await fetch(`http://127.0.0.1:${PREFERRED_PORT}/api/system/version`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: "{}",
    }).catch(() => null);

    if (!probeRes || !probeRes.ok) {
        console.log("提示：独立内核当前未运行，跳过现场浏览器交互核验");
        return;
    }

    const executablePath = resolveBrowserExecutable();
    const browser = await chromium.launch({executablePath, headless: true});

    try {
        // A. 桌面端走查：切换器与悬浮球
        const desktopPage = await browser.newPage({viewport: {width: 1440, height: 900}});
        await desktopPage.goto(desktopUrl, {waitUntil: "domcontentloaded"});

        await desktopPage.waitForFunction(() => {
            const plugins = window.siyuan?.ws?.app?.plugins;
            return Array.isArray(plugins) && plugins.some((p) => p.name === "siyuan-speed-switch");
        }, undefined, {timeout: 30000});

        await desktopPage.waitForFunction(() => typeof window.siyuanSpeedSwitch?.whenReady === "function", undefined, {timeout: 30000});
        await desktopPage.evaluate(() => window.siyuanSpeedSwitch.whenReady());

        // 验证桌面端悬浮球本体已渲染
        await desktopPage.waitForSelector(".sw-fab-root, .sw-fab-trigger", {timeout: 10000});
        const hasFab = await desktopPage.evaluate(() => Boolean(document.querySelector(".sw-fab-root")));
        assert.ok(hasFab, "桌面端悬浮球 .sw-fab-root 必须正常挂载");

        // 验证呼出第一面板切换器
        await desktopPage.evaluate(() => window.siyuanSpeedSwitch.openSwitcher());
        await desktopPage.waitForSelector("input.sw__search", {timeout: 10000});
        const hasSearch = await desktopPage.evaluate(() => Boolean(document.querySelector("input.sw__search")));
        assert.ok(hasSearch, "第一面板搜索框必须正常呼出就绪");

        // B. 移动端走查：悬浮球全域触达抽屉与 5 档分类胶囊
        const mobileContext = await browser.newContext({
            viewport: {width: 390, height: 844},
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
        });
        const mobilePage = await mobileContext.newPage();
        await mobilePage.goto(mobileUrl, {waitUntil: "domcontentloaded"});

        await mobilePage.waitForFunction(() => {
            const plugins = window.siyuan?.ws?.app?.plugins;
            return Array.isArray(plugins) && plugins.some((p) => p.name === "siyuan-speed-switch");
        }, undefined, {timeout: 30000});

        await mobilePage.waitForFunction(() => typeof window.siyuanSpeedSwitch?.whenReady === "function", undefined, {timeout: 30000});
        await mobilePage.evaluate(() => window.siyuanSpeedSwitch.whenReady());

        await mobilePage.waitForSelector(".sw-fab-root, .sw-fab-trigger", {timeout: 10000});
        const trigger = mobilePage.locator(".sw-fab-trigger");
        await trigger.click();

        await mobilePage.waitForSelector(".sw__floating-ball-more", {timeout: 10000});
        const hubTabsCount = await mobilePage.evaluate(() => document.querySelectorAll(".sw__floating-ball-hub-tab").length);
        assert.equal(hubTabsCount, 5, "移动端全域触达中枢必须渲染全部/动作/页签/收藏/最近 5 档分类胶囊");

        await mobileContext.close();
    } finally {
        await browser.close();
    }
});
