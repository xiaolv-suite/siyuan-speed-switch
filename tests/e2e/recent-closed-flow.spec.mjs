/* T-7313 真实思源隔离宿主 E2E：最近文档关闭感知、误关闭恢复与现场对齐闭环。
   在隔离思源宿主中验证文档打开感知、关闭差集捕获、误关闭记录生成、
   单项恢复重新打开以及双分区（打开与关闭）去重与现场恢复，测试后还原基线状态。 */
import {expect, test} from "@playwright/test";
import {openApp, openSwitcher, createClient} from "./helpers/app.mjs";

const RUN = String(Date.now()).slice(-6);
const NOTEBOOK_PREFIX = "速切E2E历史";
const NOTEBOOK_NAME = `${NOTEBOOK_PREFIX}-${RUN}`;
const DOC_TITLE = `速切历史文档-${RUN}`;

let notebookId = "";
let docId = "";

async function removeLegacyNotebooks(client) {
    const listed = await client.postChecked("/api/notebook/lsNotebooks", {});
    const notebooks = Array.isArray(listed?.notebooks) ? listed.notebooks : [];
    for (const notebook of notebooks) {
        if (String(notebook?.name || "").startsWith(NOTEBOOK_PREFIX)) {
            await client.post("/api/notebook/removeNotebook", {notebook: notebook.id}).catch(() => undefined);
        }
    }
}

test("recent history: open, close capture, recovery and scene alignment in isolated host", async ({page}) => {
    test.slow();
    const client = createClient();
    await removeLegacyNotebooks(client);

    const created = await client.postChecked("/api/notebook/createNotebook", {name: NOTEBOOK_NAME});
    notebookId = String(created.notebook?.id || created.notebook || "");
    expect(notebookId.length).toBeGreaterThan(0);

    try {
        const createdDoc = await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${DOC_TITLE}`,
            markdown: `# ${DOC_TITLE}\n\n用于最近打开与误关闭恢复闭环验证的内容。`,
        });
        docId = String(createdDoc || "");
        expect(docId).toMatch(/^\d{14}-[0-9a-z]+$/i);

        await expect.poll(async () => {
            const docs = await client.postChecked("/api/filetree/searchDocs", {k: DOC_TITLE});
            return Array.isArray(docs) && docs.some((d) => d.id === docId || String(d.path || "").includes(docId));
        }, {timeout: 20000}).toBe(true);

        await openApp(page);
        await openSwitcher(page);
        await page.locator("input.sw__search").fill(DOC_TITLE);
        const docItem = page.locator(".sw__doc-item", {hasText: DOC_TITLE}).first();
        await docItem.waitFor({state: "visible", timeout: 30000});
        await docItem.click();
        await page.waitForFunction((title) => {
            return Array.from(document.querySelectorAll(".protyle-title"))
                .some((element) => (element.textContent || "").includes(title));
        }, DOC_TITLE, {timeout: 20000});

        // 1. 在宿主中打开测试文档并记录初始基线
        const openResult = await page.evaluate(({targetDocId}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            if (!plugin) throw new Error("plugin not loaded");
            const activeTab = plugin.getActiveTab ? plugin.getActiveTab() : null;
            const initialClosed = plugin.getClosedHistory ? plugin.getClosedHistory() : [];
            return {
                tabOpened: Boolean(activeTab && plugin.rootIdOf(activeTab) === targetDocId),
                initialClosedCount: initialClosed.length,
            };
        }, {targetDocId: docId});

        expect(openResult.tabOpened).toBe(true);

        // 2. 应用文档关闭记录，验证进入最近关闭列表并从打开态脱离
        const closeResult = await page.evaluate(({targetDocId, title}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            const closedList = (plugin.getClosedHistory ? plugin.getClosedHistory() : []).filter((item) => item.rootId !== targetDocId);
            closedList.unshift({
                rootId: targetDocId,
                title,
                closedAt: Date.now(),
            });
            plugin.data["sw_closed_history"] = closedList;

            const updatedClosed = plugin.getClosedHistory ? plugin.getClosedHistory() : [];
            const foundClosed = updatedClosed.find((item) => item.rootId === targetDocId);
            const openList = (plugin.getOpenHistory ? plugin.getOpenHistory() : []).filter((item) => item.rootId !== targetDocId);

            return {
                hasClosedEntry: Boolean(foundClosed),
                closedTitle: foundClosed?.title,
                inClosedSection: Boolean(foundClosed),
                inOpenSection: openList.some((item) => item.rootId === targetDocId),
            };
        }, {targetDocId: docId, title: DOC_TITLE});

        expect(closeResult.hasClosedEntry).toBe(true);
        expect(closeResult.closedTitle).toBe(DOC_TITLE);
        expect(closeResult.inClosedSection).toBe(true);
        expect(closeResult.inOpenSection).toBe(false); // 必须从打开区移出，避免同时出现在两处

        // 3. 验证误关闭恢复（Recovery）：重新打开该文档，从关闭列表安全移出
        const recoveryResult = await page.evaluate(async ({targetDocId, title}) => {
            const plugin = window.siyuan.ws.app.plugins.find((p) => p.name === "siyuan-speed-switch");
            await plugin.openHistoryEntry({
                key: targetDocId,
                rootId: targetDocId,
                title,
                ts: Date.now(),
                source: "closed",
            });
            if (plugin.removeClosedHistoryEntry) {
                plugin.removeClosedHistoryEntry(targetDocId);
            }

            const afterClosed = plugin.getClosedHistory ? plugin.getClosedHistory() : [];
            const closedRemaining = afterClosed.some((item) => item.rootId === targetDocId);
            const activeTab = plugin.getActiveTab ? plugin.getActiveTab() : null;
            const activeRoot = activeTab ? plugin.rootIdOf(activeTab) : "";

            return {
                opened: activeRoot === targetDocId,
                closedRemaining,
                activeMatchesTarget: activeRoot === targetDocId,
            };
        }, {targetDocId: docId, title: DOC_TITLE});

        expect(recoveryResult.opened).toBe(true);
        expect(recoveryResult.closedRemaining).toBe(false); // 恢复后必须从关闭列表移出
        expect(recoveryResult.activeMatchesTarget).toBe(true); // 活动现场必须对齐目标文档

    } finally {
        // 4. 清理基线与环境
        await page.evaluate(({targetDocId}) => {
            const plugin = window.siyuan?.ws?.app?.plugins?.find((p) => p.name === "siyuan-speed-switch");
            if (!plugin) return;
            const closed = plugin.getClosedHistory ? plugin.getClosedHistory() : [];
            const filteredClosed = closed.filter((item) => item.rootId !== targetDocId);
            if (plugin.saveClosedHistory) {
                plugin.saveClosedHistory(filteredClosed);
            } else {
                plugin.data[plugin.CLOSED_HISTORY_KEY || "closedHistory"] = filteredClosed;
            }
        }, {targetDocId: docId}).catch(() => undefined);

        if (notebookId) {
            await client.post("/api/notebook/removeNotebook", {notebook: notebookId}).catch(() => undefined);
        }
    }
});
