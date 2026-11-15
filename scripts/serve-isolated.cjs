/**
 * 隔离环境独立网页服务脚本 (Isolated Live Web Environment)
 *
 * 专门为用户拉起一个完全隔离的、带完整图形界面的真实思源桌面与移动端网页：
 * 1. 默认独立工作区位于 D:\思源插件配套\测试工作区\小驴雷切-isolated-preview，零触碰用户日常笔记本与 C 盘；
 * 2. 专属独立回环端口：43928（严格避开日常思源 6806、主进程 3727、小驴管家 43919、小驴人脉 43920、
 *    小驴考试 43921、小驴常用 43925、小驴打卡 43929/43930 与小驴拾遗 46919）；
 * 3. 挂载真实思源内核与官方 Web 前端：
 *    - 桌面端直达：http://127.0.0.1:43928/stage/build/desktop/
 *    - 移动端直达：http://127.0.0.1:43928/stage/build/mobile/
 * 4. 自动同步安装最新 dist/ 构建产物（小驴雷切 / siyuan-speed-switch），开启集市信任与插件预挂载；
 * 5. 自动预置测试笔记本、核心体验文档、初始收藏、命名文档集、历史记录与悬浮球首层快捷动作，开箱即用；
 * 6. 以后台独立进程守护运行（终端关闭不丢失，浏览器随时刷新体验）；
 * 7. 支持 node scripts/serve-isolated.cjs --stop 一键优雅退出清理。
 */
"use strict";

const {spawn, spawnSync, execSync} = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PLUGIN_ID = "siyuan-speed-switch";
const HOST = "127.0.0.1";

// 专属独立测试端口：43928
const PREFERRED_PORT = 43928;
// 严格避开其他插件与日常思源端口
const FORBIDDEN_PORTS = new Set([
    3727,   // 本机日常运行中思源主进程
    6806,   // 思源日常主端口
    14680,  // 思源备用端口
    43919,  // 小驴管家专属端口
    43920,  // 小驴人脉专属端口
    43921,  // 小驴考试专属端口
    43925,  // 小驴常用专属端口
    43929,  // 小驴打卡专属端口 (checkin)
    43930,  // 小驴打卡专属端口 (lv-cards)
    43939,  // 小驴快捷网关专属端口 (quickgate)
    46919,  // 小驴拾遗专属端口
]);

const INSTANCE_RECORD = path.join(ROOT, "scripts", ".last-live-instance.json");
const MARKER_FILE = "swss-isolated-preview.json";

function resolveWorkspace() {
    if (process.env.SIYUAN_LIVE_WS) return path.resolve(process.env.SIYUAN_LIVE_WS);
    // 默认测试数据与源码分开存放；其他环境沿用仓库旁目录与临时目录回退。
    if (process.platform === "win32" && fs.existsSync("D:\\")) {
        return path.join("D:\\思源插件配套", "测试工作区", "小驴雷切-isolated-preview");
    }
    const parentDir = path.dirname(ROOT);
    const dPreview = path.join(parentDir, "小驴雷切-isolated-preview");
    if (fs.existsSync(parentDir)) {
        return dPreview;
    }
    const dTemp = "D:\\Temp";
    if (fs.existsSync(dTemp) || fs.existsSync("D:\\")) {
        return path.join(dTemp, "siyuan-speed-switch-live-workspace");
    }
    return path.join(os.tmpdir(), "siyuan-speed-switch-live-workspace");
}
const WORKSPACE = resolveWorkspace();

const args = process.argv.slice(2);
const IS_STOP = args.includes("--stop");
const IS_RESTART = args.includes("--restart");
const IS_FRESH = args.includes("--fresh");

function checkPortFree(port) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.once("error", () => resolve(false));
        srv.listen({host: HOST, port, exclusive: true}, () => srv.close(() => resolve(true)));
    });
}

async function findAvailablePort(startPort = PREFERRED_PORT) {
    if (process.env.TEST_ISOLATED_PORT) {
        const p = Number(process.env.TEST_ISOLATED_PORT);
        if (!FORBIDDEN_PORTS.has(p) && (await checkPortFree(p))) return p;
    }
    if (!FORBIDDEN_PORTS.has(startPort) && (await checkPortFree(startPort))) return startPort;
    for (let p = startPort + 1; p < startPort + 60; p++) {
        if (FORBIDDEN_PORTS.has(p)) continue;
        if (await checkPortFree(p)) return p;
    }
    throw new Error("未找到可用的回环测试端口");
}

function resolveKernel() {
    const candidates = [
        process.env.SIYUAN_KERNEL,
        "D:\\RJ\\SiYuan\\resources\\kernel\\SiYuan-Kernel.exe",
        "D:\\biji\\SiYuan\\resources\\kernel\\SiYuan-Kernel.exe",
        path.join(process.env.ProgramFiles || "C:\\Program Files", "SiYuan", "resources", "kernel", "SiYuan-Kernel.exe"),
        path.join(os.homedir(), "AppData", "Local", "Programs", "SiYuan", "resources", "kernel", "SiYuan-Kernel.exe"),
    ].filter(Boolean);
    const kernel = candidates.find((c) => fs.existsSync(c));
    if (!kernel) throw new Error("未找到 SiYuan-Kernel.exe，可通过环境变量 SIYUAN_KERNEL 指定");
    const appDir = path.resolve(path.dirname(kernel), "..");
    for (const req of ["stage", "appearance"]) {
        if (!fs.existsSync(path.join(appDir, req))) {
            throw new Error(`思源 resources 缺少 ${req} 目录：${appDir}`);
        }
    }
    return {kernel, appDir};
}

async function probe(url) {
    try {
        const r = await fetch(`${url}/api/system/version`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: "{}",
            signal: AbortSignal.timeout(1500),
        });
        return r.ok ? await r.json() : null;
    } catch {
        return null;
    }
}

function killPid(pid) {
    if (!pid) return;
    try {
        if (process.platform === "win32") {
            spawnSync("cmd.exe", ["/c", `taskkill /pid ${pid} /T /F`], {stdio: "ignore"});
        } else {
            process.kill(pid, "SIGTERM");
        }
    } catch {}
}

async function stopLiveInstance() {
    let stopped = false;
    if (fs.existsSync(INSTANCE_RECORD)) {
        try {
            const info = JSON.parse(fs.readFileSync(INSTANCE_RECORD, "utf8"));
            if (info?.pid) {
                console.log(`[serve-isolated] 正在停止后台隔离内核（PID=${info.pid}，端口=${info.port}）…`);
                try {
                    await fetch(`http://${HOST}:${info.port}/api/system/exit`, {
                        method: "POST",
                        headers: {"Content-Type": "application/json", ...(info.token ? {Authorization: `Token ${info.token}`} : {})},
                        body: JSON.stringify({force: true}),
                        signal: AbortSignal.timeout(2000),
                    });
                } catch {}
                killPid(info.pid);
                stopped = true;
            }
        } catch {}
        try { fs.unlinkSync(INSTANCE_RECORD); } catch {}
    }
    if (stopped) {
        console.log("✔ 已成功停止隔离网页测试服务！");
    } else {
        console.log("ℹ 未发现运行中的隔离测试实例。");
    }
}

function copyDistToWorkspace(workspace) {
    console.log("[serve-isolated] 正在重新编译最新插件产物 dist/…");
    execSync("pnpm run build", {cwd: ROOT, stdio: "inherit"});
    const pluginDst = path.join(workspace, "data", "plugins", PLUGIN_ID);
    fs.rmSync(pluginDst, {recursive: true, force: true});
    fs.mkdirSync(pluginDst, {recursive: true});
    fs.cpSync(DIST, pluginDst, {recursive: true});
    // 确保根目录的 plugin.json 与 i18n 绝对存在
    const rootPluginJson = path.join(ROOT, "plugin.json");
    if (fs.existsSync(rootPluginJson)) {
        fs.copyFileSync(rootPluginJson, path.join(pluginDst, "plugin.json"));
    }
    const rootI18n = path.join(ROOT, "i18n");
    if (fs.existsSync(rootI18n)) {
        fs.cpSync(rootI18n, path.join(pluginDst, "i18n"), {recursive: true});
    }
    // 镜像 snippet-studio.js 保持异步块路径兼容
    const studioChunk = path.join(pluginDst, "snippet-studio.js");
    if (fs.existsSync(studioChunk)) {
        const nestedDist = path.join(pluginDst, "dist");
        fs.mkdirSync(nestedDist, {recursive: true});
        fs.copyFileSync(studioChunk, path.join(nestedDist, "snippet-studio.js"));
    }
}

function writePetalsConfig(workspace) {
    const petalsPath = path.join(workspace, "data", "storage", "petal", "petals.json");
    fs.mkdirSync(path.dirname(petalsPath), {recursive: true});
    const petals = [
        {
            name: PLUGIN_ID,
            displayName: "雷切",
            version: "0.48.87",
            enabled: true,
            incompatible: false,
            disabledInPublish: true,
            userDisabledInPublish: false,
            disallowInstall: false,
            js: "",
            css: "",
            i18n: null,
            kernel: {js: "", existed: true, incompatible: false},
        },
    ];
    fs.writeFileSync(petalsPath, JSON.stringify(petals, null, 2), "utf8");
}

function readWorkspaceToken(workspace) {
    try {
        const conf = JSON.parse(fs.readFileSync(path.join(workspace, "conf", "conf.json"), "utf8"));
        return conf?.api?.token || "";
    } catch {
        return "";
    }
}

async function api(base, token, route, body = {}) {
    const res = await fetch(`${base}${route}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? {Authorization: `Token ${token}`} : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
    });
    return res.json();
}

async function seedWorkspaceContent(base, token, workspace, port) {
    let nbId = "";
    try {
        const nbs = ((await api(base, token, "/api/notebook/lsNotebooks")).data?.notebooks ?? []).filter((n) => !n.closed);
        if (nbs.length > 0) {
            nbId = nbs[0].id;
        } else {
            const nbCreated = await api(base, token, "/api/notebook/createNotebook", {name: "雷切测试与体验空间"});
            nbId = nbCreated.data?.notebook?.id || nbCreated.data?.id || "";
            await new Promise((r) => setTimeout(r, 600));
        }
    } catch {}

    async function createDocWithRetry(nb, docPath, markdown) {
        for (let i = 0; i < 20; i++) {
            try {
                const res = await api(base, token, "/api/filetree/createDocWithMd", {
                    notebook: nb,
                    path: docPath,
                    markdown,
                });
                if (res && res.code === 0 && res.data) return String(res.data);
            } catch (_) {}
            await new Promise((r) => setTimeout(r, 250));
        }
        return "";
    }

    const docIds = {};
    if (nbId) {
        docIds.welcome = await createDocWithRetry(nbId, "/🚀 欢迎体验小驴雷切", `# 🚀 欢迎体验小驴雷切\n\n本页面运行在**完全隔离的独立思源内核环境**中（工作区严格位于 D 盘，专属端口 \`${port}\`，零触碰日常笔记数据）。\n\n## 🌟 核心功能快速体验指南\n\n### 1. 第一面板（切换器）\n- **快捷键呼出**：按 **Alt+W** 或点击顶栏雷切图标呼出第一面板。\n- **秒切跳转**：按数字键 **1 ~ 9** 秒切对应卡片序号；按 **空格** 或 **回车** 激活选中卡片。\n- **盲打即搜 (Type-to-Search)**：呼出面板后直接敲击键盘输入字母/文字（如输入 \`架构\` 或 \`待办\`），自动聚焦转入搜索过滤，无需鼠标先点搜索框。\n- **搜索辅助**：按 **\`/\`** 或 **Ctrl+F** 快速聚焦搜索框；按 **Backspace** 在搜索框无焦点时直接删减字符。\n- **多维过滤**：输入 \`#\` 按标签过滤，输入 \`@\` 按文档集过滤，输入 \`^\` 按段落块搜索。\n\n### 2. 悬浮球（全域触达中枢 · 尤其手机端优化）\n- **常驻位置**：右下角带有雷切悬浮球（可自由拖拽吸边）。\n- **中枢展开**：点击悬浮球展开全域触达抽屉，顶部提供 5 档单手分类胶囊：\n  \`全部\` | \`动作\` | \`页签\` | \`收藏\` | \`最近\`\n- **全量直达**：可直接触达当前端全量动作、思源全局面板、实时已开页签、收藏文档、最近与刚关闭恢复、命名文档集。\n- **首层快捷钉**：动作行右侧带 **☆/★** 按钮，点击即可一键将该动作钉到首层快捷圈。\n- **移动端防误触与手势**：展开抽屉不自动弹起虚拟键盘；点击背景遮罩防穿透；在顶部手柄区域单手轻滑（向下滑动 >= 42px）即可平滑收起抽屉。\n\n---\n*欢迎在当前网页中体验与走查！*`);

        docIds.architecture = await createDocWithRetry(nbId, "/📑 架构演进与设计决策 (ADR-0535)", `# 📑 架构演进与设计决策 (ADR-0535)\n\n## 核心设计决策\n1. **缩略图双阶段批量渲染**：Phase 1 纯读（测量容器 clientWidth），Phase 2 纯写（批量设置 style.transform），彻底消除了 N 次强制同步回流。\n2. **增量 SVG 钳制**：通过 MutationObserver 仅收集新挂载子树中的图标，杜绝全局 DOM 遍历。\n3. **盲打即搜机制**：保持卡片首选焦点，捕获可打印字符平滑转入搜索框。\n4. **移动端软键盘抑制**：展开抽屉时聚焦抽屉容器本身，避免移动端输入法弹起遮挡屏幕。\n\n\`\`\`typescript\n// 两阶段缩略图缩放示意\nconst batch = pendingScales.splice(0);\nconst measured = batch.map(b => ({ el: b.content, w: b.thumb.clientWidth }));\nmeasured.forEach(({ el, w }) => {\n    if (w > 0) el.style.transform = \`scale(\${(w / 360).toFixed(3)})\`;\n    el.style.visibility = "visible";\n});\n\`\`\``);

        docIds.tasks = await createDocWithRetry(nbId, "/⚡ 核心效率与任务清单", `# ⚡ 核心效率与任务清单 #速切# #效率# #雷切#\n\n- [x] 完成第一面板性能提速与批量回流消除\n- [x] 实施卡片默认焦点盲打即搜（Type-to-Search）\n- [x] 升级悬浮球为全域触达中枢\n- [x] 实现手机端零误弹输入法与单手下滑手势\n- [ ] 根据用户独立网页测试反馈进行针对性调整`);

        docIds.ideas = await createDocWithRetry(nbId, "/💡 创意笔记与闪念速记", `# 💡 创意笔记与闪念速记\n\n> 好的工具应当让用户感觉不到阻碍，第一面板秒开，悬浮球随手触达。\n\n这里是临时闪念与记录区，支持在悬浮球中直接通过“快速记录”动作写入内容。`);
    }

    // 预置雷切持久化配置：开启悬浮球、预置收藏、命名文档集与历史数据
    const storageDir = path.join(workspace, "data", "storage", "petal", PLUGIN_ID);
    fs.mkdirSync(storageDir, {recursive: true});

    function writeStorage(dir, key, data) {
        const jsonStr = JSON.stringify(data, null, 2);
        fs.writeFileSync(path.join(dir, key), jsonStr, "utf8");
        fs.writeFileSync(path.join(dir, `${key}.json`), jsonStr, "utf8");
    }

    // 1. 设置配置：开启悬浮球在桌面端与手机端显示，工作台默认全屏
    const settings = {
        homeSizeMode: "fullscreen",
        studioSizeMode: "fullscreen",
        appearance: {
            theme: "auto",
            panelScale: 1,
            showDocIcon: true,
        },
        behavior: {
            hotkey: "Alt+W",
        },
        moduleVisibility: {
            workbench: true,
            studio: true,
            floatingBall: true,
        },
        floatingBall: {
            schemaVersion: 2,
            enabled: {desktop: true, mobile: true, sidebar: true},
            appearance: {
                size: 48,
                marginPx: 12,
                idleOpacity: 0.85,
                halfHide: false,
                idleDelayMs: 5000,
            },
            clickAction: {desktop: "more", mobile: "more", sidebar: "more"},
            actions: {
                desktop: [
                    {actionId: "quick-capture", enabled: true, firstLayer: true, order: 10},
                    {actionId: "journal", enabled: true, firstLayer: true, order: 20},
                    {actionId: "search", enabled: true, firstLayer: true, order: 30},
                    {actionId: "recent-closed", enabled: true, firstLayer: true, order: 40},
                ],
                mobile: [
                    {actionId: "quick-capture", enabled: true, firstLayer: true, order: 10},
                    {actionId: "journal", enabled: true, firstLayer: true, order: 20},
                    {actionId: "search", enabled: true, firstLayer: true, order: 30},
                    {actionId: "recent-closed", enabled: true, firstLayer: true, order: 40},
                ],
            },
        },
    };
    writeStorage(storageDir, "sw_settings", settings);

    // 2. 预置收藏文档
    const favorites = [
        {key: docIds.welcome || "demo-welcome", title: "🚀 欢迎体验小驴雷切", group: "核心指引"},
        {key: docIds.architecture || "demo-arch", title: "📑 架构演进与设计决策 (ADR-0535)", group: "架构设计"},
        {key: docIds.tasks || "demo-tasks", title: "⚡ 核心效率与任务清单", group: "待办清单"},
    ].filter((f) => f.key);
    writeStorage(storageDir, "sw_favorites", favorites);

    // 3. 预置命名文档集
    const docSets = [
        {
            setId: "set-demo-core",
            name: "⭐ 核心速查文档集",
            entries: [
                {rootId: docIds.welcome || "", title: "🚀 欢迎体验小驴雷切"},
                {rootId: docIds.architecture || "", title: "📑 架构演进与设计决策 (ADR-0535)"},
                {rootId: docIds.tasks || "", title: "⚡ 核心效率与任务清单"},
            ].filter((e) => e.rootId),
        },
    ];
    writeStorage(storageDir, "sw_document_sets", docSets);

    // 4. 预置打开历史与刚关闭历史（让悬浮球“最近”分类开箱即有数据）
    const now = Date.now();
    const history = [
        {key: docIds.welcome || "", rootId: docIds.welcome || "", title: "🚀 欢迎体验小驴雷切", time: now},
        {key: docIds.architecture || "", rootId: docIds.architecture || "", title: "📑 架构演进与设计决策 (ADR-0535)", time: now - 60000},
        {key: docIds.tasks || "", rootId: docIds.tasks || "", title: "⚡ 核心效率与任务清单", time: now - 120000},
        {key: docIds.ideas || "", rootId: docIds.ideas || "", title: "💡 创意笔记与闪念速记", time: now - 180000},
    ].filter((h) => h.key);
    writeStorage(storageDir, "sw_open_history", history);

    const closedHistory = [
        {rootId: docIds.ideas || "demo-ideas", title: "💡 创意笔记与闪念速记", closedAt: now - 30000},
    ];
    writeStorage(storageDir, "sw_closed_history", closedHistory);

    // 5. 预置第二面板现代化黄金 5 卡 Bento 布局
    const homeState = {
        schemaVersion: 2,
        defaultsVersion: 2,
        instances: [
            {instanceId: "external-local-time", moduleId: "external-local-time", enabled: true, config: {}},
            {instanceId: "year-progress", moduleId: "year-progress", enabled: true, config: {}},
            {instanceId: "today-journal", moduleId: "today-journal", enabled: true, config: {}},
            {instanceId: "today-tasks", moduleId: "today-tasks", enabled: true, config: {}},
            {instanceId: "recent-documents", moduleId: "recent-documents", enabled: true, config: {}},
        ],
        layouts: {
            desktop: [
                {instanceId: "external-local-time", x: 0, y: 0, w: 4, h: 3, size: "small", collapsed: false},
                {instanceId: "year-progress", x: 4, y: 0, w: 4, h: 3, size: "small", collapsed: false},
                {instanceId: "today-journal", x: 8, y: 0, w: 4, h: 3, size: "small", collapsed: false},
                {instanceId: "today-tasks", x: 0, y: 3, w: 6, h: 3, size: "medium", collapsed: false},
                {instanceId: "recent-documents", x: 6, y: 3, w: 6, h: 3, size: "medium", collapsed: false},
            ],
            mobile: [
                {instanceId: "external-local-time", x: 0, y: 0, w: 12, h: 3, size: "medium", collapsed: false},
                {instanceId: "year-progress", x: 0, y: 3, w: 12, h: 3, size: "medium", collapsed: false},
                {instanceId: "today-tasks", x: 0, y: 6, w: 12, h: 3, size: "medium", collapsed: false},
                {instanceId: "today-journal", x: 0, y: 9, w: 12, h: 3, size: "medium", collapsed: false},
                {instanceId: "recent-documents", x: 0, y: 12, w: 12, h: 3, size: "medium", collapsed: false},
            ],
        },
    };
    writeStorage(storageDir, "sw_home_state", homeState);

    // 重新通知前端重载插件以载入最新持久化数据
    for (const frontend of ["desktop", "browser-desktop", "mobile", "browser-mobile"]) {
        try {
            await api(base, token, "/api/petal/setPetalEnabled", {frontend, packageName: PLUGIN_ID, enabled: false});
            await api(base, token, "/api/petal/setPetalEnabled", {frontend, packageName: PLUGIN_ID, enabled: true});
        } catch {}
    }
}

async function main() {
    if (IS_STOP) {
        await stopLiveInstance();
        return;
    }

    if (!IS_RESTART && fs.existsSync(INSTANCE_RECORD)) {
        try {
            const info = JSON.parse(fs.readFileSync(INSTANCE_RECORD, "utf8"));
            const alive = await probe(`http://${HOST}:${info.port}`);
            if (alive) {
                const token = readWorkspaceToken(info.workspace || WORKSPACE);
                await seedWorkspaceContent(`http://${HOST}:${info.port}`, token, info.workspace || WORKSPACE, info.port);
                console.log("\n======================================================================");
                console.log(" ⚡ 小驴雷切 · 隔离环境独立网页服务已在后台运行中：");
                console.log(` 🌐 桌面端直达链接: ${info.url}`);
                console.log(` 📱 手机端直达链接: ${info.mobileUrl}`);
                console.log(` 📡 隔离内核地址:   http://${HOST}:${info.port}`);
                console.log(` 📂 隔离工作区:     ${info.workspace}`);
                console.log(` 🛑 停止服务命令:   pnpm run serve:isolated --stop`);
                console.log("======================================================================\n");
                return;
            }
        } catch {}
    }

    if (IS_RESTART) {
        await stopLiveInstance();
    }

    const {kernel, appDir} = resolveKernel();
    const port = await findAvailablePort(PREFERRED_PORT);
    const base = `http://${HOST}:${port}`;
    const desktopUrl = `${base}/stage/build/desktop/`;
    const mobileUrl = `${base}/stage/build/mobile/`;

    if (IS_FRESH && fs.existsSync(WORKSPACE)) {
        try { fs.rmSync(WORKSPACE, {recursive: true, force: true}); } catch {}
    }
    fs.mkdirSync(WORKSPACE, {recursive: true});

    // 写入安全标记文件，确保永不误伤用户真实数据
    fs.writeFileSync(
        path.join(WORKSPACE, MARKER_FILE),
        JSON.stringify({
            createdBy: "siyuan-speed-switch-serve-isolated",
            createdAt: new Date().toISOString(),
            plugin: PLUGIN_ID,
            workspace: WORKSPACE,
        }, null, 2),
        "utf8"
    );

    // 预写入 conf.json（保证初次冷启动即信任集市插件并设置中文）
    const confPath = path.join(WORKSPACE, "conf", "conf.json");
    let conf = {};
    if (fs.existsSync(confPath)) {
        try { conf = JSON.parse(fs.readFileSync(confPath, "utf8")); } catch {}
    }
    conf.bazaar = conf.bazaar || {};
    conf.bazaar.trust = true;
    conf.bazaar.petal = true;
    conf.lang = "zh_CN";
    conf.accessAuthCode = "";
    fs.mkdirSync(path.dirname(confPath), {recursive: true});
    fs.writeFileSync(confPath, JSON.stringify(conf, null, 2), "utf8");

    copyDistToWorkspace(WORKSPACE);
    writePetalsConfig(WORKSPACE);

    console.log(`[serve-isolated] 准备启动独立思源实例（端口=${port}，工作区=${WORKSPACE}）…`);

    const logPath = path.join(WORKSPACE, "kernel.log");
    const logFd = fs.openSync(logPath, "a");

    const child = spawn(
        kernel,
        ["serve", "--workspace", WORKSPACE, "--wd", appDir, "--port", String(port), "--lang", "zh-CN"],
        {
            stdio: ["ignore", logFd, logFd],
            detached: true,
            windowsHide: true,
        }
    );
    child.unref();
    const pid = child.pid;

    let isReady = false;
    for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 600));
        if (await probe(base)) { isReady = true; break; }
    }
    if (!isReady) {
        if (pid) killPid(pid);
        throw new Error(`隔离思源内核启动超时 (${base})，请查看日志：${logPath}`);
    }

    const token = readWorkspaceToken(WORKSPACE);
    // 确保插件已在桌面端、桌面浏览器与移动前端挂载
    for (const frontend of ["desktop", "browser-desktop", "mobile", "browser-mobile"]) {
        try {
            await api(base, token, "/api/petal/setPetalEnabled", {frontend, packageName: PLUGIN_ID, enabled: true});
        } catch {}
    }

    await seedWorkspaceContent(base, token, WORKSPACE, port);

    // 写入运行实例信息
    const instanceInfo = {
        pid,
        port,
        workspace: WORKSPACE,
        url: desktopUrl,
        mobileUrl,
        startedAt: new Date().toISOString(),
    };
    fs.writeFileSync(INSTANCE_RECORD, JSON.stringify(instanceInfo, null, 2), "utf8");

    console.log("\n======================================================================");
    console.log(" ⚡ 小驴雷切 · 隔离环境独立网页服务启动成功！");
    console.log(` 🌐 桌面端直达链接: ${desktopUrl}`);
    console.log(` 📱 手机端直达链接: ${mobileUrl}`);
    console.log(` 📡 隔离内核地址:   http://${HOST}:${port}`);
    console.log(` 📂 隔离工作区:     ${WORKSPACE}`);
    console.log(" 💡 重点提示: 若浏览器之前打开过，请在页面中按 Ctrl+F5（或 Cmd+Shift+R）强制刷新清除本地脚本缓存！");
    console.log(` 🛑 停止服务命令:   pnpm run serve:isolated --stop`);
    console.log("======================================================================\n");
}

module.exports = {
    resolveWorkspace,
    findAvailablePort,
    resolveKernel,
    stopLiveInstance,
    PREFERRED_PORT,
    FORBIDDEN_PORTS,
    WORKSPACE,
};

if (require.main === module) {
    main().catch((err) => {
        console.error("启动失败:", err);
        process.exit(1);
    });
}
