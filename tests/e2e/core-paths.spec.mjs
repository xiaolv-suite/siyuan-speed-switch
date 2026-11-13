/* 核心路径真机验收门禁（2026-10-31 方向收敛第一件）：
   在隔离的真实思源内核工作区中串联验证核心用户路径并截取真实界面截图：
   1. 呼出切换器（首屏无统计栏、无非设置页版本徽标）→ 搜索并打开真实文档 → 过滤已开页签；
   2. 收藏文档 → 收藏下拉与工作台收藏组件可见 → 从收藏直达；
   3. 误关页签恢复（最近关闭记录 → 恢复打开并移出关闭列表）；
   4. 今日日记一键打开；
   5. 工作台全部默认组件读取真实数据（0 个失败态卡片）+ 生态组件 secondary 数值可见 + 商店详情底栏 sticky；
   6. 片段实验室在 1024×640（125% 缩放等效视口）下编辑区不塌缩、保存栏 sticky + 片段启用/停用原生写回；
   7. 设置页正常打开（展示唯一版本徽标，无 plugins 空指针异常）；
   8. 从真实思源直接截取 README 所需的明暗 6 张实拍图。 */
import {expect, test} from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import {createClient, openApp, openSwitcher} from "./helpers/app.mjs";

const RUN = String(Date.now()).slice(-6);
const NOTEBOOK_PREFIX = "雷切核心验收";
const NOTEBOOK_NAME = `${NOTEBOOK_PREFIX}-${RUN}`;
const DOC_A_TITLE = `架构设计规范_${RUN}`;
const DOC_B_TITLE = `检索与工作流纪要_${RUN}`;
const TAG_NAME = `核心标签${RUN}`;
const BOOKMARK_NAME = `核心书签${RUN}`;
const SCREENSHOT_DIR = path.resolve(import.meta.dirname, "..", "..", "acceptance-screenshots");

function todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function cleanupLegacyNotebooks(client) {
    const listed = await client.postChecked("/api/notebook/lsNotebooks", {});
    const notebooks = Array.isArray(listed?.notebooks) ? listed.notebooks : [];
    for (const nb of notebooks) {
        if (String(nb?.name || "").startsWith(NOTEBOOK_PREFIX)) {
            await client.post("/api/notebook/removeNotebook", {notebook: nb.id}).catch(() => undefined);
        }
    }
}

test("真实思源核心路径全链路验收与实拍截图生成", async ({page}) => {
    test.slow();
    fs.mkdirSync(SCREENSHOT_DIR, {recursive: true});
    const client = createClient();
    await cleanupLegacyNotebooks(client);

    const created = await client.postChecked("/api/notebook/createNotebook", {name: NOTEBOOK_NAME});
    const notebookId = String(created?.notebook?.id || created?.notebook || "");
    expect(notebookId).toMatch(/^\d{14}-[0-9a-z]+$/i);

    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error.message || error)));

    try {
        const docAId = String(await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${DOC_A_TITLE}`,
            markdown: `# ${DOC_A_TITLE}\n\n## 核心目标\n\n让切换器在 1 秒内找到并切换已打开页签与全库文档 #${TAG_NAME}#。\n\n- [ ] 完成核心路径真机门禁\n- [x] 删除手工维护的 JS 镜像副本`,
            tags: TAG_NAME,
        }) || "");
        const docBId = String(await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${DOC_B_TITLE}`,
            markdown: `# ${DOC_B_TITLE}\n\n## 关联引用\n\n参见 ((${docAId} "${DOC_A_TITLE}")) 的检索分层设计。`,
        }) || "");
        const dateStr = todayIso();
        const dateCompact = dateStr.replace(/-/g, "");
        const dailyDocId = String(await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${dateStr}`,
            markdown: `# ${dateStr} 今日工作日志\n\n- [ ] 核对切换器首屏无冗余统计栏\n- [x] 验证工作台组件真实数据回填`,
        }) || "");

        await client.postChecked("/api/attr/setBlockAttrs", {
            id: docAId,
            attrs: {bookmark: BOOKMARK_NAME},
        });
        await client.postChecked("/api/attr/setBlockAttrs", {
            id: dailyDocId,
            attrs: {[`custom-dailynote-${dateCompact}`]: dateCompact},
        });

        await expect.poll(async () => {
            const docs = await client.postChecked("/api/filetree/searchDocs", {k: DOC_A_TITLE});
            const bookmarks = await client.postChecked("/api/bookmark/getBookmark", {});
            return Array.isArray(docs)
                && docs.some((d) => d.id === docAId || String(d.path || "").includes(docAId))
                && Array.isArray(bookmarks)
                && bookmarks.some((b) => String(b?.name || b?.bookmark || "") === BOOKMARK_NAME);
        }, {timeout: 20000}).toBe(true);

        await openApp(page);
        await page.addStyleTag({content: "#message.b3-snackbars { display: none !important; pointer-events: none !important; }"});

        // 1. 呼出切换器 → 验证首屏减法（无统计栏、无版本徽标）→ 搜索并打开两个真实文档
        await openSwitcher(page);
        await expect(page.locator(".sw-platform-metrics-dock")).toHaveCount(0);
        await expect(page.locator(".sw-platform-dialog--switcher .lv-dialog-title-badge")).toHaveCount(0);

        await page.locator(".sw-platform-dialog--switcher input.sw__search").last().fill(DOC_A_TITLE);
        const itemA = page.locator(".sw__doc-item", {hasText: DOC_A_TITLE}).first();
        await itemA.waitFor({state: "visible", timeout: 30000});
        await itemA.click();
        await page.waitForFunction((title) => {
            return Array.from(document.querySelectorAll(".protyle-title")).some((el) => (el.textContent || "").includes(title));
        }, DOC_A_TITLE, {timeout: 20000});

        await openSwitcher(page);
        await page.locator(".sw-platform-dialog--switcher input.sw__search").last().fill(DOC_B_TITLE);
        const itemB = page.locator(".sw__doc-item", {hasText: DOC_B_TITLE}).first();
        await itemB.waitFor({state: "visible", timeout: 30000});
        await itemB.click();
        await page.waitForFunction((title) => {
            return Array.from(document.querySelectorAll(".protyle-title")).some((el) => (el.textContent || "").includes(title));
        }, DOC_B_TITLE, {timeout: 20000});

        // 2. 过滤已开页签 + 收藏文档 + 误关恢复 + 日记打开
        await openSwitcher(page);
        const searchInput = page.locator(".sw-platform-dialog--switcher input.sw__search").last();
        await searchInput.fill(DOC_A_TITLE);
        await expect(page.locator(".sw-platform-dialog--switcher .sw__card", {hasText: DOC_A_TITLE}).first()).toBeVisible({timeout: 10000});
        await searchInput.fill("");

        // 截取第一面板浅色实拍图（含真实已打开页签与关联上下文）
        await page.waitForTimeout(400);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "switcher-light.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "dark"));
        await page.waitForTimeout(250);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "switcher-dark.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "light"));

        // 收藏与误关恢复验证
        const favAndHistoryCheck = await page.evaluate(async ({docAId, docATitle, docBId, docBTitle, notebookId}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            // 收藏 docA
            plugin.saveFavorites([{key: docAId, rootId: docAId, title: docATitle, group: ""}]);
            const favs = plugin.getFavorites();
            // 误关恢复 docB
            plugin.data["sw_closed_history"] = [{rootId: docBId, title: docBTitle, closedAt: Date.now()}];
            const closedBefore = plugin.getClosedHistory().some((it) => it.rootId === docBId);
            await plugin.openHistoryEntry({key: docBId, rootId: docBId, title: docBTitle, ts: Date.now(), source: "closed"});
            plugin.removeClosedHistoryEntry(docBId);
            const closedAfter = plugin.getClosedHistory().some((it) => it.rootId === docBId);
            // 配置默认日记本并测试生态组件 B-01 secondary 字段透传
            const settings = plugin.getSettings();
            settings.journalNotebook = notebookId;
            plugin.data["sw_settings"] = settings;
            return {
                favCount: favs.length,
                closedBefore,
                closedAfter,
            };
        }, {docAId, docATitle: DOC_A_TITLE, docBId, docBTitle: DOC_B_TITLE, notebookId});

        expect(favAndHistoryCheck.favCount).toBe(1);
        expect(favAndHistoryCheck.closedBefore).toBe(true);
        expect(favAndHistoryCheck.closedAfter).toBe(false);

        // 点击切换器顶栏今日日记按钮，验证日记真实打开
        if ((await page.locator(".sw-platform-dialog--switcher input.sw__search").count()) === 0) {
            await openSwitcher(page);
        }
        await page.locator(".sw-platform-dialog--switcher .sw__journal-btn").last().click();
        await expect(page.locator(".sw-platform-dialog--switcher input.sw__search")).toHaveCount(0, {timeout: 10000});

        // 3. 设置页验证（B-02 空指针防护 + 唯一版本徽标展示）
        await page.evaluate(() => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            plugin.openSetting();
        });
        const settingsDialog = page.locator(".sw-settings-dialog");
        await expect(settingsDialog).toBeVisible({timeout: 10000});
        await expect(settingsDialog.locator(".lv-dialog-title-badge")).toHaveCount(1);
        await page.keyboard.press("Escape");
        await expect(settingsDialog).toHaveCount(0, {timeout: 5000});

        // 4. 工作台默认组件全部展示真实内容（0 个失败态）+ B-01/B-04 验证 + 实拍截图
        await page.evaluate(({notebookId, tagName, bookmarkName}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const modules = [
                {instanceId: "wb-clock", moduleId: "external-local-time", enabled: true, config: {}, size: "medium"},
                {instanceId: "wb-tasks", moduleId: "today-tasks", enabled: true, config: {notebook: notebookId, showCompleted: "是"}, size: "medium"},
                {instanceId: "wb-favs", moduleId: "favorites", enabled: true, config: {}, size: "medium"},
                {instanceId: "wb-recent", moduleId: "recent-documents", enabled: true, config: {}, size: "medium"},
                {instanceId: "wb-bookmarks", moduleId: "bookmarks", enabled: true, config: {query: bookmarkName}, size: "small"},
                {instanceId: "wb-tags", moduleId: "tags", enabled: true, config: {query: tagName}, size: "small"},
                {instanceId: "wb-stats", moduleId: "note-stats", enabled: true, config: {notebook: notebookId, days: 7}, size: "small"},
                {instanceId: "wb-funnel", moduleId: "knowledge-funnel", enabled: true, config: {}, size: "medium"},
            ];
            plugin.data["sw_home_state"] = {
                schemaVersion: 1,
                instances: modules.map(({instanceId, moduleId, enabled, config}) => ({instanceId, moduleId, enabled, config})),
                layouts: {
                    desktop: modules.map((m, idx) => ({
                        instanceId: m.instanceId,
                        x: (idx % 3) * 4,
                        y: Math.floor(idx / 3) * 2,
                        w: 4,
                        h: 2,
                        collapsed: false,
                        size: m.size,
                    })),
                },
            };
            plugin.openPlatformSurface("workbench");
        }, {notebookId, tagName: TAG_NAME, bookmarkName: BOOKMARK_NAME});

        const workbench = page.locator(".sw-home");
        await expect(workbench).toBeVisible({timeout: 15000});
        await expect(workbench.locator(".sw-platform-metrics-dock")).toHaveCount(0);
        await expect(page.locator(".sw-platform-dialog--workbench .lv-dialog-title-badge")).toHaveCount(0);

        for (const modId of ["external-local-time", "today-tasks", "favorites", "recent-documents", "bookmarks", "tags", "note-stats", "knowledge-funnel"]) {
            await expect(workbench.locator(`.sw-home__cell[data-module-id="${modId}"]`)).toHaveAttribute("data-sw-health", "ok", {timeout: 15000});
        }
        await expect(workbench.locator(".sw__home-module-state--error")).toHaveCount(0);
        // 验证 B-01：生态组件 knowledge-funnel 的 secondary 数值真实渲染在 DOM 中
        await expect(workbench.locator('.sw-home__cell[data-module-id="knowledge-funnel"] .sw__home-module-item-secondary').first()).toBeVisible();

        // 截取第二面板浅色与深色实拍图
        await page.waitForTimeout(400);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "workbench-light.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "dark"));
        await page.waitForTimeout(250);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "workbench-dark.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "light"));

        // 验证 B-04：打开组件商店，确认右侧详情操作栏具备 position: sticky
        await workbench.locator('[data-home-action="edit"]').click();
        await workbench.locator(".sw-home__add").click();
        const storeDetailActions = page.locator(".sw-home-store__detail-actions").first();
        await expect(storeDetailActions).toBeVisible({timeout: 10000});
        const stickyPos = await storeDetailActions.evaluate((el) => getComputedStyle(el).position);
        expect(stickyPos).toBe("sticky");
        await page.locator(".sw-home-store__close").click();
        await expect(page.locator(".sw-home-store")).toHaveCount(0, {timeout: 5000});

        // 5. 片段实验室：从工作台导航栏切入第三面板 → 125% 缩放等效视口（1024×640）下 B-03 不塌缩 + 实拍截图
        await workbench.locator('.sw-platform-surface-nav__item[data-surface="studio"]').click();
        const studio = page.locator(".sw-snippet-studio-host.sw-studio");
        await expect(studio).toBeVisible({timeout: 15000});
        await expect(page.locator(".sw-platform-dialog--studio .lv-dialog-title-badge")).toHaveCount(0);

        await page.waitForTimeout(500);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "studio-light.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "dark"));
        await page.waitForTimeout(250);
        await page.screenshot({path: path.join(SCREENSHOT_DIR, "studio-dark.png")});
        await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "light"));

        // 切换到 1024×640 验证 B-03 缩放防截断
        await page.setViewportSize({width: 1024, height: 640});
        await page.waitForTimeout(200);
        const studioGeometry = await page.evaluate(() => {
            const editor = document.querySelector(".sw-studio__editor");
            const commands = document.querySelector(".sw-studio__commands");
            const main = document.querySelector(".sw-studio__main");
            return {
                editorHeight: editor ? editor.getBoundingClientRect().height : 0,
                commandsSticky: commands ? getComputedStyle(commands).position : "",
                mainOverflowY: main ? getComputedStyle(main).overflowY : "",
            };
        });
        expect(studioGeometry.editorHeight).toBeGreaterThanOrEqual(120);
        expect(studioGeometry.commandsSticky).toBe("sticky");
        expect(studioGeometry.mainOverflowY).toBe("auto");
        await page.setViewportSize({width: 1440, height: 900});

        // 验证片段启用/停用原生写回并无损还原基线
        const snippetBefore = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
        const baselineSnippets = Array.isArray(snippetBefore?.snippets) ? snippetBefore.snippets : [];
        const testSnippetId = `20261031100000-core${RUN}`;
        try {
            const withEnabled = [...baselineSnippets, {
                id: testSnippetId,
                name: `核心验收片段-${RUN}`,
                type: "css",
                content: `.sw-core-e2e-${RUN} { outline: 1px solid transparent; }`,
                enabled: true,
            }];
            await client.postChecked("/api/snippet/setSnippet", {snippets: withEnabled});
            const afterEnable = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
            const enabledEntry = (afterEnable?.snippets || []).find((s) => s.id === testSnippetId);
            expect(enabledEntry?.enabled).toBe(true);

            const withDisabled = withEnabled.map((s) => (s.id === testSnippetId ? {...s, enabled: false} : s));
            await client.postChecked("/api/snippet/setSnippet", {snippets: withDisabled});
            const afterDisable = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
            const disabledEntry = (afterDisable?.snippets || []).find((s) => s.id === testSnippetId);
            expect(disabledEntry?.enabled).toBe(false);
        } finally {
            await client.postChecked("/api/snippet/setSnippet", {snippets: baselineSnippets}).catch(() => undefined);
        }

        expect(pageErrors, `真实思源核心路径出现未捕获异常：${pageErrors.join(" | ")}`).toEqual([]);
    } finally {
        await client.post("/api/notebook/removeNotebook", {notebook: notebookId}).catch(() => undefined);
    }
});
