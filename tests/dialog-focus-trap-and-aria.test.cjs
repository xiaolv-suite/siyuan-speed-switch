const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const platformDomSrc = fs.readFileSync(path.join(__dirname, '../src/platform-dom.js'), 'utf8');
const {trapDialogFocus, mountPlatformDialogTitleWrap} = require('../src/platform-dom.js');

test('T-7576: platform-dom.js 导出 trapDialogFocus 并在 mountPlatformDialogTitleWrap 中自动挂载', () => {
    assert.equal(typeof trapDialogFocus, 'function', 'trapDialogFocus 必须导出');
    assert.match(
        platformDomSrc,
        /mountPlatformDialogTitleWrap[\s\S]*?trapDialogFocus\(\s*container\s*\)/,
        'mountPlatformDialogTitleWrap 必须为所有二级弹窗自动挂载焦点陷阱'
    );
});

test('T-7576: trapDialogFocus 确保 Tab 与 Shift+Tab 在弹窗内部循环', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="dialog" class="sw-platform-dialog"><button id="btn1">1</button><input id="inp" type="text" /><button id="btn2">2</button></div><button id="outside">out</button></body></html>');
    const {document} = dom.window;
    const dialog = document.getElementById('dialog');
    const btn1 = document.getElementById('btn1');
    const inp = document.getElementById('inp');
    const btn2 = document.getElementById('btn2');
    const outside = document.getElementById('outside');

    const cleanup = trapDialogFocus(dialog);

    // 1. Shift+Tab on first element wraps to last element (btn2)
    btn1.focus();
    assert.equal(document.activeElement, btn1);
    const shiftTabEvent = new dom.window.KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true});
    btn1.dispatchEvent(shiftTabEvent);
    assert.equal(shiftTabEvent.defaultPrevented, true);
    assert.equal(document.activeElement, btn2);

    // 2. Tab on last element wraps to first element (btn1)
    btn2.focus();
    assert.equal(document.activeElement, btn2);
    const tabEvent = new dom.window.KeyboardEvent('keydown', {key: 'Tab', shiftKey: false, bubbles: true, cancelable: true});
    btn2.dispatchEvent(tabEvent);
    assert.equal(tabEvent.defaultPrevented, true);
    assert.equal(document.activeElement, btn1);

    // 3. Tab on middle element is allowed normally
    inp.focus();
    const middleTabEvent = new dom.window.KeyboardEvent('keydown', {key: 'Tab', shiftKey: false, bubbles: true, cancelable: true});
    inp.dispatchEvent(middleTabEvent);
    assert.equal(middleTabEvent.defaultPrevented, false);

    // 4. Cleanup releases listener
    cleanup();
    btn2.focus();
    const afterCleanupEvent = new dom.window.KeyboardEvent('keydown', {key: 'Tab', shiftKey: false, bubbles: true, cancelable: true});
    btn2.dispatchEvent(afterCleanupEvent);
    assert.equal(afterCleanupEvent.defaultPrevented, false);

    dom.window.close();
});

test('T-7576 门禁负向验证: 若焦点捕获未阻止默认行为必定报错', () => {
    const invalidMockSrc = platformDomSrc.replace(/trapDialogFocus\(\s*container\s*\)/g, '/* trapDialogFocus omitted */');
    assert.throws(() => {
        if (!/trapDialogFocus\(\s*container\s*\)/.test(invalidMockSrc)) {
            throw new Error('Gate verification failed: trapDialogFocus omitted in mountPlatformDialogTitleWrap');
        }
    }, /Gate verification failed/);
});
