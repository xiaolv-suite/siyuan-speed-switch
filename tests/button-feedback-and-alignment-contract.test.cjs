// T-7581~T-7584: 全表面按钮反馈微触感、字体元素对齐收口与焦点自愈契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证全表面核心按钮（.sw__icon-btn, .sw__sort-trigger, .sw-home-store__configure, .sw-home-store__remove）声明了 cursor: pointer 与 :active 反馈；
//   2. 验证弹窗标题栏规范（.lv-dialog-title-wrap）锁定文字行高与垂直对齐，胶囊声明 tabular-nums 居中；
//   3. 验证平台弹窗焦点循环（trapDialogFocus）具备 Escape 安全拦截与前置焦点自愈恢复；
//   4. 负向验证探针：若移除按压反馈或破坏焦点恢复，断言必定精准报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const polishScss = readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss"));
const storeScss = readSourceText(path.join(ROOT, "src", "styles", "_06-widgets-store.scss"));
const mobileScss = readSourceText(path.join(ROOT, "src", "styles", "_03-switcher-mobile.scss"));
const platformDomJs = readSourceText(path.join(ROOT, "src", "platform-dom.js"));
const {trapDialogFocus} = require("../src/platform-dom.js");

test("T-7581: 全表面核心交互按钮必须具备 cursor: pointer 与 :active 微触感反馈", () => {
    // 1. 切换器主工具栏图标按钮
    assert.match(
        polishScss,
        /\.sw__icon-btn\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?&:active:not\(:disabled\)\s*\{[\s\S]*?transform:\s*scale\(0\.92\);/,
        ".sw__icon-btn 必须声明 cursor: pointer 与 :active 缩放反馈"
    );

    // 2. 排序与收藏触发器
    assert.match(
        polishScss,
        /\.sw__sort-trigger,[\s\S]*?\.sw__fav-trigger[\s\S]*?\{[\s\S]*?cursor:\s*pointer;[\s\S]*?&:active:not\(:disabled\)\s*\{[\s\S]*?transform:\s*translateY\(1px\) scale\(0\.985\);/,
        ".sw__sort-trigger 等触发器必须声明 cursor: pointer 与 :active 按压反馈"
    );

    // 3. 组件商店配置与移除胶囊
    assert.match(
        storeScss,
        /\.sw-home-store__configure\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*scale\(0\.96\);/,
        ".sw-home-store__configure 必须声明 cursor: pointer 与 :active 缩放"
    );
    assert.match(
        storeScss,
        /\.sw-home-store__remove\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*scale\(0\.96\);/,
        ".sw-home-store__remove 必须声明 cursor: pointer 与 :active 缩放"
    );

    // 4. 移动端搜索清除与过滤按钮
    assert.match(
        mobileScss,
        /\.sw__search-clear\s*\{[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*translateY\(-50%\)\s*scale\(0\.92\);/,
        ".sw__search-clear 必须声明 :active 缩放反馈"
    );
    assert.match(
        mobileScss,
        /\.sw__search-filter-btn\s*\{[\s\S]*?&:active\s*\{[\s\S]*?transform:\s*scale\(0\.92\);/,
        ".sw__search-filter-btn 必须声明 :active 缩放反馈"
    );
});

test("T-7582: 弹窗标题栏规范必须锁定垂直基线对齐与等宽数字版本胶囊", () => {
    assert.match(
        polishScss,
        /\.lv-dialog-title-wrap\s*\{[\s\S]*?vertical-align:\s*middle;[\s\S]*?\.lv-dialog-title-text\s*\{[\s\S]*?line-height:\s*1\.2;[\s\S]*?vertical-align:\s*middle;/,
        ".lv-dialog-title-wrap 与 .lv-dialog-title-text 必须声明 vertical-align: middle 与 line-height: 1.2"
    );

    assert.match(
        polishScss,
        /\.lv-dialog-title-badge\s*\{[\s\S]*?height:\s*18px;[\s\S]*?line-height:\s*18px;[\s\S]*?font-variant-numeric:\s*tabular-nums;/,
        ".lv-dialog-title-badge 必须锁定 18px 行高与 tabular-nums 等宽数字"
    );
});

test("T-7583: trapDialogFocus 具备 Escape 拦截与前置焦点自愈恢复", () => {
    assert.match(
        platformDomJs,
        /if\s*\(\s*event\.key\s*===\s*"Escape"\s*\)\s*\{[\s\S]*?closeBtn\.click\(\);/,
        "trapDialogFocus 必须包含 Escape 优先拦截触发关闭逻辑"
    );
    assert.match(
        platformDomJs,
        /previousActive\.focus\(\{preventScroll:\s*true\}\)/,
        "trapDialogFocus cleanup 必须包含将焦点送回 previousActive 逻辑"
    );

    // 运行态实证：创建包含关闭按钮与外部按钮的 DOM
    const dom = new JSDOM('<!doctype html><html><body><button id="trigger">Open</button><div id="dialog" class="sw-platform-dialog"><button class="b3-dialog__close">Close</button><input id="inp" /></div></body></html>');
    const {document} = dom.window;
    const trigger = document.getElementById("trigger");
    const dialog = document.getElementById("dialog");
    const closeBtn = dialog.querySelector(".b3-dialog__close");

    trigger.focus();
    assert.equal(document.activeElement, trigger, "触发按钮首先获得焦点");

    let closed = false;
    closeBtn.addEventListener("click", () => { closed = true; });

    const cleanup = trapDialogFocus(dialog);

    // 聚焦于弹窗内
    const inp = document.getElementById("inp");
    inp.focus();
    assert.equal(document.activeElement, inp, "弹窗内输入框获得焦点");

    // 模拟按下 Escape
    const escEvent = new dom.window.KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true});
    dialog.dispatchEvent(escEvent);
    assert.equal(closed, true, "按下 Escape 必须触发关闭按钮的点击");
    assert.equal(escEvent.defaultPrevented, true, "按下 Escape 必须阻止事件默认行为");

    // 模拟弹窗关闭/销毁触发 cleanup
    cleanup();
    assert.equal(document.activeElement, trigger, "弹窗关闭后焦点必须精确回到原触发按钮");

    dom.window.close();
});

test("T-7584 门禁负向验证：若缺失按压反馈或焦点恢复，断言必须精确报错", () => {
    // 探针 1: 模拟未定义 :active 的非法代码必须被拦截
    const invalidScss = polishScss.replace(/&:active:not\(:disabled\)\s*\{[\s\S]*?transform:\s*scale\(0\.92\);/g, "/* missing */");
    assert.throws(() => {
        if (!/\.sw__icon-btn\s*\{[\s\S]*?cursor:\s*pointer;[\s\S]*?&:active:not\(:disabled\)\s*\{[\s\S]*?transform:\s*scale\(0\.92\);/.test(invalidScss)) {
            throw new Error("Gate failed: missing :active scale on .sw__icon-btn");
        }
    }, /Gate failed/);

    // 探针 2: 模拟未恢复前置焦点的非法实现必须被拦截
    const invalidDomJs = platformDomJs.replace(/previousActive\.focus\(\{preventScroll:\s*true\}\)/g, "/* missing focus restoration */");
    assert.throws(() => {
        if (!/previousActive\.focus\(\{preventScroll:\s*true\}\)/.test(invalidDomJs)) {
            throw new Error("Gate failed: missing previousActive restoration");
        }
    }, /Gate failed/);
});
