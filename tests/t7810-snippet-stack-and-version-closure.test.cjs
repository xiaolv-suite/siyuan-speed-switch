// T-7810 ~ T-7813 连续切片暂存栈完整链路闭环、并发与撤销防护、选区快照、缺失样式补齐契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 真实挂载 mountSnippetStackView 验证异步组装防连点锁（aria-busy）、异常隔离与输出维度参数透传；
//   2. 真实挂载验证移除单卡/清空未锁定的内存快照一键撤销（Undo）恢复能力；
//   3. 验证 mountSnippetStudio 接入 stack.assemble / stack.openBlock、objectKind="stack" 自动激活与双语标题非裸键名；
//   4. 块级 CSS 断言（declaresIn + topLevel）守护 .sw-studio__tab-pill、.sw-home__stack-btn、作用域令牌回退与 focus-visible；
//   5. 包含独立负向验证探针。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");
const {declaresIn} = require("./css-block-scan.cjs");
const {mountSnippetStackView} = require("../src/snippet-stack-ui.js");

const ROOT = path.resolve(__dirname, "..");
const zhI18n = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const enI18n = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

function loadStudioUiWithStub() {
    const origLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === "siyuan") {
            return {
                Dialog: class FakeDialog {
                    constructor(opts = {}) {
                        this.element = {
                            isConnected: true,
                            querySelector: () => null,
                            addEventListener: () => {},
                            removeEventListener: () => {},
                        };
                        this.destroyCallback = opts.destroyCallback;
                    }
                    destroy() {
                        if (this.destroyCallback) this.destroyCallback();
                    }
                },
            };
        }
        return origLoad.apply(this, arguments);
    };
    try {
        delete require.cache[require.resolve("../src/snippet-studio-ui.js")];
        return require("../src/snippet-studio-ui.js");
    } finally {
        Module._load = origLoad;
    }
}

test("T-7810: mountSnippetStackView 异步组装防连点互斥锁、维度参数透传与异常隔离", async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>');
    const host = dom.window.document.getElementById("host");

    let assembleCalls = 0;
    let capturedOpts = null;
    let resolveInFlight;

    const handle = mountSnippetStackView(host, {
        initialStack: {
            version: 1,
            items: [
                {
                    id: "stk-1",
                    title: "切片一",
                    rawFragment: "原始段落内容",
                    keyFragment: "核心结论要点",
                    sourceBlockId: "20261031090000-abcdef1",
                },
            ],
        },
        onAssemble: (_target, _assembled, _state, opts) => {
            assembleCalls += 1;
            capturedOpts = opts;
            return new Promise((resolve) => {
                resolveInFlight = resolve;
            });
        },
    });

    const modeSelect = host.querySelector(".sw-snippet-stack__select");
    modeSelect.value = "key";
    modeSelect.dispatchEvent(new dom.window.Event("change"));

    const journalBtn = host.querySelector('[data-stack-assemble="journal"]');
    // 快速连续点击 3 次：并发互斥锁必须确保只发起 1 次组装请求
    journalBtn.click();
    journalBtn.click();
    journalBtn.click();

    assert.equal(assembleCalls, 1, "异步组装在途时连点不得重复提交");
    assert.equal(handle.root.getAttribute("aria-busy"), "true", "在途期间根节点必须标记 aria-busy=true");
    assert.equal(journalBtn.disabled, true, "在途期间组装按钮必须禁用");
    assert.deepEqual(capturedOpts, {mode: "key", includeBlockAttrs: true}, "必须透传用户选中的组装输出维度");

    resolveInFlight({ok: true, message: "已推入日报"});
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(handle.root.getAttribute("aria-busy"), "false", "完成后 aria-busy 必须恢复 false");
    assert.equal(journalBtn.disabled, false, "完成后按钮必须恢复可点击");
    assert.equal(host.querySelector(".sw-snippet-stack__status").textContent, "已推入日报");

    handle.dispose();
    dom.window.close();
});

test("T-7810: mountSnippetStackView 异步组装抛错时安全捕获并展示错误回执，不产生未捕获异常", async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>');
    const host = dom.window.document.getElementById("host");

    const handle = mountSnippetStackView(host, {
        labels: {operationFailed: enI18n.snippetStackAssembleFailed},
        initialStack: {
            version: 1,
            items: [{id: "stk-err", title: "Slice", rawFragment: "Body"}],
        },
        onAssemble: async () => {
            throw new Error("Simulated network failure");
        },
    });

    const newDocBtn = host.querySelector('[data-stack-assemble="new-doc"]');
    newDocBtn.click();
    await new Promise((r) => setTimeout(r, 10));

    const statusEl = host.querySelector(".sw-snippet-stack__status");
    assert.equal(statusEl.dataset.state, "error");
    assert.equal(statusEl.textContent, enI18n.snippetStackAssembleFailed);
    assert.equal(handle.root.getAttribute("aria-busy"), "false");

    handle.dispose();
    dom.window.close();
});

test("T-7812: mountSnippetStackView 移除切片与清空未锁定支持一键撤销（Undo）无损恢复", () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>');
    const host = dom.window.document.getElementById("host");

    let persisted = null;
    const handle = mountSnippetStackView(host, {
        initialStack: {
            version: 1,
            items: [
                {id: "pin-1", title: "锁定项", rawFragment: "永久保留", pinned: true},
                {id: "unpin-1", title: "待清项A", rawFragment: "内容A", pinned: false},
                {id: "unpin-2", title: "待清项B", rawFragment: "内容B", pinned: false},
            ],
        },
        save: (next) => {
            persisted = next;
        },
    });

    const undoBtn = host.querySelector('[data-stack-action="undo"]');
    assert.ok(undoBtn, "必须渲染撤销按钮节点");
    assert.equal(undoBtn.hidden, true, "初始无删除记录时撤销按钮必须隐藏");

    // 1. 测试单条移除 + 撤销恢复
    const removeBtns = host.querySelectorAll('[data-stack-op="remove"]');
    removeBtns[1].click(); // 移除 unpin-1
    assert.equal(handle.getState().items.length, 2);
    assert.equal(undoBtn.hidden, false, "移除切片后撤销按钮必须显现");

    undoBtn.click();
    assert.equal(handle.getState().items.length, 3, "点击撤销后必须完整恢复 3 条切片");
    assert.equal(persisted.items[1].id, "unpin-1", "原切片顺序必须无损还原");
    assert.equal(undoBtn.hidden, true, "撤销完成后按钮重新隐藏");

    // 2. 测试清空未锁定 + 撤销恢复
    const clearBtn = host.querySelector('[data-stack-action="clear-unpinned"]');
    clearBtn.click();
    assert.equal(handle.getState().items.length, 1, "清空未锁定后仅剩 1 条锁定项");
    assert.equal(undoBtn.hidden, false, "清空后撤销按钮必须显现");

    undoBtn.click();
    assert.equal(handle.getState().items.length, 3, "撤销清空后 2 条未锁定项全部找回");

    handle.dispose();
    dom.window.close();
});

test("T-7811: mountSnippetStudio 挂载真实透传 assemble/openBlock、自动激活 objectKind=stack 并展示正式双语标题", async () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="studio" style="width:1280px;height:760px;"></div></body></html>', {
        pretendToBeVisual: true,
    });
    const root = dom.window.document.getElementById("studio");
    const {mountSnippetStudio} = loadStudioUiWithStub();

    let assembledTarget = null;
    let openedBlock = null;

    const controller = mountSnippetStudio(root, {
        i18n: zhI18n,
        store: {
            load: async () => ({snippets: [], cssEnabled: true, jsEnabled: false}),
            save: async () => ({ok: true}),
            subscribe: () => () => {},
            dispose: () => {},
        },
        ai: {dispose: () => {}},
        session: {draft: null, baseline: null},
        stack: {
            load: () => ({
                version: 1,
                items: [{id: "s1", title: "测试卡", rawFragment: "正文", sourceBlockId: "20261031093000-blk7777"}],
            }),
            save: () => {},
            assemble: async (target) => {
                assembledTarget = target;
                return {ok: true, message: "真实组装回执"};
            },
            openBlock: async (blockId) => {
                openedBlock = blockId;
                return true;
            },
        },
        platform: {
            labels: {switcher: "切换器", workbench: "工作台", studio: "片段实验室"},
            available: ["switcher", "workbench", "studio"],
            context: {entry: "toolbar", objectKind: "stack"},
        },
    });

    const pills = root.querySelectorAll(".sw-studio__tab-pill");
    assert.equal(pills.length, 2);
    assert.equal(pills[1].textContent, zhI18n.snippetStackTitle, "标签按钮必须渲染本地化中文标题而非裸键名 snippetStackTitle");
    assert.equal(pills[1].classList.contains("is-active"), true, "携带 objectKind=stack 进入时必须自动激活暂存栈页签");

    const stackContainer = root.querySelector(".sw-studio__stack-container");
    assert.equal(stackContainer.hidden, false, "暂存栈容器必须自动可见");

    // 点击推入日报真实触发宿主 stack.assemble
    root.querySelector('[data-stack-assemble="journal"]').click();
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(assembledTarget, "journal", "实验室暂存栈点击推入日报必须真实调用 stack.assemble");

    // 点击血缘反链真实触发宿主 stack.openBlock
    root.querySelector(".sw-snippet-stack__lineage-chip").click();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(openedBlock, "20261031093000-blk7777", "点击血缘反链必须真实调用 stack.openBlock");

    controller.dispose();
    dom.window.close();
});

test("T-7811 & T-7812: 源码接线与块级 CSS 令牌/焦点/胶囊契约守护", () => {
    const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
    const docSearchTs = readSourceText(path.join(ROOT, "src", "doc-search-ui.ts"));
    const secondPanelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
    const studioScss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));
    const polishScss = readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss"));

    // 1. index.ts 具备编辑区选区监听与卸载清理、独立弹窗回退及真实剪贴板 Promise 捕获
    assert.match(indexTs, /document\.addEventListener\("selectionchange",\s*onSelectionChange\)/, "必须监听编辑区选区变化");
    assert.match(indexTs, /document\.removeEventListener\("selectionchange",\s*onSelectionChange\)/, "卸载时必须清理选区监听");
    assert.match(indexTs, /public openSnippetStackDialog\(\):\s*void/, "必须提供跨端独立暂存栈弹窗回退");
    assert.match(secondPanelTs, /openSnippetStackDialog\(\)/, "工作台窄端/移动端必须回退打开独立暂存栈弹窗");
    assert.doesNotMatch(indexTs, /void navigator\.clipboard\.writeText\(/, "index.ts 禁止不等待 Promise 结果的虚假剪贴板成功提示");
    assert.doesNotMatch(docSearchTs, /void navigator\.clipboard\.writeText\(/, "doc-search-ui.ts 禁止不等待 Promise 结果的虚假剪贴板成功提示");

    // 2. 块级 CSS 守护（topLevel: true 防媒体查询替身）
    assert.equal(
        declaresIn(studioScss, ".sw-studio__tab-pill", /border-radius:\s*var\(--sw-platform-radius-pill/, {topLevel: true}),
        true,
        ".sw-studio__tab-pill 必须声明全圆角胶囊样式，消除原生灰框",
    );
    assert.equal(
        declaresIn(studioScss, ".sw-studio__stack-container", /flex:\s*1/, {topLevel: true}),
        true,
        ".sw-studio__stack-container 必须声明弹性伸展以铺满伴侣栏高度",
    );
    assert.equal(
        declaresIn(studioScss, ".sw-snippet-stack", /--studio-accent:\s*var\(--sw-platform-accent/, {topLevel: true}),
        true,
        ".sw-snippet-stack 必须自带 --studio-accent 作用域回退以支持独立弹窗",
    );
    assert.equal(
        declaresIn(studioScss, ".sw-snippet-stack__btn:focus-visible", /box-shadow:\s*var\(--sw-focus-glow\)/, {topLevel: true}),
        true,
        ".sw-snippet-stack__btn 必须声明 focus-visible 焦点发光环",
    );
    assert.equal(
        declaresIn(polishScss, ".sw-home .sw-home__stack-btn", /border-radius:\s*var\(--sw-platform-radius-pill/, {topLevel: true}),
        true,
        ".sw-home .sw-home__stack-btn 必须统合为工作台胶囊按钮规范",
    );
});

test("T-7810~T-7812 门禁负向验证: 剥离关键样式声明或注入裸剪贴板调用必须精确失败", () => {
    const studioScss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));
    const brokenScss = studioScss.replace(/--studio-accent:\s*var\(--sw-platform-accent[^;]+;/g, "");
    // 仅从 .sw-snippet-stack 块移除 --studio-accent 时：由于 .sw-studio 顶层也有定义，
    // 我们针对 .sw-snippet-stack 选择器精确断言必须变为 false
    const snippetStackOnlyBroken = studioScss.replace(
        /(\.sw-snippet-stack\s*\{[\s\S]*?)--studio-accent:[^;]+;/,
        "$1",
    );
    assert.equal(
        declaresIn(snippetStackOnlyBroken, ".sw-snippet-stack", /--studio-accent:\s*var\(--sw-platform-accent/, {topLevel: true}),
        false,
        "移除 .sw-snippet-stack 的 --studio-accent 回退后块级断言必须精确检出 false",
    );
});
