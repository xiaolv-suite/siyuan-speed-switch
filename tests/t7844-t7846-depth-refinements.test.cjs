// T-7844 ~ T-7846 深度体验精进批次专项契约测试与负向验证探针
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. T-7844: 切片暂存栈拖拽监听原生块对象与普通文本，智能异步反查 /api/block/getBlockKramdown；
//   2. T-7845: 小组件配置表单装配自定义别名并在卡片标题优先渲染；
//   3. T-7846: 片段实验室代码树接入最近更新过滤与修改时间逆序排序；
//   4. 破坏性负向注入验证。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const stackJs = readSourceText(path.join(root, "src", "snippet-stack-ui.js"));
const configFormTs = readSourceText(path.join(root, "src", "home-config-form.ts"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const studioJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7844: 切片暂存栈容器具备完整的 dragover/dragleave/drop 监听与块 AST 反查", () => {
    assert.match(
        stackJs,
        /root\.addEventListener\("dragover",[\s\S]*?event\.dataTransfer\.dropEffect = "copy";[\s\S]*?root\.classList\.add\("is-dragover"\);/,
        "暂存栈容器必须监听 dragover 并声明 copy 效果",
    );
    assert.match(
        stackJs,
        /root\.addEventListener\("drop", async \(event\) => \{[\s\S]*?\/api\/block\/getBlockKramdown[\s\S]*?kramdownRes\?\.data\?\.kramdown[\s\S]*?pushSnippetStackItem/,
        "drop 必须能捕获块 ID 并异步反查正文 Kramdown",
    );
});

test("T-7845: 小组件配置表单提供别名设置且卡片标题优先显示 alias", () => {
    assert.match(
        configFormTs,
        /const aliasRow = document\.createElement\("div"\);[\s\S]*?sw-home-config__field[\s\S]*?draft\.alias = val\.slice\(0, 40\);/,
        "配置表单必须具备别名配置字段并将 alias 存入 draft",
    );
    assert.match(
        secondPanelTs,
        /module: \{\.\.\.def, title: \(inst\.config && typeof \(inst\.config as any\)\.alias === "string" && \(inst\.config as any\)\.alias\.trim\(\)\) \? \(inst\.config as any\)\.alias\.trim\(\) : def\.title\},/,
        "卡片控制器装配时必须优先使用 inst.config.alias 作为显示标题",
    );
});

test("T-7846: 片段实验室代码树具备最近更新过滤胶囊与修改时间逆序排序", () => {
    assert.match(
        studioJs,
        /\["recent", "snippetRecent"\]/,
        "代码树类型过滤必须包含 recent 最近过滤项",
    );
    assert.match(
        studioJs,
        /entries\.sort\(\(a, b\) => \{[\s\S]*?const timeA = Number\(a\.updated \|\| a\.created \|\| a\.mtime \|\| 0\);[\s\S]*?return timeB - timeA;/,
        "代码树列表必须按修改时间逆序优先展示新片段",
    );
});

test("T-7844~T-7846 门禁破坏性负向验证探针", () => {
    const fakeStack = stackJs.replace(/getBlockKramdown/, "// removed kramdown");
    assert.doesNotMatch(
        fakeStack,
        /\/api\/block\/getBlockKramdown/,
        "负向注入验证：缺少 Kramdown 反查时断言必须拦截失败",
    );

    const fakeForm = configFormTs.replace(/draft\.alias = val\.slice\(0, 40\);/, "// removed alias");
    assert.doesNotMatch(
        fakeForm,
        /draft\.alias = val\.slice\(0, 40\);/,
        "负向注入验证：缺少别名写入时断言必须拦截失败",
    );

    const fakeStudio = studioJs.replace(/\["recent", "snippetRecent"\]/, "// removed recent");
    assert.doesNotMatch(
        fakeStudio,
        /\["recent", "snippetRecent"\]/,
        "负向注入验证：缺少 recent 过滤胶囊时断言必须拦截失败",
    );
});
