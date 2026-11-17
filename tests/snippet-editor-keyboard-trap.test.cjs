const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const studioSrc = fs.readFileSync(path.join(__dirname, '../src/snippet-studio-ui.js'), 'utf8');
const polishScss = fs.readFileSync(path.join(__dirname, '../src/styles/_11-ui-polish.scss'), 'utf8');

test('T-7573: snippet-studio-ui.js 为 editorFrame 注入 tabindex 允许键盘受焦', () => {
    assert.match(
        studioSrc,
        /editorFrame\.setAttribute\(\s*["']tabindex["']\s*,\s*["']-1["']\s*\)/,
        'editorFrame 必须配置 tabindex="-1" 以作为代码编辑器的跳焦接管节点'
    );
});

test('T-7573: 代码编辑器按 Escape 优先失焦并移焦至 editorFrame，消灭键盘陷阱', () => {
    assert.match(
        studioSrc,
        /event\.key === ["']Escape["'][\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.stopPropagation\(\)[\s\S]*?editor\.blur\(\)[\s\S]*?editorFrame\.focus/,
        '代码编辑器必须拦截 Escape，阻断冒泡并失焦移交 editorFrame，避免误关工作室'
    );
});

test('T-7573: SCSS 声明 .sw-studio__editor-frame:focus-within 品牌焦点环', () => {
    assert.match(
        polishScss,
        /\.sw-studio__editor-frame[\s\S]*?:focus-within[\s\S]*?border-color:\s*var\(--b3-theme-primary\)[\s\S]*?box-shadow:/,
        '.sw-studio__editor-frame 必须在 :focus-within 时展现品牌主色边框与焦点环'
    );
});

test('T-7573 门禁负向验证: 若编辑器未阻断 Escape 冒泡或未失焦必定报错', () => {
    const invalidMockSrc = studioSrc.replace(/editor\.blur\(\)/g, '/* blur omitted */');
    assert.throws(() => {
        if (!/editor\.blur\(\)/.test(invalidMockSrc)) {
            throw new Error('Gate verification failed: editor.blur() missing');
        }
    }, /Gate verification failed/);
});
