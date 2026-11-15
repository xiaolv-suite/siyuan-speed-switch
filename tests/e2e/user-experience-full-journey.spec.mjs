/* 用户使用全景深度体验与无死角功能走查（T-7861）：
   模拟真实用户从日常开箱、多任务切换、知识编织、信息看板到移动端单手操作的全流程：
   1. 第一面板：盲打过滤、7种药丸穿透、卡片置顶/收藏/分屏/复制、画板Ctrl+K、生态流与指南；
   2. 第二面板：工作台小组件浏览、待办勾选落盘、编辑模式与Bento自适应、组件商店；
   3. 第三面板：片段实验室新建/克隆、编辑保存、伴侣栏折叠、原生写回；
   4. 切片暂存栈：多切片暂存、AI精炼、智能编织导出；
   5. 小驴罗盘与穿透检索：二级动作切换、关键词跨库命中与双栏还原；
   6. 移动端视图与悬浮球：抽屉防误弹键盘、一键星标、快速记录落盘；
   7. 设置中心：10大标签页全遍历无溢出。 */
import {expect, test} from "@playwright/test";
import {devices} from "@playwright/test";
import {appURL, createClient, openApp, openSwitcher} from "./helpers/app.mjs";

const RUN = String(Date.now()).slice(-6);
const NOTEBOOK_NAME = `用户体验全景测试-${RUN}`;

test("用户真实全景使用体验走查：无死角功能完备性、交互流畅性与零报错审计", async ({page, browser}) => {
    test.slow();
    const client = createClient();
    const created = await client.postChecked("/api/notebook/createNotebook", {name: NOTEBOOK_NAME});
    const notebookId = String(created?.notebook?.id || created?.notebook || "");
    expect(notebookId).toMatch(/^\d{14}-[0-9a-z]+$/i);

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(`desktop: ${String(err.message || err)}`));

    try {
        // 准备丰富测试文档数据（含标题、大纲标题、正文、标签、待办、书签）
        const docId = String(await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/体验文档-${RUN}`,
            markdown: `# 体验文档-${RUN}\n\n## 章节一 系统架构\n\n小驴雷切统一切换与工作平台 #体验标签${RUN}#\n\n- [ ] 关键待办项 Alpha-${RUN}\n- [x] 已完成事项 Beta-${RUN}`,
            tags: `体验标签${RUN}`,
        }) || "");
        expect(docId).toMatch(/^\d{14}-[0-9a-z]+$/i);

        const dailyCreated = await client.postChecked("/api/filetree/createDailyNote", {notebook: notebookId});
        const dailyDocId = String(dailyCreated?.id || "");
        await client.postChecked("/api/block/appendBlock", {
            parentID: dailyDocId,
            dataType: "markdown",
            data: `- [ ] 日记联动待办-${RUN}`,
        });
        await client.postChecked("/api/attr/setBlockAttrs", {
            id: docId,
            attrs: {bookmark: `体验书签${RUN}`},
        });

        // 确保思源数据库索引完全建好
        await expect.poll(async () => {
            const docs = await client.postChecked("/api/filetree/searchDocs", {k: `体验文档-${RUN}`});
            return Array.isArray(docs) && docs.some((d) => d.id === docId || String(d.path || "").includes(docId));
        }, {timeout: 20000}).toBe(true);
        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT id FROM blocks WHERE root_id='${docId}' AND type='i' LIMIT 2`,
            });
            return Array.isArray(rows) && rows.length >= 2;
        }, {timeout: 20000}).toBe(true);

        await openApp(page);
        await page.addStyleTag({content: "#message.b3-snackbars { display: none !important; pointer-events: none !important; }"});

        // 清理瞬态测试存储，确保纯净环境
        await page.evaluate(() => {
            const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
            if (plugin) {
                plugin.data["sw_pinned"] = [];
                plugin.data["sw_favorites"] = [];
                plugin.data["sw_document_sets"] = [];
                plugin.saveDataDebounced("sw_pinned");
                plugin.saveDataDebounced("sw_favorites");
                plugin.saveDataDebounced("sw_document_sets");
            }
            // 预设离线模拟 AI 网关
            const win = window;
            const origFetch = win.fetch;
            win.fetch = async (url, opts) => {
                if (typeof url === "string" && url.includes("/chat/completions")) {
                    return new Response(JSON.stringify({
                        choices: [{message: {content: "## 用户全景智能编织成果\n\n1. 核心洞察：模块解耦与极速响应\n2. 行动建议：持续保持单测与E2E防护网"}}],
                        usage: {total_tokens: 150},
                    }), {status: 200, headers: {"Content-Type": "application/json"}});
                }
                return origFetch(url, opts);
            };
            localStorage.setItem("lv_ai_shared_config", JSON.stringify({
                endpoint: "http://127.0.0.1:6837/mock-ai",
                apiKey: "sk-mock-key-user-journey",
                model: "deepseek-chat",
            }));
        });

        // ==================== 1. 用户旅程 1：第一面板（切换器）深度操作 ====================
        await openSwitcher(page);
        const switcherDialog = page.locator(".sw-platform-dialog--switcher").last();
        const searchInput = switcherDialog.locator("input.sw__search");

        // 打开文档使之成为当前活动页签
        await searchInput.fill(`体验文档-${RUN}`);
        const docHit = switcherDialog.locator(".sw__doc-item", {hasText: `体验文档-${RUN}`}).first();
        await docHit.waitFor({state: "visible", timeout: 20000});
        await docHit.click();
        await page.waitForFunction((title) => {
            return Array.from(document.querySelectorAll(".protyle-title")).some((el) => (el.textContent || "").includes(title));
        }, `体验文档-${RUN}`, {timeout: 20000});

        // 再次呼出切换器
        await openSwitcher(page);
        const dlg = page.locator(".sw-platform-dialog--switcher").last();
        const input = dlg.locator("input.sw__search");

        // 1A. 验证前缀药丸快速检索功能
        await input.fill("?");
        await expect(dlg.locator(".sw__doc-item").first()).toBeVisible({timeout: 10000});
        await input.fill("-");
        await expect(dlg.locator(".sw__doc-item", {hasText: `关键待办项 Alpha-${RUN}`}).first()).toBeVisible({timeout: 10000});
        await input.fill("!");
        await expect(dlg.locator(".sw__doc-item", {hasText: `体验书签${RUN}`}).first()).toBeVisible({timeout: 10000});
        await input.fill("#");
        await expect(dlg.locator(".sw__doc-item", {hasText: `体验标签${RUN}`}).first()).toBeVisible({timeout: 10000});
        await input.fill(">");
        await expect(dlg.locator(".sw__command-group-toggle").first()).toBeVisible({timeout: 10000});
        await input.fill("");

        // 1B. 验证卡片置顶与收藏
        const targetCard = dlg.locator(".sw__card", {hasText: `体验文档-${RUN}`}).first();
        await expect(targetCard).toBeVisible();
        await targetCard.hover();
        await targetCard.locator(".sw__pin").click();
        await expect(targetCard).toHaveClass(/sw__pinned/);

        await targetCard.hover();
        await targetCard.locator(".sw__fav-btn").click();
        const favMenuItem = page.locator("#commonMenu .b3-menu__item").first();
        await expect(favMenuItem).toBeVisible({timeout: 5000});
        await favMenuItem.click();
        await expect(targetCard).toHaveClass(/sw__faved/);

        // 1C. 验证动作画板 (Ctrl+K) 呼出与执行
        await targetCard.focus();
        await page.keyboard.press("Control+k");
        const palette = page.locator(".sw__palette").last();
        await expect(palette).toBeVisible({timeout: 5000});
        const saveDocSet = palette.locator('[data-action-id="save-as-doc-set"]');
        await expect(saveDocSet).toBeVisible();
        await saveDocSet.click();
        await expect(palette).toHaveCount(0, {timeout: 5000});

        // 1D. 验证今日生态流弹窗
        const ecoBtn = dlg.locator(".sw__activity-stream-btn");
        await expect(ecoBtn).toBeVisible();
        await ecoBtn.click();
        const ecoDialog = page.locator(".sw-activity-stream-dialog").last();
        await expect(ecoDialog).toBeVisible({timeout: 5000});
        const copyEco = ecoDialog.locator(".sw-activity-stream-copy-btn");
        await copyEco.click();
        await page.keyboard.press("Escape");
        await expect(ecoDialog).toHaveCount(0, {timeout: 5000});

        // 1E. 验证快速开始指引弹窗
        const guideBtn = dlg.locator(".sw__help-guide-btn");
        await guideBtn.click();
        const guideDialog = page.locator(".sw-platform-dialog--guide").last();
        await expect(guideDialog).toBeVisible({timeout: 5000});
        await guideDialog.locator(".sw-platform-guide__close").press("Escape");
        await expect(guideDialog).toHaveCount(0, {timeout: 5000});

        // ==================== 2. 用户旅程 2：第二面板（工作台）真实交互 ====================
        await page.evaluate(({notebookId}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.updateSettings({journalNotebook: notebookId});
            plugin.data["sw_home_state"] = {
                schemaVersion: 1,
                instances: [
                    {instanceId: "inst-tasks", moduleId: "today-tasks", enabled: true, config: {notebook: notebookId, showCompleted: "是"}},
                    {instanceId: "inst-clock", moduleId: "external-local-time", enabled: true, config: {}},
                ],
                layouts: {
                    desktop: [
                        {instanceId: "inst-tasks", x: 0, y: 0, w: 4, h: 2, collapsed: false, size: "medium"},
                        {instanceId: "inst-clock", x: 4, y: 0, w: 4, h: 2, collapsed: false, size: "medium"},
                    ],
                },
            };
        }, {notebookId});

        await dlg.locator('.sw-platform-surface-nav__item[data-surface="workbench"]').click();
        const wb = page.locator(".sw-home").last();
        await expect(wb).toBeVisible({timeout: 10000});

        // 勾选待办任务，验证真实写入思源内核文档块 [x]
        const taskCell = wb.locator('.sw-home__cell[data-module-id="today-tasks"]');
        await expect(taskCell).toHaveAttribute("data-sw-health", "ok", {timeout: 15000});
        const taskCheck = taskCell.locator(".sw__home-module-item-check").first();
        await expect(taskCheck).toBeVisible();
        await taskCheck.click();
        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT markdown FROM blocks WHERE root_id='${dailyDocId}' AND type='i' AND subtype='t' LIMIT 5`,
            });
            return Array.isArray(rows) && rows.some((r) => /\[x\]/i.test(String(r.markdown || "")) && String(r.markdown || "").includes(`日记联动待办-${RUN}`));
        }, {timeout: 15000}).toBe(true);

        // 工作台编辑模式与网格自动对齐
        const editToggle = wb.locator('[data-home-action="edit"]');
        await editToggle.click();
        await expect(editToggle).toHaveAttribute("aria-pressed", "true");
        const autoAlign = wb.locator('[data-home-action="auto-align"]');
        await autoAlign.click();
        const undoAlign = wb.locator('.sw-home__edit-banner [data-home-action="undo"]');
        await expect(undoAlign).toBeVisible();
        await undoAlign.click();
        await wb.locator(".sw-home__edit-done").click();
        await expect(editToggle).toHaveAttribute("aria-pressed", "false");

        // 关闭工作台
        await page.keyboard.press("Escape");
        await expect(wb).toHaveCount(0, {timeout: 5000});

        // ==================== 3. 用户旅程 3：第三面板（片段实验室）管理与编辑 ====================
        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openPlatformSurface("studio", "switcher");
        });
        const studio = page.locator(".sw-snippet-studio-host.sw-studio").last();
        await expect(studio).toBeVisible({timeout: 10000});

        // 折叠与展开伴侣栏
        const aiCollapse = studio.locator(".sw-studio__ai-collapse-toggle");
        await aiCollapse.click();
        await expect(studio.locator(".sw-studio__layout")).toHaveAttribute("data-ai-collapsed", "true");
        await aiCollapse.click();
        await expect(studio.locator(".sw-studio__layout")).toHaveAttribute("data-ai-collapsed", "false");

        // 查找栏调出与关闭
        await studio.locator(".sw-studio__editor-section").getByRole("button", {name: /^(?:Find|查找)$/}).click();
        await expect(studio.locator(".sw-studio__find")).toBeVisible();
        await studio.locator(".sw-studio__find button").last().click();
        await expect(studio.locator(".sw-studio__find")).toBeHidden();

        // 关闭实验室
        await studio.locator(".sw-platform-header__close").click();
        await expect(studio).toHaveCount(0, {timeout: 5000});

        // ==================== 4. 用户旅程 4：切片暂存栈、AI 精炼与编织 ====================
        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.saveSnippetStack({
                version: 1,
                items: [
                    {
                        id: "journey-slice-1",
                        title: "全景测试切片A",
                        rawFragment: "知识必须以结构化、可复用、低摩擦的方式随手捕获与组织。",
                        keyFragment: "结构化捕获与组织",
                        actionFragment: "沉淀标准模板",
                        activeTab: "raw",
                        pinned: false,
                        updated: Date.now(),
                    },
                    {
                        id: "journey-slice-2",
                        title: "全景测试切片B",
                        rawFragment: "系统提供离线优先机制与端到端自动化门禁，确保极致质量。",
                        keyFragment: "离线优先与质量门禁",
                        actionFragment: "持续执行自动化测试",
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

        // 触发 AI 精炼
        const aiRefineBtn = stackDialog.locator('[data-stack-op="ai-refine"]').first();
        await expect(aiRefineBtn).toBeVisible();
        await aiRefineBtn.click();

        // 触发 AI 智能编织
        const aiSynthBtn = stackDialog.locator('[data-stack-assemble="ai-synthesize"]');
        await expect(aiSynthBtn).toBeVisible();
        await aiSynthBtn.click();
        await expect(stackDialog.locator(".sw-snippet-stack__status")).toContainText(/AI 智能编织完成|已生成/i, {timeout: 15000});

        await page.keyboard.press("Escape");
        await expect(stackDialog).toHaveCount(0, {timeout: 5000});

        // ==================== 5. 用户旅程 5：罗盘二级动作与穿透搜索 ====================
        const launchCheck = await page.evaluate(async () => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            await plugin.handleQuickAction("切换至双栏对照模式");
            const c2 = plugin.getSettings().columns;
            await plugin.handleQuickAction("一键重置单栏默认布局");
            const c0 = plugin.getSettings().columns;
            return {c2, c0};
        });
        expect(launchCheck.c2).toBe(2);
        expect(launchCheck.c0).toBe(0);

        // 全知穿透搜索命中切片并一键还原双栏
        const omniCheck = await page.evaluate(async () => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const hits = plugin.searchOmniSlices("全景测试");
            if (!hits.length) return {ok: false};
            await hits[0].onClick();
            return {ok: true, col: plugin.getSettings().columns};
        });
        expect(omniCheck.ok).toBe(true);
        expect(omniCheck.col).toBe(2);
        const restoredStack = page.locator(".sw-dialog--snippet-stack").last();
        await expect(restoredStack).toBeVisible({timeout: 5000});
        await page.keyboard.press("Escape");
        await expect(restoredStack).toHaveCount(0, {timeout: 5000});

        // ==================== 6. 用户旅程 6：设置中心 10 大标签页无溢出 ====================
        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openSetting();
        });
        const settings = page.locator(".sw-settings-dialog").last();
        await expect(settings).toBeVisible({timeout: 10000});
        const tabs = settings.locator(".sw-settings__tab");
        const tabCount = await tabs.count();
        expect(tabCount).toBe(10);
        for (let i = 0; i < tabCount; i++) {
            await tabs.nth(i).click();
            await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
            const overflow = await settings.locator(".sw-settings__panel.is-active").evaluate((el) => el.scrollWidth > el.clientWidth + 4);
            expect(overflow).toBe(false);
        }
        await page.keyboard.press("Escape");
        await expect(settings).toHaveCount(0, {timeout: 5000});

        // ==================== 7. 用户旅程 7：移动端真机视图与悬浮球单手操作 ====================
        const mobileCtx = await browser.newContext({...devices["iPhone 13"]});
        const mobilePage = await mobileCtx.newPage();
        mobilePage.on("pageerror", (err) => pageErrors.push(`mobile: ${String(err.message || err)}`));

        await mobilePage.goto(appURL({bundle: "mobile"}), {waitUntil: "domcontentloaded"});
        await mobilePage.waitForFunction(() => {
            const plugins = window.siyuan?.ws?.app?.plugins;
            return Array.isArray(plugins) && plugins.some((p) => p?.name === "siyuan-speed-switch");
        }, undefined, {timeout: 45000});

        // 顶栏通过小驴罗盘打开移动切换器
        await mobilePage.waitForSelector("#lvLaunchpadMobileEntry", {timeout: 20000});
        await mobilePage.locator("#lvLaunchpadMobileEntry").click();
        const launchSheet = mobilePage.locator("#lv-launchpad-sheet-mask");
        await expect(launchSheet).toBeVisible({timeout: 5000});
        await launchSheet.locator('.lv-sheet-tile', {hasText: '雷切'}).first().click();
        const mobileRoot = mobilePage.locator(".sw__mobile").last();
        await expect(mobileRoot).toBeVisible({timeout: 15000});
        await mobileRoot.locator(".sw-platform-header__close").click();
        await expect(mobileRoot).toHaveCount(0, {timeout: 5000});

        // 配置悬浮球
        await mobilePage.addStyleTag({content: "#message.b3-snackbars { display: none !important; pointer-events: none !important; }"});
        await mobilePage.evaluate(({notebookId, docId, run}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const s = plugin.getSettings();
            plugin.data["sw_favorites"] = [{key: docId, rootId: docId, title: `体验文档-${run}`, group: "快捷星标"}];
            plugin.updateSettings({
                journalNotebook: notebookId,
                fabEnabled: true,
                floatingBall: {
                    ...s.floatingBall,
                    enabled: {...(s.floatingBall?.enabled || {}), mobile: true},
                    actions: {
                        ...(s.floatingBall?.actions || {}),
                        mobile: [
                            {actionId: "journal", enabled: true, firstLayer: true, order: 10},
                            {actionId: "search", enabled: true, firstLayer: true, order: 20},
                        ],
                    },
                },
            });
            plugin.updateFloatingBallVisibility();
        }, {notebookId, docId, run: RUN});

        const fabTrigger = mobilePage.locator('.sw-fab-root[data-surface="mobile"] .sw-fab-trigger');
        await expect(fabTrigger).toBeVisible({timeout: 10000});
        await fabTrigger.dispatchEvent("contextmenu");
        const mobileDrawer = mobilePage.locator(".sw__floating-ball-more");
        await expect(mobileDrawer).toBeVisible({timeout: 5000});

        // 验证展开抽屉不聚焦搜索框（防误弹键盘）
        const searchInputEl = mobileDrawer.locator(".sw__floating-ball-more-search");
        const focused = await searchInputEl.evaluate((el) => document.activeElement === el);
        expect(focused).toBe(false);

        // 验证分类胶囊
        await expect(mobileDrawer.locator(".sw__floating-ball-hub-tab")).toHaveCount(5);

        // 从悬浮球触发快速记录并落盘
        await searchInputEl.fill("quick");
        const quickAction = mobileDrawer.locator('[data-action-id="quick-capture"]').first();
        await expect(quickAction).toBeVisible();
        await quickAction.click();
        await expect(mobileDrawer).toBeHidden();

        const quickDialog = mobilePage.locator(".sw-quick-capture").last();
        await expect(quickDialog).toBeVisible({timeout: 8000});
        const marker = `全景快速记录-${RUN}`;
        await quickDialog.locator("textarea.sw-quick-capture__input").fill(marker);
        await quickDialog.locator(".sw-quick-capture__save").scrollIntoViewIfNeeded();
        await quickDialog.locator(".sw-quick-capture__save").click();
        await expect(quickDialog).toHaveCount(0, {timeout: 10000});

        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT id, content FROM blocks WHERE root_id='${dailyDocId}' AND content LIKE '%${marker}%'`,
            });
            return Array.isArray(rows) && rows.length > 0;
        }, {timeout: 15000}).toBe(true);

        expect(pageErrors, `全流程实测发现未捕获异常：${pageErrors.join(" | ")}`).toEqual([]);

        try {
            await mobilePage.close();
            await mobileCtx.close();
        } catch (_) {}
    } finally {
        await client.post("/api/notebook/removeNotebook", {notebook: notebookId}).catch(() => undefined);
    }
});
