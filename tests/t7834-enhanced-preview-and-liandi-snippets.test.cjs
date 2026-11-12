const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");

function validateCommunitySnippetContracts(communitySnippets) {
    if (!Array.isArray(communitySnippets) || communitySnippets.length < 8) {
        throw new Error("COMMUNITY_SNIPPETS must contain at least 8 high-quality community snippets");
    }
    for (const item of communitySnippets) {
        if (!item.id || typeof item.id !== "string" || !item.id.startsWith("swss-liandi-")) {
            throw new Error(`COMMUNITY_SNIPPET id must start with swss-liandi-: ${item.id}`);
        }
        if (!item.author || !item.author.startsWith("链滴 @")) {
            throw new Error(`COMMUNITY_SNIPPET author must start with '链滴 @': ${item.id}`);
        }
        if (!item.author.includes("（AI 适配新版思源）")) {
            throw new Error(`COMMUNITY_SNIPPET author must document '（AI 适配新版思源）' adaptation: ${item.id}`);
        }
        if (!item.sourceUrl || !item.sourceUrl.startsWith("https://ld246.com/article/")) {
            throw new Error(`COMMUNITY_SNIPPET sourceUrl must point to ld246.com article: ${item.id}`);
        }
        if (!item.name || !item.description || !item.content) {
            throw new Error(`COMMUNITY_SNIPPET missing name, description or content: ${item.id}`);
        }
    }
}

test("T-7834: 链滴社区精选 CSS 片段规范与来源归属契约", () => {
    const {COMMUNITY_SNIPPETS} = require("../src/snippet-studio-model.js");
    validateCommunitySnippetContracts(COMMUNITY_SNIPPETS);

    // 验证包含 10 个精选社区片段，覆盖全场景且全部完成新版思源适配
    assert.equal(COMMUNITY_SNIPPETS.length, 10);
    const byId = new Map(COMMUNITY_SNIPPETS.map((s) => [s.id, s]));
    assert.ok(byId.has("swss-liandi-extlink-glow"), "必须包含外链斜角发光图标片段");
    assert.ok(byId.has("swss-liandi-morandi-tags"), "必须包含莫兰迪彩虹胶囊标签片段");
    assert.ok(byId.has("swss-liandi-glass-quote"), "必须包含毛玻璃微质感透光引述片段");
    assert.ok(byId.has("swss-liandi-card-image"), "必须包含浮起卡片微阴影图片片段");
    assert.ok(byId.has("swss-liandi-gradient-hr"), "必须包含渐变淡化星芒装饰线片段");
    assert.ok(byId.has("swss-liandi-task-bounce"), "必须包含待办复选框弹性微跳跃动效片段");

    // 新版思源真实语法与防冲突自检
    assert.match(byId.get("swss-liandi-card-image").content, /:not\(\.emoji\)/, "图片相框必须排除 .emoji 防止行内小表情变形");
    assert.match(byId.get("swss-liandi-gradient-hr").content, /overflow:\s*visible/, "星芒分割线必须声明 overflow: visible 防止伪元素裁剪");
    assert.match(byId.get("swss-liandi-rainbow-outline").content, /:is\(\.sy__outline,\s*\.protyle-outline\)/, "大纲树必须同时适配侧栏 dock 与正文浮窗");
    assert.match(byId.get("swss-liandi-mac-codeblock").content, /\.protyle-action/, "Mac代码块必须为右上角语言/复制栏预留 top 间隙");
});

test("T-7834: 增强预览系统按新增类型精准渲染专属视觉演示区（外链/莫兰迪标签/相框图片/星芒线/弹性待办）", () => {
    const {buildSnippetPreviewDocument} = require("../src/snippet-studio-preview.js");

    // 1. 外链斜角图标与发光悬浮预览
    const extlinkDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "typography",
        content: ".protyle-wysiwyg span[data-type=\"a\"]::after { content: ' ↗'; }",
    });
    assert.ok(extlinkDoc.includes("外部链接与超链接效果演示"), "外链样式必须挂载超链接专属演示区");
    assert.ok(extlinkDoc.includes("data-type=\"a\""), "必须包含 a 节点");

    // 2. 莫兰迪标签胶囊预览
    const tagDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "tag",
        content: ".protyle-wysiwyg span[data-type=\"tag\"] { border-radius: 999px; }",
    });
    assert.ok(tagDoc.includes("莫兰迪彩虹胶囊标签演示"), "标签分类必须挂载莫兰迪彩虹胶囊标签演示区");
    assert.ok(tagDoc.includes("data-type=\"tag\""), "必须挂载标签节点");

    // 3. 卡片相框图片预览
    const imageDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "image",
        content: ".protyle-wysiwyg img { border-radius: 10px; }",
    });
    assert.ok(imageDoc.includes("浮起卡片相框与微阴影图片演示"), "图片分类必须挂载浮起卡片相框演示区");

    // 4. 渐变淡化星芒装饰线预览
    const hrDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "divider",
        content: ".protyle-wysiwyg hr { border: none; }",
    });
    assert.ok(hrDoc.includes("渐变羽化星芒装饰分隔线演示"), "分隔线分类必须挂载渐变羽化星芒线演示区");

    // 5. 待办弹性跳跃动效预览
    const taskDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "list",
        content: ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"] input[type=\"checkbox\"] { transform: scale(1.35); }",
    });
    assert.ok(taskDoc.includes("待办任务复选框弹性微跳跃演示"), "列表待办分类必须挂载待办任务复选框弹性动效演示区");
});

test("T-7834: 片段商店挂载『💎 精选精品』置顶胶囊，点击即聚焦高价值社区与现代思源适配精品", async (t) => {
    const {JSDOM} = require("jsdom");
    const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
        url: "http://127.0.0.1:43928/",
        pretendToBeVisual: true,
    });
    const {window} = dom;
    const {document} = window;
    const Module = require("node:module");
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === "siyuan") return {Dialog: class {}, showMessage: () => {}};
        return originalLoad.apply(this, arguments);
    };
    t.after(() => {
        Module._load = originalLoad;
        window.close();
    });
    const {mountSnippetStudio} = require("../src/snippet-studio-ui.js");
    const i18n = require("../src/i18n/zh-CN.json");

    const root = document.getElementById("root");
    const controller = mountSnippetStudio(root, {
        window,
        document,
        i18n,
        session: {draft: null, baseline: null},
        store: {read: async () => [], mutate: async () => [], dispose: () => {}},
    });
    await controller.ready;

    // 打开片段商店
    root.querySelector(".sw-studio__store-banner-btn").click();
    const sheet = root.querySelector(".sw-studio__picker-sheet--store");
    assert.ok(sheet, "必须挂载商店面板");

    const featuredPill = sheet.querySelector('.sw-studio__category-pill[data-category-value="featured"]');
    assert.ok(featuredPill, "片段商店必须挂载『💎 精选精品』首位直达胶囊");
    assert.match(featuredPill.textContent, /💎 精选精品/, "胶囊必须显示精品文案");

    featuredPill.click();
    assert.equal(featuredPill.classList.contains("is-active"), true, "点击后必须激活高亮");
    const featuredCards = sheet.querySelectorAll(".sw-studio__catalog-item");
    assert.ok(featuredCards.length >= 10 && featuredCards.length <= 30, "精选精品视图卡片数量必须在精品范围内（排除平庸简陋代码）");

    controller.dispose();
});

test("T-7834 门禁负向验证：若丢失作者链滴标注、缺少 AI 适配思源声明或篡改原帖链接必须报错", () => {
    const {COMMUNITY_SNIPPETS} = require("../src/snippet-studio-model.js");

    assert.throws(
        () => validateCommunitySnippetContracts(COMMUNITY_SNIPPETS.map((s, i) => i === 0 ? {...s, author: "无来源作者"} : s)),
        /must start with '链滴 @'/,
        "丢失链滴作者标注时必须报错",
    );

    assert.throws(
        () => validateCommunitySnippetContracts(COMMUNITY_SNIPPETS.map((s, i) => i === 0 ? {...s, author: "链滴 @某某"} : s)),
        /must document '（AI 适配新版思源）'/,
        "缺少 AI 适配新版思源标注时必须报错",
    );

    assert.throws(
        () => validateCommunitySnippetContracts(COMMUNITY_SNIPPETS.map((s, i) => i === 0 ? {...s, sourceUrl: "https://example.com/fake"} : s)),
        /must point to ld246\.com article/,
        "篡改链滴原帖链接时必须报错",
    );

    assert.throws(
        () => validateCommunitySnippetContracts(COMMUNITY_SNIPPETS.map((s, i) => i === 0 ? {...s, id: "fake-id"} : s)),
        /must start with swss-liandi-/,
        "缺少 swss-liandi- 前缀时必须报错",
    );
});
