"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {spawn, spawnSync} = require("node:child_process");

const isWin = process.platform === "win32";
const repoRoot = path.resolve(__dirname, "..", "..");
const baseTmpE2eDir = path.join(repoRoot, ".tmp", "e2e");

const trackedPids = new Set();
const trackedProfiles = new Set();
let exitHooksRegistered = false;

function killProcessTreeSync(pid) {
    if (!pid || typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return;
    try {
        if (isWin) {
            spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
                windowsHide: true,
                stdio: "ignore",
            });
        } else {
            spawnSync("kill", ["-9", String(pid)], {
                stdio: "ignore",
            });
        }
    } catch (_) {
        // 幂等设计：重复调用或已被杀死的进程不抛错
    } finally {
        trackedPids.delete(pid);
    }
}

function cleanupProfileDirSync(profileDir) {
    if (!profileDir || typeof profileDir !== "string") return;
    try {
        if (fs.existsSync(profileDir)) {
            fs.rmSync(profileDir, {
                recursive: true,
                force: true,
                maxRetries: 3,
                retryDelay: 100,
            });
        }
    } catch (_) {
        // 幂等忽略
    } finally {
        trackedProfiles.delete(profileDir);
    }
}

function cleanupAllSync() {
    for (const pid of Array.from(trackedPids)) {
        killProcessTreeSync(pid);
    }
    for (const profile of Array.from(trackedProfiles)) {
        cleanupProfileDirSync(profile);
    }
}

function registerExitHooksOnce() {
    if (exitHooksRegistered) return;
    exitHooksRegistered = true;

    process.on("exit", () => {
        cleanupAllSync();
    });

    process.on("SIGINT", () => {
        cleanupAllSync();
        process.exit(130);
    });

    process.on("SIGTERM", () => {
        cleanupAllSync();
        process.exit(143);
    });

    process.on("uncaughtException", (error) => {
        console.error("Fatal uncaughtException in browser test runner, killing browser processes:", error);
        cleanupAllSync();
        process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
        console.error("Fatal unhandledRejection in browser test runner, killing browser processes:", reason);
        cleanupAllSync();
        process.exit(1);
    });
}

// 浏览器可执行文件解析——全体 e2e 套件的唯一来源。
//
// 历史上这里把 msedge 排在 Chrome 前面，于是每个浏览器套件默认拉起的都是 Edge。
// 本机 msedge.exe 是 BugCheck 0x1A MEMORY_MANAGEMENT 的固定崩溃现场（栈顶恒为
// msedge.exe -> nt!MiWalkEntireImage），必须让自动化彻底绕开它。
//
// 解析优先级：
//   1. BROWSER_PATH —— 显式指定，最高优先级（CI 或个别机器需要特例时使用）
//   2. Chrome 系列 —— 环境变量推导 + 常见安装路径 + 各平台位置
//   3. Edge —— 仅在显式设置 BROWSER_ALLOW_EDGE=1 时才进候选，默认永不启用
//
// 找不到 Chrome 时直接报错，不做静默降级：宁可让套件红，也不要悄悄把 Edge 拉起来。
function resolveBrowserExecutable() {
    const explicit = process.env.BROWSER_PATH;
    if (explicit) {
        if (!fs.existsSync(explicit)) {
            throw new Error(`BROWSER_PATH 指向的浏览器不存在：${explicit}`);
        }
        return explicit;
    }

    const chromeCandidates = [
        process.env.CHROME_PATH,
        process.env.ProgramFiles && path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
        process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ].filter(Boolean);
    const chrome = chromeCandidates.find((c) => fs.existsSync(c));
    if (chrome) return chrome;

    if (String(process.env.BROWSER_ALLOW_EDGE || "").toLowerCase() === "1") {
        const edge = [
            "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
            "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        ].find((c) => fs.existsSync(c));
        if (edge) return edge;
    }

    throw new Error(
        "未找到可用的 Chrome。请安装 Google Chrome，或用 BROWSER_PATH 指定浏览器路径。" +
            "（Edge 已从默认候选中移除：本机 msedge.exe 会触发 BugCheck 0x1A 蓝屏；" +
            "确需使用请设置 BROWSER_ALLOW_EDGE=1）",
    );
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 统一的高阶浏览器执行封装：启动、超时、进程树回收、profile 目录固定生命周期完全收口。
 *
 * @param {object} options
 * @param {string} options.suiteName 套件名称（用于构建固定可回收目录 .tmp/e2e/<suiteName>/profile）
 * @param {string} [options.profileName="profile"] 固定 profile 名称（并发时使用 profile-1, profile-2 等）
 * @param {number} [options.timeoutMs=30000] 硬超时上限（默认 30s，最大不超过 120s）
 * @param {string[]} [options.extraArgs=[]] 传递给 Chromium 的额外启动参数
 * @param {(browserCtx: {child: object, port: number, profileDir: string, setLastAction: (action: string) => void}) => Promise<any>} runner
 */
async function withBrowser(options, runner) {
    if (typeof runner !== "function") {
        throw new TypeError("withBrowser: runner 必须是一个函数");
    }
    registerExitHooksOnce();

    const suiteName = (options && options.suiteName ? String(options.suiteName) : "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const profileName = (options && options.profileName ? String(options.profileName) : "profile").replace(/[^a-zA-Z0-9_-]/g, "");
    const profileDir = path.join(baseTmpE2eDir, suiteName, profileName);

    // 严禁随机目录名！启动前先彻底清理旧 profile 并重建固定目录
    cleanupProfileDirSync(profileDir);
    fs.mkdirSync(profileDir, {recursive: true});
    trackedProfiles.add(profileDir);

    const browserExe = resolveBrowserExecutable();
    const extraArgs = Array.isArray(options?.extraArgs) ? options.extraArgs : [];
    const timeoutMs = Math.min(120000, Math.max(1000, Number(options?.timeoutMs) || 30000));

    const defaultArgs = [
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--no-first-run",
        "--remote-debugging-port=0",
        `--user-data-dir=${profileDir}`,
        "about:blank",
    ];

    let child = null;
    let lastAction = "spawning-browser";
    const setLastAction = (action) => {
        lastAction = String(action || "");
    };

    try {
        child = spawn(browserExe, [...defaultArgs, ...extraArgs], {
            stdio: "ignore",
            windowsHide: true,
        });

        if (!child.pid) {
            throw new Error(`Failed to spawn browser process: pid is missing`);
        }
        // 拿到子进程对象后立刻把 pid 登记到模块级 Set 里
        trackedPids.add(child.pid);

        const portFile = path.join(profileDir, "DevToolsActivePort");
        let port = 0;
        for (let attempt = 0; attempt < 100 && !port; attempt += 1) {
            if (fs.existsSync(portFile)) {
                const firstLine = fs.readFileSync(portFile, "utf8").split(/\r?\n/)[0].trim();
                const parsed = Number(firstLine);
                if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) port = parsed;
            }
            if (!port) await delay(100);
        }

        if (!port) {
            throw new Error(`Browser failed to publish DevToolsActivePort within startup budget`);
        }

        let timeoutTimer = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutTimer = setTimeout(() => {
                const err = new Error(
                    `withBrowser timeout exceeded ${timeoutMs}ms for suite "${suiteName}". Last action: "${lastAction}". Killing process tree pid=${child.pid}.`
                );
                // 超时后立即同步强杀进程树
                killProcessTreeSync(child.pid);
                reject(err);
            }, timeoutMs);
        });

        const taskPromise = Promise.resolve().then(() => runner({
            child,
            pid: child.pid,
            port,
            profileDir,
            setLastAction,
        }));

        const result = await Promise.race([taskPromise, timeoutPromise]);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        return result;
    } finally {
        if (child && child.pid) {
            // Windows 下必须用 taskkill /PID <pid> /T /F 强杀整棵树（主进程+renderer+gpu+utility）
            killProcessTreeSync(child.pid);
        }
        cleanupProfileDirSync(profileDir);
    }
}

module.exports = {
    withBrowser,
    killProcessTreeSync,
    cleanupProfileDirSync,
    cleanupAllSync,
    resolveBrowserExecutable,
    trackedPids,
    trackedProfiles,
};
