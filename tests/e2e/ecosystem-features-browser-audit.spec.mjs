/* 全生态新增功能（罗盘/AI编织/穿透搜索/灾备/生态流）真实浏览器深度审计：
   在真实思源隔离实例中，逐一实测近期新增的 7 大阶段生态接入：
   1. 今日生态流（Activity Stream）弹窗渲染、汇编复制与 Escape 关闭；
   2. 小驴罗盘（Launchpad）二级动作调度（双栏、三栏、重置、暂存栈）；
   3. 切片暂存栈（Snippet Stack）AI 精炼按钮、AI 编织按钮与编织状态回执；
   4. 全知穿透搜索（Omnisearch）Provider 切片命中与一键还原双栏对照；
   5. 全生态灾备（Backup）全量配置与切片快照导出与无损恢复。 */
import {expect, test} from "@playwright/test";
import {openApp, openSwitcher} from "./helpers/app.mjs";

test("全生态新增功能真实浏览器 UI、功能与交互全方位实测", async ({page}) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));

    await openApp(page);
    await page.addStyleTag({content: "#message.b3-snackbars { display: none !important; pointer-events: none !important; }"});

    // ==================== 1. 切换器顶栏「今日生态流」弹窗渲染与交互 ====================
    await openSwitcher(page);
    const switcherDialog = page.locator(".sw-platform-dialog--switcher").last();
    const activityBtn = switcherDialog.locator(".sw__activity-stream-btn");
    await expect(activityBtn).toBeVisible({timeout: 10000});

    // 先模拟记录一条生态活动
    await page.evaluate(() => {
        const win = window;
        if (win.__LV_ACTIVITY_HUB__) {
            win.__LV_ACTIVITY_HUB__.record({
                source: "雷切",
                category: "note",
                title: "E2E测试切片知识沉淀",
            });
        }
    });

    // 点击打开今日生态流弹窗
    await activityBtn.click();
    const streamDialog = page.locator(".sw-activity-stream-dialog").last();
    await expect(streamDialog).toBeVisible({timeout: 5000});

    // 验证包含记录列表与复制按钮
    const copyBtn = streamDialog.locator(".sw-activity-stream-copy-btn");
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // 验证 Escape 安全关闭生态流弹窗
    await page.keyboard.press("Escape");
    await expect(streamDialog).toHaveCount(0, {timeout: 5000});

    // 关闭切换器
    await page.keyboard.press("Escape");
    await expect(switcherDialog).toHaveCount(0, {timeout: 5000});

    // ==================== 2. 小驴罗盘（lvLaunchpad）二级动作真实联动 ====================
    const launchpadCheck = await page.evaluate(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
        if (!plugin) throw new Error("Plugin not loaded");

        // 1. 测试切换至双栏对照模式
        await plugin.handleQuickAction("切换至双栏对照模式");
        const s1 = plugin.getSettings();

        // 2. 测试切换至三栏专注模式
        await plugin.handleQuickAction("切换至三栏专注模式");
        const s2 = plugin.getSettings();

        // 3. 测试一键重置单栏默认布局
        await plugin.handleQuickAction("一键重置单栏默认布局");
        const s3 = plugin.getSettings();

        // 4. 测试手机直办动作：搜索当前文档切片与打开栈顶切片（不抛异常且安全响应）
        await plugin.handleQuickAction("搜索当前文档切片");
        await plugin.handleQuickAction("打开暂存栈顶切片");

        return {
            col1: s1.columns,
            col2: s2.columns,
            col3: s3.columns,
        };
    });
    expect(launchpadCheck.col1).toBe(2);
    expect(launchpadCheck.col2).toBe(3);
    expect(launchpadCheck.col3).toBe(0);

    // ==================== 3. 切片暂存栈 AI 精炼与智能编织真实渲染 ====================
    // 注入模拟 AI 网关，保证离线 E2E 环境下大模型流程稳健通过
    await page.evaluate(() => {
        const win = window;
        const originalFetch = win.fetch;
        win.fetch = async (url, opts) => {
            if (typeof url === "string" && url.includes("/chat/completions")) {
                return new Response(JSON.stringify({
                    choices: [{message: {content: "## 编织专题论述结果\n\n- 核心观点1：高内聚低耦合\n- 核心观点2：本地弹性灾备"}}],
                    usage: {total_tokens: 120},
                }), {status: 200, headers: {"Content-Type": "application/json"}});
            }
            return originalFetch(url, opts);
        };
        const plugin = win.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
        localStorage.setItem("lv_ai_shared_config", JSON.stringify({
            endpoint: "http://127.0.0.1:6837/mock-ai",
            apiKey: "sk-mock-key-for-e2e",
            model: "deepseek-chat",
        }));
        localStorage.setItem("__lv_ai_config__", JSON.stringify({
            endpoint: "http://127.0.0.1:6837/mock-ai",
            apiKey: "sk-mock-key-for-e2e",
            model: "deepseek-chat",
        }));
        if (win.__LV_AI_GATEWAY__) {
            win.__LV_AI_GATEWAY__.setConfig({
                endpoint: "http://127.0.0.1:6837/mock-ai",
                apiKey: "sk-mock-key-for-e2e",
                model: "deepseek-chat",
            });
        }
        plugin.saveSnippetStack({
            version: 1,
            items: [
                {
                    id: "test-slice-1",
                    title: "架构设计核心原则",
                    rawFragment: "系统需要具备高内聚低耦合的模块划分，各模块通过统一契约交互。",
                    keyFragment: "高内聚低耦合，统一契约",
                    actionFragment: "定义清晰模块接口边界",
                    activeTab: "raw",
                    pinned: false,
                    updated: Date.now(),
                },
                {
                    id: "test-slice-2",
                    title: "容灾与弹性设计",
                    rawFragment: "工作区故障时能够从本地快照完整还原，保障离线可用性。",
                    keyFragment: "本地快照还原，离线可用",
                    actionFragment: "建立灾备与快照机制",
                    activeTab: "raw",
                    pinned: true,
                    updated: Date.now(),
                },
            ],
        });
        plugin.openSnippetStackDialog();
    });

    const stackDialog = page.locator(".sw-dialog--snippet-stack").last();
    await expect(stackDialog).toBeVisible({timeout: 10000});

    // 验证切片卡片上 AI 精炼按钮存在且可见
    const aiRefineBtn = stackDialog.locator('[data-stack-op="ai-refine"]').first();
    await expect(aiRefineBtn).toBeVisible({timeout: 5000});

    // 验证底部操作栏包含「AI 智能编织」按钮
    const aiSynthesizeBtn = stackDialog.locator('[data-stack-assemble="ai-synthesize"]');
    await expect(aiSynthesizeBtn).toBeVisible({timeout: 5000});

    // 点击 AI 智能编织按钮，验证编织完成提示
    await aiSynthesizeBtn.click();
    const stackStatus = stackDialog.locator(".sw-snippet-stack__status");
    await expect(stackStatus).toContainText(/AI 智能编织完成|已生成/i, {timeout: 15000});

    // 关闭暂存栈
    await page.keyboard.press("Escape");
    await expect(stackDialog).toHaveCount(0, {timeout: 5000});

    // ==================== 4. 全知穿透搜索（lvOmnisearch）切片检索与一键还原双栏 ====================
    const omniResult = await page.evaluate(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
        // 搜索切片关键词
        const results = plugin.searchOmniSlices("架构设计");
        if (!results.length) return {found: false};

        // 触发命中项的 onClick：一键还原双栏并打开暂存栈
        await results[0].onClick();
        const settings = plugin.getSettings();
        return {
            found: true,
            title: results[0].title,
            columns: settings.columns,
        };
    });
    expect(omniResult.found).toBe(true);
    expect(omniResult.title).toBe("架构设计核心原则");
    expect(omniResult.columns).toBe(2);

    // 验证暂存栈已被一键打开
    const restoredStack = page.locator(".sw-dialog--snippet-stack").last();
    await expect(restoredStack).toBeVisible({timeout: 5000});
    await page.keyboard.press("Escape");
    await expect(restoredStack).toHaveCount(0, {timeout: 5000});

    // ==================== 5. 全生态灾备（lvBackup）快照导出与写回 ====================
    const backupCheck = await page.evaluate(async () => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
        // 1. 导出全量快照
        const dumped = await plugin.dumpData();
        const hasStack = Array.isArray(dumped.snippetStack?.items) && dumped.snippetStack.items.length >= 2;

        // 2. 模拟修改配置
        plugin.updateSettings({columns: 99});

        // 3. 恢复快照
        const restoredOk = await plugin.restoreData(dumped);
        const restoredSettings = plugin.getSettings();

        return {
            hasStack,
            restoredOk,
            restoredColumns: restoredSettings.columns,
        };
    });
    expect(backupCheck.hasStack).toBe(true);
    expect(backupCheck.restoredOk).toBe(true);
    expect(backupCheck.restoredColumns).toBe(2);

    expect(pageErrors, `真实浏览器实测发现未捕获异常：${pageErrors.join(" | ")}`).toEqual([]);
});
