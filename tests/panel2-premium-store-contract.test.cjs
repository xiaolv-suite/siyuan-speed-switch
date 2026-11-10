// T-7231：第二面板/组件商店的材质与主从详情回归契约。
//
// 这里守两条用户可见的硬约束：工作台单元格不能被最后一层样式收平成裸边框，
// 组件商店右侧必须是“一份实时预览 + 一组动作”，不能再把完整目录卡片复制一次。
// 每个契约都带有内存注入的负向验证，避免只跑改完仍通过而门禁本身失效。
const test = require("node:test");
const assert = require("node:assert/strict");
const {readSourceFile, readStyleSource} = require("./source-scan.cjs");
const {findRules} = require("./css-block-scan.cjs");

const ui = readSourceFile("src/home-store-ui.ts");
const styles = readStyleSource();
const workbenchStyles = readSourceFile("src/styles/_11-ui-polish.scss");

function assertDetailStructure(source) {
    assert.match(source,
        /const detailCard = buildReadyCard\(storeSelectedModule, detailDef, "detail", inlinePreview\.mount\.setSize\)/,
        "详情应复用卡片构建器提供标题与动作节点");
    assert.match(source, /detailCard\.querySelector<HTMLElement>\("\.sw-home-store__card-head"\)/,
        "详情必须抽出标题节点");
    assert.match(source, /detailCard\.querySelector<HTMLElement>\("\.sw-home-store__sizes"\)/,
        "详情必须抽出尺寸/动作节点");
    assert.match(source, /detailPane\.removeAttribute\("aria-labelledby"\)/,
        "详情重绘前必须清理旧标题引用");
    assert.match(source, /detailPane\.setAttribute\("aria-labelledby", detailTitle\.id\)/,
        "详情 region 必须引用当前组件标题");
    assert.match(source, /detailPane\.appendChild\(inlinePreview\.section\)/,
        "详情必须挂载唯一实时预览");
    assert.doesNotMatch(source, /detailPane\.appendChild\(buildReadyCard\(storeSelectedModule/,
        "详情不得把完整目录卡片再次挂进预览后面");
}

function assertWorkbenchMaterial(source) {
    // 2026-11-09 质感升级：工作台 Bento 瓷贴在 `:is(.sw-home, .sw-home-store, .sw-store-preview)` 共享作用域下
    // 采用不透明白底浮层质感（顶部镜面高光 + 多层立体柔影 + 20px 圆角），严禁退化为 box-shadow: none 扁平裸框。
    const rules = [
        ...findRules(source, ":is(.sw-home, .sw-home-store, .sw-store-preview) .sw-home__cell", {topLevel: true}),
        ...findRules(source, ".sw-home .sw-home__cell", {topLevel: true}),
    ];
    assert.ok(rules.every((rule) => !/box-shadow:\s*none/.test(rule.declarations)),
        "工作台材质规则不得把层级阴影归零");
    assert.ok(rules.some((rule) => /border-radius:\s*var\(--sw-radius-card/.test(rule.declarations)),
        "最后加载的工作台样式必须保留卡片圆角令牌");
    assert.ok(rules.some((rule) => /box-shadow:[\s\S]*inset 0 1(?:\.5)?px/.test(rule.declarations)),
        "最后加载的工作台样式必须保留顶部镜面高光");
    assert.ok(rules.some((rule) => /box-shadow:[\s\S]*0 (?:8px 32px|10px 28px)/.test(rule.declarations)),
        "最后加载的工作台样式必须保留多层立体柔影");
}

test("detail pane is a single preview scene with extracted actions", () => {
    assertDetailStructure(ui);
});

test("detail scene gets independent premium layers", () => {
    assert.ok(findRules(styles, ".sw-home-store__detail-head", {topLevel: true})
        .some((rule) => /border-radius:\s*var\(--sw-radius-card/.test(rule.declarations)),
        "详情标题需要独立圆角层");
    assert.ok(findRules(styles, ".sw-home-store__detail .sw-home-store__live-preview", {topLevel: true})
        .some((rule) => /min-height:\s*clamp\(220px, 34vh, 420px\)/.test(rule.declarations)),
        "实时预览需要占据可读高度");
    assert.ok(findRules(styles, ".sw-home-store__detail-actions", {topLevel: true})
        .some((rule) => /box-shadow:\s*var\(--sw-shadow-xs/.test(rule.declarations)),
        "详情动作区需要独立层级");
});

test("last polish layer preserves workbench material", () => {
    assertWorkbenchMaterial(workbenchStyles);
});

test("detector self-check: duplicate detail card is caught (negative verification)", () => {
    const injected = ui.replace(
        "detailPane.appendChild(inlinePreview.section);",
        'detailPane.appendChild(buildReadyCard(storeSelectedModule, detailDef, "detail", inlinePreview.mount.setSize));\n                    detailPane.appendChild(inlinePreview.section);',
    );
    assert.throws(() => assertDetailStructure(injected), /完整目录卡片/,
        "注入完整卡片后门禁必须失败");
});

test("detector self-check: flattened workbench material is caught (negative verification)", () => {
    const injected = workbenchStyles.replace(
        /box-shadow:\s*inset 0 1px 0 0 rgba\(255, 255, 255, 0\.6\)[^;]*!important;/,
        "box-shadow: none;",
    );
    assert.throws(() => assertWorkbenchMaterial(injected), /层级阴影归零/,
        "注入 box-shadow:none 后门禁必须失败");
});
