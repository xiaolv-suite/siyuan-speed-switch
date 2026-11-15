const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");
const {declaresIn} = require("./css-block-scan.cjs");

const ROOT = path.resolve(__dirname, "..");

function validatePreviewEnhancementContracts({indexTs, docSearchTs, polishScss, previewJs}) {
    if (!/scrollElement\s*=\s*scrollElement\.closest(?:<[^>]+>)?\(\s*["']\.sw__scroll["']\s*\)\s*\|\|\s*scrollElement/.test(indexTs)) {
        throw new Error("index.ts renderList must defensively normalize scrollElement to root .sw__scroll");
    }
    if (!/rootScroll\s*=\s*scrollElement\.closest(?:<[^>]+>)?\(\s*["']\.sw__scroll["']\s*\)\s*\|\|\s*scrollElement/.test(indexTs)
        || !/this\.renderList\(rootScroll/.test(indexTs)) {
        throw new Error("index.ts renderGroupedList must use rootScroll to avoid nested .sw__tab-preview wrappers");
    }
    if (!/pane\.dataset\.rootId\s*=\s*rootId/.test(docSearchTs)) {
        throw new Error("doc-search-ui.ts loadDocPreview must persist pane.dataset.rootId for one-click block reference copy");
    }
    if (!/sw__doc-preview-empty-card/.test(docSearchTs)) {
        throw new Error("doc-search-ui.ts loadDocPreview must mount structured empty card for short/empty documents to avoid blank void");
    }
    if (!declaresIn(polishScss, ".speed-switch .sw__tab-preview.sw--with-preview .sw__doc-preview", /align-self:\s*stretch/, {topLevel: true})) {
        throw new Error("_11-ui-polish.scss .sw__doc-preview must declare align-self: stretch to fill container height");
    }
    if (!declaresIn(polishScss, ".speed-switch .sw__tab-preview.sw--with-preview .sw__doc-preview", /grid-row:\s*1\s*\/\s*-1/, {topLevel: true})) {
        throw new Error("_11-ui-polish.scss .sw__doc-preview must declare grid-row: 1 / -1");
    }
    if (!/function\s+buildSnippetPreviewDocument\s*\([\s\S]*?\bcategory\b/.test(previewJs)) {
        throw new Error("snippet-studio-preview.js buildSnippetPreviewDocument must accept category parameter");
    }
}

test("T-7833: 第一面板根容器防御、满高拉伸与片段专属聚焦预览源码及样式契约", () => {
    const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
    const docSearchTs = readSourceText(path.join(ROOT, "src", "doc-search-ui.ts"));
    const polishScss = readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss"));
    const previewJs = readSourceText(path.join(ROOT, "src", "snippet-studio-preview.js"));

    validatePreviewEnhancementContracts({indexTs, docSearchTs, polishScss, previewJs});
});

test("T-7833: 片段预览系统按 CSS 类型（代码块/大纲树/Callout/折叠标题/表格/聚焦）呈现精准专属变化", () => {
    const {buildSnippetPreviewDocument} = require("../src/snippet-studio-preview.js");

    // 1. 代码块专属预览：挂载 Mac 终端三色控制圆点、语言标识与语法高亮
    const codeDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "code",
        content: ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"]::before { content: ''; }",
    });
    assert.ok(codeDoc.includes("代码块终端视觉效果演示"), "代码块分类必须挂载代码块专属视觉演示区");
    assert.ok(codeDoc.includes("data-type=\"NodeCodeBlock\""), "代码块必须带有 NodeCodeBlock 节点");
    assert.ok(codeDoc.includes("mac-terminal"), "代码块内容必须包含终端标识展示");

    // 2. 大纲树专属预览：挂载带 --indent 层级缩进对齐线、折叠微箭头与彩虹虚线
    const outlineDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "outline",
        content: ".protyle-outline .b3-list-item { position: relative; }",
    });
    assert.ok(outlineDoc.includes("大纲树层级虚线效果演示"), "大纲分类必须挂载大纲层级树专属演示区");
    assert.ok(outlineDoc.includes("protyle-outline"), "必须挂载 protyle-outline 容器");
    assert.ok(outlineDoc.includes("--indent:0") && outlineDoc.includes("--indent:1"), "必须挂载多级缩进标尺节点");

    // 3. 提示块/引述专属预览：挂载 Bento 柔彩微底 Callout 与标准引述边条对照
    const calloutDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "quote",
        content: ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] { border-left: 4px solid blue; }",
    });
    assert.ok(calloutDoc.includes("Callout 提示块效果演示"), "引述分类必须挂载 Callout 专属演示区");
    assert.ok(calloutDoc.includes("b3-callout"), "必须挂载 b3-callout 容器");

    // 4. 折叠标题专属预览：挂载折叠微箭头、旋转动效与收拢对比
    const foldDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "fold",
        content: "[fold=\"1\"] { opacity: 0.8; }",
    });
    assert.ok(foldDoc.includes("折叠标题动效演示"), "折叠分类必须挂载折叠标题动效演示区");
    assert.ok(foldDoc.includes("fold=\"1\""), "必须挂载 fold=\"1\" 节点");
    assert.ok(foldDoc.includes("protyle-action--fold"), "必须挂载 protyle-action--fold 折叠图标容器");

    // 5. 表格专属预览：挂载交替斑马纹与沉浸表头
    const tableDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "table",
        content: "tbody tr:nth-child(even) { background: #eee; }",
    });
    assert.ok(tableDoc.includes("表格斑马纹与悬浮提亮效果演示"), "表格分类必须挂载表格斑马纹专属演示区");
    assert.ok(tableDoc.includes("NodeTable"), "必须挂载 NodeTable 容器");

    // 6. 焦点段落专属预览：挂载编辑中呼吸高亮边条与正常失焦段落对照
    const focusDoc = buildSnippetPreviewDocument({
        scene: "reading",
        type: "css",
        category: "focus",
        content: ".is-focused { border-inline-start-color: red; }",
    });
    assert.ok(focusDoc.includes("段落聚焦呼吸效果演示"), "聚焦分类必须挂载聚焦段落专属演示区");
    assert.ok(focusDoc.includes("is-focused"), "必须挂载 is-focused 节点");
    assert.ok(focusDoc.includes("autofocus"), "必须挂载 autofocus 聚焦属性");
});

test("T-7833 门禁负向验证：若丢失根滚动容器规整、缺失 rootId 保持或回退 align-self: start 必须报错", () => {
    const base = {
        indexTs: readSourceText(path.join(ROOT, "src", "index.ts")),
        docSearchTs: readSourceText(path.join(ROOT, "src", "doc-search-ui.ts")),
        polishScss: readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss")),
        previewJs: readSourceText(path.join(ROOT, "src", "snippet-studio-preview.js")),
    };

    assert.throws(
        () => validatePreviewEnhancementContracts({...base, indexTs: base.indexTs.replace(/scrollElement\s*=\s*scrollElement\.closest(?:<[^>]+>)?\([^)]+\)\s*\|\|\s*scrollElement;/, "")}),
        /defensively normalize scrollElement/,
        "移除 renderList 根容器规整时必须报错",
    );

    assert.throws(
        () => validatePreviewEnhancementContracts({...base, docSearchTs: base.docSearchTs.replace(/pane\.dataset\.rootId\s*=\s*rootId;/, "")}),
        /persist pane\.dataset\.rootId/,
        "移除 pane.dataset.rootId 赋值时必须报错",
    );

    assert.throws(
        () => validatePreviewEnhancementContracts({...base, polishScss: base.polishScss.replace(/align-self:\s*stretch;/, "align-self: start;")}),
        /declare align-self: stretch/,
        "回退为 align-self: start 时必须报错",
    );
});
