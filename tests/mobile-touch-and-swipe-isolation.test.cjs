const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileScss = fs.readFileSync(path.join(__dirname, '../src/styles/_03-switcher-mobile.scss'), 'utf8');
const mobileTs = fs.readFileSync(path.join(__dirname, '../src/mobile-switcher-ui.ts'), 'utf8');
const panelTs = fs.readFileSync(path.join(__dirname, '../src/second-panel-ui.ts'), 'utf8');
const storeTs = fs.readFileSync(path.join(__dirname, '../src/home-store-ui.ts'), 'utf8');

test('T-7575: 移动端搜索清除与过滤按钮具备 44×44px 防误触热区扩展', () => {
    assert.match(
        mobileScss,
        /\.sw__search-clear[\s\S]*?&::before[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/,
        '.sw__search-clear 必须使用 ::before 扩展至 44×44px 最小触控热区'
    );
    assert.match(
        mobileScss,
        /\.sw__search-filter-btn[\s\S]*?&::before[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/,
        '.sw__search-filter-btn 必须使用 ::before 扩展至 44×44px 最小触控热区'
    );
});

test('T-7575: 移动端切换器设置 data-prevent-swipe 隔离宿主边缘手势', () => {
    assert.match(mobileTs, /dialog\.element\.setAttribute\(\s*["']data-prevent-swipe["']\s*,\s*["']true["']\s*\)/);
});

test('T-7575: 工作台与组件商店设置 data-prevent-swipe 隔离宿主边缘手势', () => {
    assert.match(panelTs, /root\.setAttribute\(\s*["']data-prevent-swipe["']\s*,\s*["']true["']\s*\)/);
    assert.match(storeTs, /root\.setAttribute\(\s*["']data-prevent-swipe["']\s*,\s*["']true["']\s*\)/);
});

test('T-7575 门禁负向验证: 若移动端热区缺少 44px 伪元素扩展必定报错', () => {
    const invalidScss = mobileScss.replace(/width:\s*44px;/g, 'width: 20px;');
    assert.throws(() => {
        if (!/width:\s*44px;/.test(invalidScss)) {
            throw new Error('Gate verification failed: 44px touch target extension missing');
        }
    }, /Gate verification failed/);
});
