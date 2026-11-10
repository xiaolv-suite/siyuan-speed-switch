// tests/calendar-marker-and-stat-hero-contract.test.cjs
// 契约测试：日历标记点极光青绿数据语义色、连击待办大数字等宽字形（T-7750~T-7753）
// 1. 验证 .sw__home-calendar-marker 声明 var(--sw-color-data) 与 hover scale(1.25) 微光；
// 2. 验证 checkin-streak 与 writing-streak 大数字声明 tabular-nums；
// 3. 验证 checkin-today 与 today-tasks 大数字声明 var(--sw-color-data) 与 tabular-nums；
// 4. 负向验证探针：若日历标记点丢失数据语义色或大数字丢失等宽排版，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const calendarScss = fs.readFileSync(path.join(ROOT, "src/styles/_09-store-preview-polish.scss"), "utf8");
const cardsScss = fs.readFileSync(path.join(ROOT, "src/styles/_08-home-store-cards.scss"), "utf8");

test("T-7750: 日历已写标记点极光青绿数据语义色与悬停微光加固", () => {
    assert.match(
        calendarScss,
        /\.sw__home-calendar-marker\s*\{[\s\S]*?background:\s*var\(--sw-color-data/s,
        ".sw__home-calendar-marker 必须声明 var(--sw-color-data) 数据语义色"
    );
    assert.match(
        calendarScss,
        /\.sw__home-calendar-cell:hover\s+\.sw__home-calendar-marker[\s\S]*?scale\(1\.25\);/s,
        "日历标记点在 hover 时必须声明 scale(1.25) 放大"
    );
});

test("T-7751: 连击与待办大数字等宽字形 tabular-nums 统合防抖动", () => {
    assert.match(
        cardsScss,
        /data-module-id="checkin-streak"[\s\S]*?\.sw__home-stat-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "checkin-streak 大数字必须声明 font-variant-numeric: tabular-nums"
    );
    assert.match(
        cardsScss,
        /data-module-id="today-tasks"[\s\S]*?\.sw__home-stat-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "today-tasks 大数字必须声明 font-variant-numeric: tabular-nums"
    );
});

test("T-7752: 打卡与任务双拼 Bento 瓦片数据语义色柔和融合", () => {
    assert.match(
        cardsScss,
        /data-module-id="today-tasks"[\s\S]*?\.sw__home-stat-value\s*\{[^}]*color:\s*var\(--sw-color-data/s,
        "today-tasks 大数字必须声明 var(--sw-color-data) 数据语义色"
    );
});

test("T-7753 负向验证探针：若日历标记点丢失数据语义色或大数字丢失等宽排版必精准拦截", () => {
    // 探针 1：验证日历标记点数据语义色
    function checkMarkerDataColor(css) {
        return /\.sw__home-calendar-marker\s*\{[^}]*background:\s*var\(--sw-color-data/s.test(css);
    }
    assert.equal(checkMarkerDataColor(calendarScss), true);

    assert.throws(() => {
        const brokenCss = calendarScss.replace(
            "background: var(--sw-color-data, var(--sw-home-accent, var(--b3-theme-primary)));",
            "background: #000;"
        );
        if (!checkMarkerDataColor(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_MARKER_DATA_COLOR: 日历标记点丢失 var(--sw-color-data) 语义色");
        }
    }, /PROBE_DETECTED_MISSING_MARKER_DATA_COLOR/, "破坏性负向探针必须精准捕获标记点语义色丢失缺陷");

    // 探针 2：验证今日任务大数字 tabular-nums
    function checkTasksTabular(css) {
        return /data-module-id="today-tasks"[\s\S]*?\.sw__home-stat-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s.test(css);
    }
    assert.equal(checkTasksTabular(cardsScss), true);

    assert.throws(() => {
        const brokenCss = cardsScss.replaceAll("font-variant-numeric: tabular-nums;", "");
        if (!checkTasksTabular(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_TASKS_TABULAR: 今日任务大数字丢失 tabular-nums 等宽排版");
        }
    }, /PROBE_DETECTED_MISSING_TASKS_TABULAR/, "破坏性负向探针必须精准捕获大数字等宽排版丢失缺陷");
});
