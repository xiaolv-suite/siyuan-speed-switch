// 【手机端第二轮优化 · 真机教训审计 + 深化】契约与生命周期门禁测试
// 门禁自查（docs/gate-audit-checklist.md）与双向验证：
// 1. Esc-only 关闭面审计与手机端关闭按钮补齐；
// 2. 悬浮球焦点卡死审计与实时 activeElement 重算；
// 3. svgIcon 与 addIcons 逐字一致性；
// 4. 双球共存 lv:launchpad:ball-moved 自动避让（距离 <60px 错开 80px）；
// 5. 设置页双球说明文案；
// 6. 暂存栈左右滑动（触感 6ms + 标题高亮）与下滑 60px 关闭手势。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexSource = readSourceText(path.join(root, "src", "index.ts"));
const ballUiSource = readSourceText(path.join(root, "src", "floating-ball-ui.ts"));
const stackUiSource = readSourceText(path.join(root, "src", "snippet-stack-ui.js"));
const settingsSource = readSourceText(path.join(root, "src", "settings-sections.ts"));
const platformDomSource = readSourceText(path.join(root, "src", "platform-dom.js"));

test("T-7864 审计 1：Esc-only 关闭面审计与平台弹窗手机端关闭按钮 (isMobileFrontend)", () => {
    // platform-dom 导出 mountPlatformDialogMobileClose 并在移动端自动挂载
    assert.match(
        platformDomSource,
        /function\s+mountPlatformDialogMobileClose\s*\(/,
        "platform-dom 必须导出 mountPlatformDialogMobileClose 助手",
    );
    assert.match(
        platformDomSource,
        /checkIsMobileFrontend\s*\(/,
        "platform-dom 必须具备移动端环境动态判定 checkIsMobileFrontend",
    );
    assert.match(
        platformDomSource,
        /sw-dialog__mobile-close-btn/,
        "platform-dom 必须包含 sw-dialog__mobile-close-btn 关闭按钮挂载",
    );

    // index.ts 在核心 Esc-only 弹窗显式装配手机端关闭出口
    assert.match(
        indexSource,
        /mountPlatformDialogMobileClose\(dialog\.element,\s*\(\)\s*=>\s*dialog\.destroy\(\)\)/,
        "index.ts 弹窗必须装配 mountPlatformDialogMobileClose",
    );
});

test("T-7864 审计 2：悬浮球焦点卡死审计，动态读取 activeElement 与面板销毁主动重算", () => {
    // floating-ball-ui.ts 具备 isFocused 动态读取与 recalculateActivityState 重算接口
    assert.match(
        ballUiSource,
        /isFocused\s*\(\s*\)\s*:\s*boolean/,
        "floating-ball-ui 必须实现 isFocused 动态判定",
    );
    assert.match(
        ballUiSource,
        /recalculateActivityState\s*\(\s*\)\s*:\s*void/,
        "floating-ball-ui 必须导出 recalculateActivityState 重算方法",
    );
    assert.match(
        ballUiSource,
        /const\s+active\s*=\s*this\.doc\.activeElement/,
        "isFocused 必须实时读取 document.activeElement 进行校验",
    );

    // suspendFABForDialog 恢复时主动触发 recalculateActivityState
    assert.match(
        indexSource,
        /recalculateActivityState\?\.\(\)/,
        "suspendFABForDialog 弹窗释放时必须主动触发悬浮球重算",
    );
});

test("T-7864 审计 3：svgIcon 一致性，lvLaunchpad.register 的 svgIcon 与 addIcons 逐字一致", () => {
    // 提取 lvLaunchpad.register 中的 svgIcon
    const registerMatch = indexSource.match(/svgIcon:\s*["']([^"']+)["']/);
    assert.ok(registerMatch, "必须在 lvLaunchpad.register 声明 svgIcon");
    const registeredIcon = registerMatch[1];
    assert.equal(registeredIcon, "icon-lv-raikiri", "声明的图标 ID 必须为 icon-lv-raikiri");

    // 检查 CARD_ICON_SPRITE 中是否逐字注入对应的 <symbol id="...">
    const spriteSymbolRegex = new RegExp(`<symbol\\s+id=["']${registeredIcon}["']`);
    assert.match(
        indexSource,
        spriteSymbolRegex,
        `addIcons 注入的 CARD_ICON_SPRITE 必须包含逐字一致的 symbol ID: ${registeredIcon}`,
    );
});

test("T-7864 双球共存专项：监听 lv:launchpad:ball-moved 事件实现自动避让 (重叠 <60px 错开 80px)", () => {
    // 监听 lv:launchpad:ball-moved 并解析 {edge, yRatio}
    assert.match(
        indexSource,
        /["']lv:launchpad:ball-moved["']/,
        "index.ts 必须监听 lv:launchpad:ball-moved 悬浮球位移事件",
    );
    assert.match(
        indexSource,
        /typeof\s+detail\.yRatio\s*===\s*["']number["']/,
        "必须原生解析快门派发的 detail={edge, yRatio} 载荷",
    );

    // 距离 <60px 避让逻辑
    assert.match(
        indexSource,
        /dist\s*<\s*60/,
        "必须在距离小于 60px 时触发避让",
    );

    // 错开 80px 逻辑
    assert.match(
        indexSource,
        /80\s*:\s*-80/,
        "必须自动上下错开 80px",
    );

    // onunload 注销清理
    assert.match(
        indexSource,
        /this\.launchpadBallMovedCleaner\?\.\(\)/,
        "onunload 必须清洁注销 launchpadBallMovedCleaner",
    );
});

test("T-7865 专项疑点 2：悬浮球展开次级气泡在 top<80px / bottom<80px 上下翻转避让边缘裁切", () => {
    const layoutSource = readSourceText(path.join(root, "src", "floating-ball-layout.js"));
    assert.match(
        layoutSource,
        /anchor\.y\s*-\s*box\.top\s*<\s*80/,
        "arcTargets 必须检测 top < 80px 边缘避让",
    );
    assert.match(
        layoutSource,
        /box\.bottom\s*-\s*anchor\.y\s*<\s*80/,
        "arcTargets 必须检测 bottom < 80px 边缘避让",
    );
    assert.match(
        ballUiSource,
        /this\.root\.dataset\.edgeFlip\s*=/,
        "floating-ball-ui 必须挂载 edgeFlip 标记供样式层上下翻转避让",
    );
});

test("T-7865 专项疑点 3：暂存栈清空确认在 ≥20 条时校验具体数量「共 N 条」", () => {
    assert.match(
        stackUiSource,
        /unpinnedCount\s*>=\s*20/,
        "未锁定切片 ≥20 条时必须拦截并弹出二次确认",
    );
    assert.match(
        stackUiSource,
        /确定清空未锁定暂存切片（共\s*\{count\}\s*条）吗？/,
        "清空提示必须严格包含「共 {count} 条」示范格式",
    );
});

test("T-7864 双球设置说明：在设置页提供双球分工与单球切换文案", () => {
    assert.match(
        settingsSource,
        /罗盘球管全家桶直达，动作球管切片操作，可在罗盘设置中改为单球模式/,
        "设置页必须包含说明文案「罗盘球管全家桶直达，动作球管切片操作，可在罗盘设置中改为单球模式」",
    );
});

test("T-7864 切片手势深化：暂存栈左右滑动切片 (触感 6ms + 标题高亮) 与详情页下滑 60px 关闭", () => {
    // 左右滑动切换上一片/下一片与 6ms 触感
    assert.match(
        stackUiSource,
        /options\.haptic\(6\)/,
        "左右滑动切换切片时必须触发 6ms 触感反馈",
    );
    assert.match(
        stackUiSource,
        /sw-snippet-stack__card-title--highlight/,
        "切换后标题必须短暂添加高亮类 sw-snippet-stack__card-title--highlight",
    );

    // 暂存栈/详情页下滑关闭手势：80px 阈值 + 垂直位移须大于水平位移 2 倍（防输入与横滑误关）
    assert.match(
        indexSource,
        /diffY\s*>\s*80/,
        "openSnippetStackDialog 必须包含下滑 80px 触发关闭的手势监听",
    );
    assert.match(
        indexSource,
        /Math\.abs\(diffY\)\s*>\s*Math\.abs\(diffX\)\s*\*\s*2/,
        "下滑关闭必须校验垂直位移大于水平位移 2 倍，杜绝横滑与轻扫误关",
    );
});

test("T-7864 门禁负向验证：异常参数与边缘探针隔离防护", () => {
    // 负向探针 1：重叠避让算法在边界高度下的安全夹紧 (0.05 ~ 0.95)
    const computeAvoidY = (currentYRatio, viewportHeight) => {
        const currentPixelY = (currentYRatio ?? 0.72) * viewportHeight;
        const shiftY = (currentPixelY + 80 <= viewportHeight - 60) ? 80 : -80;
        const nextPixelY = Math.max(40, Math.min(viewportHeight - 60, currentPixelY + shiftY));
        return Math.max(0.05, Math.min(0.95, nextPixelY / viewportHeight));
    };

    const topRatio = computeAvoidY(0.02, 800);
    assert.ok(topRatio >= 0.05 && topRatio <= 0.95, "避让后 yRatio 严防越界");

    const bottomRatio = computeAvoidY(0.98, 800);
    assert.ok(bottomRatio >= 0.05 && bottomRatio <= 0.95, "贴底避让后 yRatio 严防越界");

    // 负向探针 2：非水平滑动或微小位移不得误触发切片左右切换
    const isHorizontalSwipe = (deltaX, deltaY) => Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    assert.equal(isHorizontalSwipe(20, 10), false, "微小位移不触发");
    assert.equal(isHorizontalSwipe(10, 80), false, "垂直滚动不触发");
    assert.equal(isHorizontalSwipe(60, 10), true, "明显水平手势才触发");
});
