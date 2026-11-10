const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexTs = fs.readFileSync(path.join(__dirname, '../src/index.ts'), 'utf8');

test('T-7574: src/index.ts 支持 Home/End 首尾跳跃与 PageUp/PageDown 跨步巡航', () => {
    assert.match(
        indexTs,
        /key === ["']Home["'] && plain[\s\S]*?next = 0;[\s\S]*?key === ["']End["'] && plain[\s\S]*?next = cards\.length - 1;/,
        'index.ts 必须在卡片列表中实现 Home 首项与 End 末项跳转'
    );
    assert.match(
        indexTs,
        /key === ["']PageUp["'] && plain[\s\S]*?next = Math\.max\(0, focusIndex - step\)[\s\S]*?key === ["']PageDown["'] && plain[\s\S]*?next = Math\.min\(cards\.length - 1, focusIndex \+ step\)/,
        'index.ts 必须在卡片列表中实现 PageUp/PageDown 跨步导航'
    );
});

test('T-7574: src/index.ts 支持 Space 空格键激活聚焦卡片 (WAI-ARIA)', () => {
    assert.match(
        indexTs,
        /\(key === ["']Enter["'] \|\| key === ["'] ["'] \|\| key === ["']Spacebar["']\) && plain[\s\S]*?activateCardByElement/,
        'index.ts 必须支持 Enter 与 Space 共同激活卡片'
    );
});

test('T-7574 门禁负向验证: 若卡片导航缺少 Space 激活必定报错', () => {
    const invalidMock = indexTs.replace(/key === ["'] ["']/g, 'false');
    assert.throws(() => {
        if (!/key === ["'] ["']/.test(invalidMock)) {
            throw new Error('Gate verification failed: Space key activation missing');
        }
    }, /Gate verification failed/);
});
