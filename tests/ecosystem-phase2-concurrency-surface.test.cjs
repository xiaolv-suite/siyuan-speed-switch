const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("withDocLock 并发写锁：同一 docId 互斥串行执行，释放后队列自动继续", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;

    // 清理全局锁
    delete dom.window.__LV_DOC_LOCKS__;

    const {withDocLock} = require("../src/libs/lv-notice-kit.ts");

    const order = [];
    const runTask = (id, delay) => withDocLock("doc-1", async () => {
        order.push(`start-${id}`);
        await new Promise(r => setTimeout(r, delay));
        order.push(`end-${id}`);
        return id;
    });

    // 并发触发两个对同一文档的写操作
    const p1 = runTask(1, 40);
    const p2 = runTask(2, 10);

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, 1);
    assert.equal(r2, 2);

    // 必须严格串行：1 完成后 2 才能开始
    assert.deepEqual(order, ["start-1", "end-1", "start-2", "end-2"], "同一文档写入必须严格排队串行");

    delete global.window;
    dom.window.close();
});

test("withDocLock 并发写锁：异常发生时锁自动安全释放，不阻塞后续写操作", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_DOC_LOCKS__;

    const {withDocLock} = require("../src/libs/lv-notice-kit.ts");

    let secondExecuted = false;
    const taskFail = withDocLock("doc-error", async () => {
        throw new Error("kernel-lock-simulate");
    }).catch(() => "handled");

    const taskNext = withDocLock("doc-error", async () => {
        secondExecuted = true;
        return "success";
    });

    await taskFail;
    const res = await taskNext;
    assert.equal(secondExecuted, true, "异常任务完成后，后续排队任务必须顺利执行");
    assert.equal(res, "success");

    delete global.window;
    dom.window.close();
});

test("lvSurfaceStack 统一 Esc 浮层栈：捕获阶段仲裁且仅关闭栈顶，绝不穿透至底座", () => {
    const dom = new JSDOM("<!doctype html><html><body><div id='editor'></div></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_SURFACE_STACK__;

    const {lvSurfaceStack} = require("../src/libs/lv-notice-kit.ts");

    let bottomEditorReceivedEsc = false;
    dom.window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") bottomEditorReceivedEsc = true;
    });

    let closedMenu = false;
    let closedDrawer = false;

    // 压入菜单与暂存抽屉（抽屉在栈顶）
    const popMenu = lvSurfaceStack.push({
        id: "raikiri-menu",
        dismiss: () => { closedMenu = true; return true; }
    });
    const popDrawer = lvSurfaceStack.push({
        id: "raikiri-snippet-stack",
        dismiss: () => { closedDrawer = true; return true; }
    });

    // 触发第 1 次 Esc
    const esc1 = new dom.window.KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true});
    dom.window.dispatchEvent(esc1);

    // 此时栈顶是抽屉，只应关闭抽屉
    assert.equal(closedDrawer, true, "第 1 次 Esc 必须关闭栈顶抽屉");
    assert.equal(closedMenu, false, "次级菜单仍保留在栈内不应关闭");
    assert.equal(bottomEditorReceivedEsc, false, "底层编辑区绝不可收到穿透的 Esc");

    // 触发第 2 次 Esc
    const esc2 = new dom.window.KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true});
    dom.window.dispatchEvent(esc2);

    assert.equal(closedMenu, true, "第 2 次 Esc 必须关闭菜单");
    assert.equal(bottomEditorReceivedEsc, false, "底层编辑区仍不可收到穿透的 Esc");

    popMenu();
    popDrawer();

    delete global.window;
    dom.window.close();
});

test("T-Phase2 源码契约验证：assembleSnippetStackToDoc 必须接入 withDocLock 保护", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));

    assert.match(
        indexSource,
        /withDocLock\s*\(\s*fallbackRootId\s*,\s*async\s*\(\s*\)\s*=>/,
        "assembleSnippetStackToDoc 当前文档写入必须包裹 withDocLock",
    );
    assert.match(
        indexSource,
        /withDocLock\s*\(\s*docId\s*,\s*async\s*\(\s*\)\s*=>/,
        "assembleSnippetStackToDoc 今日日记写入必须包裹 withDocLock",
    );
    assert.match(
        indexSource,
        /lvSurfaceStack\.push\s*\(\s*\{\s*id:\s*["']raikiri-snippet-stack["']/,
        "切片暂存抽屉必须压入 lvSurfaceStack",
    );
});

test("T-Phase2 门禁负向验证：未加锁并发写必定发生时序交叉", async () => {
    const order = [];
    const directTask = async (id, delay) => {
        order.push(`start-${id}`);
        await new Promise(r => setTimeout(r, delay));
        order.push(`end-${id}`);
    };

    await Promise.all([directTask(1, 30), directTask(2, 10)]);

    // 无锁时任务 2 会在任务 1 结束前完成，发生交叉
    assert.deepEqual(order, ["start-1", "start-2", "end-2", "end-1"], "无锁并发必然交叉破坏内核原子性");
});
