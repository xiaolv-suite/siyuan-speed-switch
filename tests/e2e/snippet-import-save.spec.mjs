/* T-7307 真实思源隔离宿主 E2E：代码片段三模式导入规划与原生安全保存闭环。
   在隔离思源宿主中验证片段真实读取、新增保存、Merge/Fork 导入写回，
   以及测试后恢复原始快照确保宿主零残留。 */
import {expect, test} from "@playwright/test";
import {createRequire} from "node:module";
import {openApp, createClient} from "./helpers/app.mjs";

const require = createRequire(import.meta.url);
const {planSnippetImport} = require("../../src/snippet-import-plan.js");
const {snippetSnapshotSignature} = require("../../src/snippet-studio-model.js");

const RUN = String(Date.now()).slice(-6);
const SNIPPET_ID = `20261018120000-e2e${RUN}`;
const SNIPPET_NAME = `E2E片段-${RUN}`;

test("snippet studio: safe native mutation, 3-mode import plan and baseline restore", async ({page}) => {
    test.slow();
    await openApp(page);
    const client = createClient();

    // 1. 读取初始宿主基线快照并留存签名
    const initialRaw = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
    const initialSnippets = Array.isArray(initialRaw?.snippets) ? initialRaw.snippets : [];
    const initialSnapshot = {snippets: initialSnippets, settings: {enabledCSS: true, enabledJS: false}};
    const initialSig = snippetSnapshotSignature(initialSnapshot);

    try {
        // 2. 新增一个测试片段并真实写回宿主原生存储
        const testSnippet = {
            id: SNIPPET_ID,
            name: SNIPPET_NAME,
            type: "css",
            content: `/* E2E CSS */ .sw-e2e-test { color: var(--b3-theme-primary); }`,
            enabled: true,
        };
        const addedInput = [...initialSnippets, testSnippet];
        await client.postChecked("/api/snippet/setSnippet", {snippets: addedInput});
        const afterAddRaw = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
        const addedList = Array.isArray(afterAddRaw?.snippets) ? afterAddRaw.snippets : [];
        const hasAddedTest = addedList.some((s) => s.id === SNIPPET_ID);

        // 3a. Merge 模式：更新代码与名称，严格保留本地 enabled 状态 (true)
        const incomingUpdate = [
            {
                id: SNIPPET_ID,
                name: `${SNIPPET_NAME}-更新版`,
                type: "css",
                content: `/* E2E CSS Updated */ .sw-e2e-test { font-size: 16px; }`,
                enabled: false,
            },
            {
                id: `20261018120001-e2enew${SNIPPET_ID.slice(-4)}`,
                name: `${SNIPPET_NAME}-全新条目`,
                type: "css",
                content: `.sw-new { display: flex; }`,
                enabled: true,
            },
        ];

        const mergePlan = planSnippetImport(addedList, incomingUpdate, {mode: "merge"});
        const mergedTarget = mergePlan.list.find((s) => s.id === SNIPPET_ID);
        const mergeKeptEnabled = mergedTarget?.enabled === true;
        const mergeUpdatedContent = mergedTarget?.content.includes("font-size: 16px;");

        // 3b. Fork 模式：派生新 ID，不覆盖已有条目，且克隆项默认安全未启用 (enabled: false)
        const forkPlan = planSnippetImport(addedList, incomingUpdate, {mode: "fork"});
        const forkedClone = forkPlan.list.find((s) => s.name === `${SNIPPET_NAME}-更新版`);
        const forkGeneratedNewId = Boolean(forkedClone && forkedClone.id !== SNIPPET_ID);
        const forkDefaultDisabled = forkedClone?.enabled === false;

        // 4. 将 Merge 规划出的更新写回宿主，验证真实持久化
        await client.postChecked("/api/snippet/setSnippet", {snippets: mergePlan.list});
        const confirmedRaw = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
        const confirmedMergeSnippet = (confirmedRaw?.snippets || []).find((s) => s.id === SNIPPET_ID);

        // 5. 还原初始基线快照，保证宿主环境零污染残留
        await client.postChecked("/api/snippet/setSnippet", {snippets: initialSnippets});
        const revertedRaw = await client.postChecked("/api/snippet/getSnippet", {type: "all", enabled: 2});
        const finalSig = snippetSnapshotSignature({snippets: revertedRaw?.snippets || [], settings: {enabledCSS: true, enabledJS: false}});

        const result = {
            hasAddedTest,
            mergeAddedCount: mergePlan.addedCount,
            mergeUpdatedCount: mergePlan.updatedCount,
            mergeKeptEnabled,
            mergeUpdatedContent,
            forkGeneratedNewId,
            forkDefaultDisabled,
            confirmedMergeContent: confirmedMergeSnippet?.content,
            confirmedMergeEnabled: confirmedMergeSnippet?.enabled,
            finalRestored: finalSig === initialSig,
        };

        expect(result.hasAddedTest).toBe(true);
        expect(result.mergeAddedCount).toBe(1);
        expect(result.mergeUpdatedCount).toBe(1);
        expect(result.mergeKeptEnabled).toBe(true);
        expect(result.mergeUpdatedContent).toBe(true);
        expect(result.forkGeneratedNewId).toBe(true);
        expect(result.forkDefaultDisabled).toBe(true);
        expect(result.confirmedMergeContent).toContain("font-size: 16px;");
        expect(result.confirmedMergeEnabled).toBe(true);
        expect(result.finalRestored).toBe(true);
    } finally {
        await client.postChecked("/api/snippet/setSnippet", {snippets: initialSnippets}).catch(() => undefined);
    }
});
