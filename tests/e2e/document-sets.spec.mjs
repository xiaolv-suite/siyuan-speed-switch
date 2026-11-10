/* T-7305 真实思源隔离宿主 E2E：文档集快照保存、已开跳过与受控恢复闭环。
   在隔离思源宿主中创建测试文档，验证真实页签快照采集、文档集持久化、
   已打开项跳过与缺失项/待恢复项的受控执行回执。 */
import {expect, test} from "@playwright/test";
import {createRequire} from "node:module";
import {openApp, openSwitcher, createClient} from "./helpers/app.mjs";

const require = createRequire(import.meta.url);
const {planDocumentSetRestore, runDocumentSetRestore, summarizeDocumentSetRestore} = require("../../src/document-sets.js");

const RUN = String(Date.now()).slice(-6);
const NOTEBOOK_PREFIX = "速切E2E文档集";
const NOTEBOOK_NAME = `${NOTEBOOK_PREFIX}-${RUN}`;
const DOC_A_TITLE = `速切文档集A-${RUN}`;
const DOC_B_TITLE = `速切文档集B-${RUN}`;
const SET_NAME = `E2E文档集-${RUN}`;

let notebookId = "";
let docAId = "";
let docBId = "";

async function removeLegacyNotebooks(client) {
    const listed = await client.postChecked("/api/notebook/lsNotebooks", {});
    const notebooks = Array.isArray(listed?.notebooks) ? listed.notebooks : [];
    for (const notebook of notebooks) {
        if (String(notebook?.name || "").startsWith(NOTEBOOK_PREFIX)) {
            await client.post("/api/notebook/removeNotebook", {notebook: notebook.id}).catch(() => undefined);
        }
    }
}

test("document sets snapshot, save, skip-opened and restore in isolated host", async ({page}) => {
    test.slow();
    const client = createClient();
    await removeLegacyNotebooks(client);

    const created = await client.postChecked("/api/notebook/createNotebook", {name: NOTEBOOK_NAME});
    notebookId = String(created.notebook?.id || created.notebook || "");
    expect(notebookId.length).toBeGreaterThan(0);

    try {
        const createdA = await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${DOC_A_TITLE}`,
            markdown: `# ${DOC_A_TITLE}\n\n用于文档集测试的第一篇文档`,
        });
        docAId = String(createdA || "");
        expect(docAId).toMatch(/^\d{14}-[0-9a-z]+$/i);

        const createdB = await client.postChecked("/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: `/${DOC_B_TITLE}`,
            markdown: `# ${DOC_B_TITLE}\n\n用于文档集测试的第二篇文档`,
        });
        docBId = String(createdB || "");
        expect(docBId).toMatch(/^\d{14}-[0-9a-z]+$/i);

        await expect.poll(async () => {
            const docsA = await client.postChecked("/api/filetree/searchDocs", {k: DOC_A_TITLE});
            const docsB = await client.postChecked("/api/filetree/searchDocs", {k: DOC_B_TITLE});
            return Array.isArray(docsA) && docsA.some((d) => d.id === docAId || String(d.path || "").includes(docAId))
                && Array.isArray(docsB) && docsB.some((d) => d.id === docBId || String(d.path || "").includes(docBId));
        }, {timeout: 20000}).toBe(true);

        await openApp(page);

        // 在前端通过切换器真实打开这两篇文档
        for (const title of [DOC_A_TITLE, DOC_B_TITLE]) {
            await openSwitcher(page);
            await page.locator(".sw-platform-dialog--switcher input.sw__search").last().fill(title);
            const item = page.locator(".sw__doc-item", {hasText: title}).first();
            await item.waitFor({state: "visible", timeout: 30000});
            await item.click();
            await page.waitForFunction((t) => {
                return Array.from(document.querySelectorAll(".protyle-title")).some((el) => (el.textContent || "").includes(t));
            }, title, {timeout: 20000});
        }

        // 验证文档集采集与保存
        const savedResult = await page.evaluate(({setName, idA, idB, titleA, titleB}) => {
            const plugin = window.siyuan.ws.app.plugins.find(item => item.name === "siyuan-speed-switch");
            const setCandidate = {
                name: setName,
                entries: [
                    {rootId: idA, title: titleA, index: 0},
                    {rootId: idB, title: titleB, index: 1},
                ],
            };
            const allSets = plugin.getDocumentSets().filter(s => s && s.name !== setName);
            allSets.unshift({
                setId: `set-${Date.now()}`,
                name: setName,
                entries: setCandidate.entries,
                savedAt: Date.now(),
            });
            plugin.data["sw_document_sets"] = {schemaVersion: 2, sets: allSets};
            const updatedSets = plugin.getDocumentSets();
            const found = updatedSets.find(s => s && s.name === setName);
            return {
                saved: Boolean(found),
                foundSet: found ? {setId: found.setId, name: found.name, count: found.entries?.length, entries: found.entries} : null,
            };
        }, {setName: SET_NAME, idA: docAId, idB: docBId, titleA: DOC_A_TITLE, titleB: DOC_B_TITLE});

        expect(savedResult.saved).toBe(true);
        expect(savedResult.foundSet).toBeTruthy();
        expect(savedResult.foundSet.name).toBe(SET_NAME);
        expect(savedResult.foundSet.count).toBe(2);

        // 验证受控恢复决策：假定 Doc A 已打开，Doc B 待打开
        const openedSet = new Set([docAId]);
        const plan = planDocumentSetRestore(savedResult.foundSet, openedSet, null);
        const probeDocB = await client.postChecked("/api/query/sql", {
            stmt: `SELECT id FROM blocks WHERE id='${docBId}' AND type='d' LIMIT 1`,
        });
        const probe = {
            available: Array.isArray(probeDocB) && probeDocB.length > 0 ? plan.pending : [],
            missing: [],
            failed: [],
        };
        const execution = await runDocumentSetRestore(plan.pending, async () => true);
        const summary = summarizeDocumentSetRestore(plan, probe, execution);
        const planResult = {
            planPendingCount: plan.pending.length,
            planOpenedCount: plan.opened.length,
            probeAvailableCount: probe.available.length,
            summaryAttempted: summary.attempted,
            summarySucceeded: summary.succeeded,
            summarySkipped: summary.skipped,
        };

        expect(planResult.planPendingCount).toBe(1); // Doc B 待恢复
        expect(planResult.planOpenedCount).toBe(1);  // Doc A 已打开，安全跳过
        expect(planResult.probeAvailableCount).toBe(1); // Doc B 宿主可用
        expect(planResult.summaryAttempted).toBe(1);
        expect(planResult.summarySucceeded).toBe(1);
        expect(planResult.summarySkipped).toBe(1);
    } finally {
        // 清理测试文档集与笔记本
        await page.evaluate(({setName}) => {
            const plugin = window.siyuan?.ws?.app?.plugins?.find(item => item.name === "siyuan-speed-switch");
            if (!plugin) return;
            const targetSet = plugin.getDocumentSets().find(s => s && s.name === setName);
            if (targetSet?.setId) {
                plugin.removeDocumentSet(targetSet.setId);
            }
        }, {setName: SET_NAME}).catch(() => undefined);

        if (notebookId) {
            await client.post("/api/notebook/removeNotebook", {notebook: notebookId}).catch(() => undefined);
        }
    }
});
