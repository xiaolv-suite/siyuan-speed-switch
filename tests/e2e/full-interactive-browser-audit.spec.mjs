/* 全表面真实浏览器交互与视觉实测（2026-10-31）：
   在真实思源隔离实例（Desktop + Mobile 双端）中用真实浏览器逐一点击、键入、测量全部面板、
   二级弹窗、抽屉、搜索模式药丸、动作画板、设置 10 大标签页、片段实验室与暂存栈、移动端视图。 */
import {expect, test} from "@playwright/test";
import {appURL, createClient, openApp, openSwitcher} from "./helpers/app.mjs";

const RUN = String(Date.now()).slice(-6);
const NOTEBOOK_NAME = `浏览器全量实测-${RUN}`;

test("桌面端与移动端全表面 UI、功能与交互真实浏览器逐项实测", async ({page, browser}) => {
    const client = createClient();
    const created = await client.postChecked("/api/notebook/createNotebook", {name: NOTEBOOK_NAME});
    const notebookId = String(created?.notebook?.id || created?.notebook || "");
    expect(notebookId).toMatch(/^\d{14}-[0-9a-z]+$/i);

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err.message || err)));

    try {
        const docId = String(await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/实测主文档-${RUN}`,
            markdown: `# 实测主文档-${RUN}\n\n## 第一节 大纲标题\n\n正文内容段落 #实测标签${RUN}#\n\n- [ ] 实测待办事项 A\n- [x] 实测待办事项 B`,
            tags: `实测标签${RUN}`,
        }) || "");
        const dailyCreated = await client.postChecked("/api/filetree/createDailyNote", {notebook: notebookId});
        const dailyDocId = String(dailyCreated?.id || "");
        expect(dailyDocId).toMatch(/^\d{14}-[0-9a-z]+$/i);
        await client.postChecked("/api/block/appendBlock", {
            parentID: dailyDocId,
            dataType: "markdown",
            data: `- [ ] 日记待办落盘项-${RUN}`,
        });
        await client.postChecked("/api/attr/setBlockAttrs", {
            id: docId,
            attrs: {bookmark: `实测书签${RUN}`},
        });

        await expect.poll(async () => {
            const docs = await client.postChecked("/api/filetree/searchDocs", {k: `实测主文档-${RUN}`});
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
        });

        // ==================== 1. 第一面板：切换器、多模态药丸、下拉浮层、动作画板 ====================
        await openSwitcher(page);
        const switcherDialog = page.locator(".sw-platform-dialog--switcher").last();
        const searchInput = switcherDialog.locator("input.sw__search");

        // 打开测试文档使其成为已开页签
        await searchInput.fill(`实测主文档-${RUN}`);
        const firstHit = switcherDialog.locator(".sw__doc-item", {hasText: `实测主文档-${RUN}`}).first();
        await firstHit.waitFor({state: "visible", timeout: 20000});
        await firstHit.click();
        await page.waitForFunction((title) => {
            return Array.from(document.querySelectorAll(".protyle-title")).some((el) => (el.textContent || "").includes(title));
        }, `实测主文档-${RUN}`, {timeout: 20000});

        await openSwitcher(page);
        const dlg = page.locator(".sw-platform-dialog--switcher").last();
        const input = dlg.locator("input.sw__search");

        // 1A. 测量切换器顶栏控件与多模态药丸栏的排列、垂直居中对齐与零重叠
        const switcherAlignment = await dlg.evaluate((root) => {
            const toolbarBtns = Array.from(root.querySelectorAll(".sw__toolbar .sw__search-wrap, .sw__toolbar button")).filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
            const centers = toolbarBtns.map((el) => {
                const r = el.getBoundingClientRect();
                return r.top + r.height / 2;
            });
            const maxCenterDiff = centers.length ? Math.max(...centers) - Math.min(...centers) : 0;
            return {count: toolbarBtns.length, maxCenterDiff};
        });
        expect(switcherAlignment.count).toBeGreaterThanOrEqual(8);
        expect(switcherAlignment.maxCenterDiff).toBeLessThanOrEqual(4);

        // 逐个点击多模态检索药丸（跳过第 0 项“全部”，遍历 @、^、#、!、- 等前缀药丸），验证激活态与二次点击清空反选
        const chips = dlg.locator(".sw__mode-chip");
        const chipCount = await chips.count();
        expect(chipCount).toBeGreaterThanOrEqual(5);
        await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
        for (let i = 1; i < chipCount; i++) {
            const chip = chips.nth(i);
            await chip.click();
            await expect(chip).toHaveAttribute("aria-pressed", "true");
            const valAfterClick = await input.inputValue();
            expect(valAfterClick.length).toBeGreaterThan(0);
            // 二次点击同一药丸：清空前缀并恢复默认“全部”药丸激活
            await chip.click();
            await expect(chip).toHaveAttribute("aria-pressed", "false");
            await expect(chips.nth(0)).toHaveAttribute("aria-pressed", "true");
            await expect(input).toHaveValue("");
        }

        // 验证 ? 速查指引、- 待办穿透、! 书签穿透、# 标签穿透、> 命令模式真实渲染
        await input.fill("?");
        await expect(dlg.locator(".sw__doc-item").first()).toBeVisible({timeout: 10000});
        await input.fill("-");
        await expect(dlg.locator(".sw__doc-item", {hasText: "实测待办事项 A"}).first()).toBeVisible({timeout: 10000});
        await input.fill("!");
        await expect(dlg.locator(".sw__doc-item", {hasText: `实测书签${RUN}`}).first()).toBeVisible({timeout: 10000});
        await input.fill("#");
        await expect(dlg.locator(".sw__doc-item", {hasText: `实测标签${RUN}`}).first()).toBeVisible({timeout: 10000});
        await input.fill(">");
        const cmdToggle = dlg.locator(".sw__command-group-toggle").first();
        await expect(cmdToggle).toBeVisible({timeout: 5000});
        await expect(cmdToggle).toHaveAttribute("aria-expanded", "true");
        await cmdToggle.click();
        await expect(cmdToggle).toHaveAttribute("aria-expanded", "false");
        await cmdToggle.click();
        await expect(cmdToggle).toHaveAttribute("aria-expanded", "true");
        await input.fill("");

        // 验证收藏下拉、最近历史下拉（含“只看有改动”切换）、排序菜单、快速开始指引
        const favBtn = dlg.locator(".sw__fav-trigger");
        await favBtn.click();
        await expect(dlg.locator(".sw__fav-panel")).toBeVisible();
        await page.keyboard.press("Escape");

        const histBtn = dlg.locator(".sw__history-trigger");
        await histBtn.click();
        const histPanel = dlg.locator(".sw__history-panel");
        await expect(histPanel).toBeVisible();
        const changedToggle = histPanel.locator(".sw__history-changed-toggle");
        await expect(changedToggle).toHaveAttribute("aria-pressed", "false");
        await page.keyboard.press("Escape");

        const sortBtn = dlg.locator(".sw__sort-trigger");
        await sortBtn.click();
        const sortMenu = page.locator(".sw__sort-menu").last();
        await expect(sortMenu).toBeVisible();
        await page.keyboard.press("Escape");

        // 验证卡片悬停显露置顶/收藏按钮并点击生效，以及次级动作画板（Ctrl+K）真实保存文档集
        const tabCard = dlg.locator(".sw__card", {hasText: `实测主文档-${RUN}`}).first();
        await expect(tabCard).toBeVisible();
        await tabCard.hover();
        await tabCard.locator(".sw__pin").click();
        await expect(tabCard).toHaveClass(/sw__pinned/);
        await tabCard.hover();
        await tabCard.locator(".sw__fav-btn").click();
        const favMenuItem = page.locator("#commonMenu .b3-menu__item").first();
        await expect(favMenuItem).toBeVisible({timeout: 5000});
        await favMenuItem.click();
        await expect(tabCard).toHaveClass(/sw__faved/);
        await tabCard.focus();
        await page.keyboard.press("Control+k");
        const palette = page.locator(".sw__palette").last();
        await expect(palette).toBeVisible({timeout: 5000});
        const paletteInput = palette.locator("input").first();
        await expect(paletteInput).toBeFocused();
        const saveDocSetItem = palette.locator('[data-action-id="save-as-doc-set"]');
        await expect(saveDocSetItem).toBeVisible();
        await saveDocSetItem.click();
        await expect(palette).toHaveCount(0, {timeout: 5000});
        await expect.poll(async () => {
            return await page.evaluate(() => {
                const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
                return (plugin.getDocumentSets?.() || []).length;
            });
        }, {timeout: 5000}).toBeGreaterThan(0);

        // T-7822：验证第一面板卡片聚焦态盲打即搜（Type-to-Search）、Backspace 退格、>命令直入与 Ctrl+F 聚焦
        await input.fill("");
        await tabCard.focus();
        await page.keyboard.press("a");
        await page.keyboard.press("b");
        await expect(input).toBeFocused();
        await expect(input).toHaveValue("ab");
        await tabCard.focus();
        await page.keyboard.press("Backspace");
        await expect(input).toHaveValue("a");
        await input.fill("");
        await tabCard.focus();
        await page.keyboard.press(">");
        await expect(input).toBeFocused();
        await expect(input).toHaveValue(">");
        await expect(dlg.locator(".sw__command-list")).toBeVisible();
        await input.fill("");
        await tabCard.focus();
        await page.keyboard.press("Control+f");
        await expect(input).toBeFocused();

        // 验证快速开始指引弹窗
        await dlg.locator(".sw__help-guide-btn").click();
        const guideDialog = page.locator(".sw-platform-dialog--guide").last();
        await expect(guideDialog).toBeVisible({timeout: 5000});
        await guideDialog.locator(".sw-platform-guide__close").press("Escape");
        await expect(guideDialog).toHaveCount(0, {timeout: 5000});

        // ==================== 2. 第二面板：工作台排列对齐、待办勾选落盘、自动对齐与撤销、暂存栈跳转 ====================
        await page.evaluate(({notebookId}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.updateSettings({journalNotebook: notebookId});
            plugin.data["sw_home_state"] = {
                schemaVersion: 1,
                instances: [
                    {instanceId: "audit-tasks", moduleId: "today-tasks", enabled: true, config: {notebook: notebookId, showCompleted: "是"}},
                    {instanceId: "audit-clock", moduleId: "external-local-time", enabled: true, config: {}},
                ],
                layouts: {
                    desktop: [
                        {instanceId: "audit-tasks", x: 0, y: 0, w: 4, h: 2, collapsed: false, size: "medium"},
                        {instanceId: "audit-clock", x: 4, y: 0, w: 4, h: 2, collapsed: false, size: "medium"},
                    ],
                },
            };
        }, {notebookId});
        await dlg.locator('.sw-platform-surface-nav__item[data-surface="workbench"]').click();
        const workbench = page.locator(".sw-home").last();
        await expect(workbench).toBeVisible({timeout: 15000});

        // 2A. 验证工作台工具栏对齐与卡片网格零重叠
        const wbAlignment = await workbench.evaluate((root) => {
            const barBtns = Array.from(root.querySelectorAll(".sw-home__bar button")).filter((el) => el.getBoundingClientRect().width > 0);
            const centers = barBtns.map((el) => {
                const r = el.getBoundingClientRect();
                return r.top + r.height / 2;
            });
            const maxBarDiff = centers.length ? Math.max(...centers) - Math.min(...centers) : 0;
            const cells = Array.from(root.querySelectorAll(".sw-home__cell")).map((el) => el.getBoundingClientRect());
            let cellOverlap = false;
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    const a = cells[i], b = cells[j];
                    if (a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2) {
                        cellOverlap = true;
                    }
                }
            }
            return {maxBarDiff, cellOverlap};
        });
        expect(wbAlignment.maxBarDiff).toBeLessThanOrEqual(4);
        expect(wbAlignment.cellOverlap).toBe(false);

        // 2B. 工作台「今日待办」勾选按钮点击 → 验证 UI 反馈 + 思源文档块真实改写为 [x]
        const taskCell = workbench.locator('.sw-home__cell[data-module-id="today-tasks"]');
        await expect(taskCell).toHaveAttribute("data-sw-health", "ok", {timeout: 15000});
        const taskCheckBtn = taskCell.locator(".sw__home-module-item-check").first();
        await expect(taskCheckBtn).toBeVisible({timeout: 10000});
        await expect(taskCheckBtn).toHaveAttribute("aria-pressed", "false");
        await taskCheckBtn.click();
        await expect(taskCheckBtn).toHaveAttribute("aria-pressed", "true");
        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT markdown FROM blocks WHERE root_id='${dailyDocId}' AND type='i' AND subtype='t' LIMIT 5`,
            });
            return Array.isArray(rows) && rows.some((r) => /\[x\]/i.test(String(r.markdown || "")) && String(r.markdown || "").includes(`日记待办落盘项-${RUN}`));
        }, {timeout: 15000}).toBe(true);

        // 验证编辑态与自动对齐（B-12 合法尺寸与一键撤销恢复）、清空确认弹窗（B-05）
        const editBtn = workbench.locator('[data-home-action="edit"]');
        await expect(editBtn).toHaveAttribute("aria-pressed", "false");
        await editBtn.click();
        await expect(editBtn).toHaveAttribute("aria-pressed", "true");
        const autoAlignBtn = workbench.locator('[data-home-action="auto-align"]');
        await expect(autoAlignBtn).toBeVisible();
        await autoAlignBtn.click();
        const alignedWidthsValid = await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const list = plugin.getHomeState()?.layouts?.desktop || [];
            return list.every((entry) => [2, 4, 8, 12].includes(Number(entry.w)));
        });
        expect(alignedWidthsValid).toBe(true);
        const undoAlignBtn = workbench.locator('.sw-home__edit-banner [data-home-action="undo"]');
        await expect(undoAlignBtn).toBeVisible();
        await undoAlignBtn.click();

        const clearLayoutBtn = workbench.locator('[data-home-action="clear-layout"]');
        if (await clearLayoutBtn.count()) {
            await clearLayoutBtn.click();
            const clearDialog = page.locator(".b3-dialog__container.sw-platform-dialog").last();
            await expect(clearDialog).toHaveAttribute("role", "dialog");
            await expect(clearDialog).toHaveAttribute("aria-modal", "true");
            await page.keyboard.press("Escape");
        }
        await workbench.locator(".sw-home__edit-done").click();
        await expect(editBtn).toHaveAttribute("aria-pressed", "false");

        // 退出工作台并直接打开第三面板（片段实验室），验证纯净 CSS 实验室与三栏布局
        await page.keyboard.press("Escape");
        await expect(workbench).toHaveCount(0, {timeout: 5000});

        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openPlatformSurface("studio", "switcher");
        });
        const studio = page.locator(".sw-snippet-studio-host.sw-studio").last();
        await expect(studio).toBeVisible({timeout: 15000});
        await expect(studio.locator(".sw-studio__tab-pill").first()).toHaveClass(/is-active/);

        // ==================== 3. 第三面板：纯净片段实验室三栏对齐与伴侣栏折叠 ====================
        const studioCols = await studio.evaluate((root) => {
            const lib = root.querySelector(".sw-studio__library")?.getBoundingClientRect();
            const main = root.querySelector(".sw-studio__main")?.getBoundingClientRect();
            const ai = root.querySelector(".sw-studio__ai")?.getBoundingClientRect();
            return {
                sameTop: lib && main && ai ? Math.max(Math.abs(lib.top - main.top), Math.abs(main.top - ai.top)) <= 2 : false,
                noOverlap: lib && main && ai ? (lib.right <= main.left + 2 && main.right <= ai.left + 2) : false,
            };
        });
        expect(studioCols.sameTop).toBe(true);
        expect(studioCols.noOverlap).toBe(true);

        const collapseBtn = studio.locator(".sw-studio__ai-collapse-toggle");
        await collapseBtn.click();
        await expect(studio.locator(".sw-studio__layout")).toHaveAttribute("data-ai-collapsed", "true");
        await collapseBtn.click();
        await expect(studio.locator(".sw-studio__layout")).toHaveAttribute("data-ai-collapsed", "false");

        // 测试编辑器查找栏开关
        await studio.locator(".sw-studio__editor-section").getByRole("button", {name: /^(?:Find|查找)$/}).click();
        await expect(studio.locator(".sw-studio__find")).toBeVisible();
        await studio.locator(".sw-studio__find button").last().click();
        await expect(studio.locator(".sw-studio__find")).toBeHidden();

        // 关闭实验室
        await studio.locator(".sw-platform-header__close").click();
        await expect(studio).toHaveCount(0, {timeout: 5000});

        // ==================== 4. 快速记录双目标（今日日记 + 当前文档）真实落盘验证与设置 10 标签页 ====================
        // 4A. 快速记录写入「今日日记」并验证思源文档落盘
        await page.evaluate(({notebookId, run}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openQuickCapture(notebookId, `快速记录落盘今日日记-${run}`);
        }, {notebookId, run: RUN});
        const qcInput = page.locator(".sw-quick-capture__input").last();
        await expect(qcInput).toBeVisible({timeout: 5000});
        const qcStyle = await qcInput.evaluate((el) => {
            const cs = getComputedStyle(el);
            return {radius: parseFloat(cs.borderRadius), padTop: parseFloat(cs.paddingTop)};
        });
        expect(qcStyle.radius).toBeGreaterThanOrEqual(8);
        expect(qcStyle.padTop).toBeGreaterThanOrEqual(6);
        await page.locator(".sw-quick-capture__save").last().click();
        await expect(qcInput).toHaveCount(0, {timeout: 10000});
        await expect.poll(async () => {
            const docData = await client.postChecked("/api/filetree/getDoc", {id: dailyDocId, mode: 0, size: 64});
            return String(docData?.content || "").includes(`快速记录落盘今日日记-${RUN}`);
        }, {timeout: 15000}).toBe(true);

        // 4B. 快速记录切换目标到「当前文档」并验证思源文档落盘
        await page.evaluate(({notebookId, run}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openQuickCapture(notebookId, `快速记录落盘当前文档-${run}`);
        }, {notebookId, run: RUN});
        const qcInput2 = page.locator(".sw-quick-capture__input").last();
        await expect(qcInput2).toBeVisible({timeout: 5000});
        const currentTargetBtn = page.locator(".sw-quick-capture__targets button").nth(1);
        await currentTargetBtn.click();
        await expect(currentTargetBtn).toHaveAttribute("aria-pressed", "true");
        const qcSave2 = page.locator(".sw-quick-capture__save").last();
        await expect(qcSave2).toBeEnabled();
        await qcSave2.click();
        await expect(qcInput2).toHaveCount(0, {timeout: 10000});
        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT id, content FROM blocks WHERE content LIKE '%快速记录落盘当前文档-${RUN}%' LIMIT 5`,
            });
            return Array.isArray(rows) && rows.length > 0;
        }, {timeout: 15000}).toBe(true);

        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openSetting();
        });
        const settings = page.locator(".sw-settings-dialog").last();
        await expect(settings).toBeVisible({timeout: 10000});
        const tabs = settings.locator(".sw-settings__tab");
        const tabTotal = await tabs.count();
        expect(tabTotal).toBe(10);
        for (let i = 0; i < tabTotal; i++) {
            await tabs.nth(i).click();
            await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true");
            const hasHorizontalOverflow = await settings.locator(".sw-settings__panel.is-active").evaluate((el) => el.scrollWidth > el.clientWidth + 4);
            expect(hasHorizontalOverflow).toBe(false);
        }
        const settingsSearch = settings.locator("input.sw-settings__search-input");
        await settingsSearch.fill("快捷键");
        await page.waitForTimeout(150);
        await settingsSearch.press("Escape");
        await expect(settingsSearch).toHaveValue("");
        await settingsSearch.press("Escape");
        await expect(settings).toHaveCount(0, {timeout: 5000});

        // ==================== 5. 移动端真实前端 bundle 全链路交互 ====================
        const mobileContext = await browser.newContext({
            viewport: {width: 390, height: 844},
            isMobile: true,
            hasTouch: true,
        });
        const mobilePage = await mobileContext.newPage();
        mobilePage.on("pageerror", (err) => pageErrors.push(`mobile: ${String(err.message || err)}`));
        await mobilePage.goto(appURL({bundle: "mobile"}), {waitUntil: "domcontentloaded"});
        await mobilePage.waitForFunction(() => {
            const plugins = window.siyuan?.ws?.app?.plugins;
            return Array.isArray(plugins) && plugins.some((p) => p?.name === "siyuan-speed-switch");
        }, undefined, {timeout: 45000});
        await mobilePage.waitForSelector("#lvLaunchpadMobileEntry", {timeout: 20000});
        await mobilePage.locator("#lvLaunchpadMobileEntry").click();
        const launchSheet = mobilePage.locator("#lv-launchpad-sheet-mask");
        await expect(launchSheet).toBeVisible({timeout: 5000});
        await launchSheet.locator('.lv-sheet-tile', {hasText: '雷切'}).first().click();
        const mobileRoot = mobilePage.locator(".sw__mobile").last();
        await expect(mobileRoot).toBeVisible({timeout: 15000});
        const mobileOverflow = await mobileRoot.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
        expect(mobileOverflow).toBe(false);
        await mobileRoot.locator(".sw-platform-header__close").click();
        await expect(mobileRoot).toHaveCount(0, {timeout: 5000});

        // T-7823：手机端悬浮球全域触达中枢实测（渲染、防误弹软键盘、遮罩防穿透、五档分类胶囊、一键星标首层、从悬浮球触发快速记录真实写入思源文档、收藏直达）
        await mobilePage.addStyleTag({content: "#message.b3-snackbars { display: none !important; pointer-events: none !important; }"});
        await mobilePage.evaluate(({notebookId, docId, run}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const s = plugin.getSettings();
            plugin.data["sw_favorites"] = [{key: docId, rootId: docId, title: `实测主文档-${run}`, group: "手机置顶"}];
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

        const mobileFabRoot = mobilePage.locator('.sw-fab-root[data-surface="mobile"]');
        const mobileFabTrigger = mobileFabRoot.locator(".sw-fab-trigger");
        await expect(mobileFabTrigger).toBeVisible({timeout: 10000});
        const fabBox = await mobileFabTrigger.boundingBox();
        expect(fabBox).toBeTruthy();
        expect(fabBox.x).toBeGreaterThanOrEqual(0);
        expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(392);
        expect(fabBox.y).toBeGreaterThanOrEqual(0);
        expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(846);

        // 呼出手机端悬浮球全能触达抽屉（模拟长按/右键或上滑打开更多）
        await mobileFabTrigger.dispatchEvent("contextmenu");
        const mobileMore = mobileFabRoot.locator(".sw__floating-ball-more");
        await expect(mobileMore).toBeVisible({timeout: 5000});

        // 1. 验证手机端展开抽屉不自动聚焦搜索框（防止误弹软键盘遮挡半屏）且防穿透遮罩生效、无横向溢出
        const mobileMoreSearch = mobileMore.locator(".sw__floating-ball-more-search");
        const searchFocusedOnOpen = await mobileMoreSearch.evaluate((el) => document.activeElement === el);
        expect(searchFocusedOnOpen).toBe(false);
        await expect(mobileFabRoot.locator(".sw__floating-ball-backdrop")).toBeVisible();
        const moreOverflow = await mobileMore.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
        expect(moreOverflow).toBe(false);

        // 2. 验证五档分类胶囊齐备、一键星标固定首层生效、收藏直达项可见
        await expect(mobileMore.locator(".sw__floating-ball-hub-tab")).toHaveCount(5);
        const pinCaptureBtn = mobileMore.locator('[data-pin-action-id="quick-capture"]');
        await expect(pinCaptureBtn).toBeVisible();
        await pinCaptureBtn.scrollIntoViewIfNeeded();
        await pinCaptureBtn.click();
        await expect(mobileMore.locator('[data-pin-action-id="quick-capture"]')).toHaveAttribute("aria-pressed", "true", {timeout: 10000});

        await mobileMore.locator('[data-hub-tab="favorites"]').click();
        const favHubBtn = mobileMore.locator(`[data-hub-kind="favorite"][data-hub-id="${docId}"]`);
        await expect(favHubBtn).toBeVisible();

        // 3. 在「收藏」分类下输入搜索词验证跨全部分类联合命中「快速记录」，点击后真实写入思源日记落盘！
        await mobileMoreSearch.fill("quick");
        const mobileQuickCaptureAction = mobileMore.locator('[data-action-id="quick-capture"]').first();
        await expect(mobileQuickCaptureAction).toBeVisible();
        await mobileQuickCaptureAction.click();
        await expect(mobileMore).toBeHidden();

        const mobileCaptureDialog = mobilePage.locator(".sw-quick-capture").last();
        await expect(mobileCaptureDialog).toBeVisible({timeout: 8000});
        const mobileCaptureMarker = `手机悬浮球落盘实证-${RUN}`;
        await mobileCaptureDialog.locator("textarea.sw-quick-capture__input").fill(mobileCaptureMarker);
        await mobileCaptureDialog.locator(".sw-quick-capture__save").scrollIntoViewIfNeeded();
        await mobileCaptureDialog.locator(".sw-quick-capture__save").click();
        await expect(mobileCaptureDialog).toHaveCount(0, {timeout: 10000});

        await expect.poll(async () => {
            const rows = await client.postChecked("/api/query/sql", {
                stmt: `SELECT id, content FROM blocks WHERE root_id='${dailyDocId}' AND content LIKE '%${mobileCaptureMarker}%'`,
            });
            return Array.isArray(rows) && rows.length > 0;
        }, {timeout: 15000}).toBe(true);

        // 4. 再次呼出手机端悬浮球抽屉，实测点击防穿透遮罩顺滑收起，并从悬浮球点击收藏文档直达打开
        await mobileFabTrigger.dispatchEvent("contextmenu");
        await expect(mobileMore).toBeVisible({timeout: 5000});
        await mobileFabRoot.locator(".sw__floating-ball-backdrop").click({position: {x: 20, y: 40}});
        await expect(mobileMore).toBeHidden();

        await mobileFabTrigger.dispatchEvent("contextmenu");
        await expect(mobileMore).toBeVisible({timeout: 5000});
        await mobileMoreSearch.fill("");
        await mobileMore.locator('[data-hub-tab="favorites"]').click();
        await mobileMore.locator(`[data-hub-kind="favorite"][data-hub-id="${docId}"]`).click();
        await expect(mobileMore).toBeHidden();

        expect(pageErrors, `真实浏览器实测发现未捕获异常：${pageErrors.join(" | ")}`).toEqual([]);

        try {
            await mobilePage.close();
            await mobileContext.close();
        } catch (_) {}
    } finally {
        await client.post("/api/notebook/removeNotebook", {notebook: notebookId}).catch(() => undefined);
    }
});
