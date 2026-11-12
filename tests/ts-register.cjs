// 测试运行期 TypeScript 直装器：
// 消除 src/*.ts 旁手工维护的 16 份同名 .js 镜像副本，使 CommonJS 测试与纯模型直接
// require 真实的 .ts 源码（支持显式 .ts、无后缀及遗留的 .js 引用回退）。
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const SRC_DIR = path.resolve(__dirname, "..", "src");
const transpileCache = new Map();

function transpileTsFile(tsFilePath) {
    const stat = fs.statSync(tsFilePath);
    const cached = transpileCache.get(tsFilePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
        return cached.outputText;
    }
    const source = fs.readFileSync(tsFilePath, "utf8");
    const {outputText} = ts.transpileModule(source, {
        fileName: tsFilePath,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: false,
        },
    });
    transpileCache.set(tsFilePath, {mtimeMs: stat.mtimeMs, outputText});
    return outputText;
}

if (!require.extensions[".ts"]) {
    require.extensions[".ts"] = function loadTypeScriptModule(mod, filename) {
        const compiled = transpileTsFile(filename);
        mod._compile(compiled, filename);
    };
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveWithTsFallback(request, parent, isMain, options) {
    try {
        return originalResolveFilename.call(this, request, parent, isMain, options);
    } catch (error) {
        if (error && error.code === "MODULE_NOT_FOUND" && typeof request === "string") {
            const baseDir = parent && parent.filename ? path.dirname(parent.filename) : process.cwd();
            if (request.endsWith(".js")) {
                const candidateTs = path.resolve(baseDir, request.slice(0, -3) + ".ts");
                if (candidateTs.startsWith(SRC_DIR) && fs.existsSync(candidateTs)) {
                    return originalResolveFilename.call(this, candidateTs, parent, isMain, options);
                }
            }
        }
        throw error;
    }
};

module.exports = {transpileTsFile};
