const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const pluginManifest = require("./plugin.json");
// T-6474：归档时间戳从 1980 纪元改为发版提交时间（SOURCE_DATE_EPOCH 模式）。
// 固定 1980 纪元曾有一个真实代价——思源集市解压安装保留 zip 条目时间，装出的
// 文件 mtime=1980，比云同步索引里任何文件都旧；WebDAV 同步按 mtime 判定"云端
// 更新"并下载覆盖，用户装好的版本被回滚（仅本插件：只有我们的构建管线用固定
// 纪元；其他插件作者的 zip 是真实构建时间）。改用提交时间后：同一提交的连续
// 构建仍逐字节一致（可复现性保持），且安装文件的 mtime 足够新，同步会上传而
// 非回滚。git 不可用时回退到 2026-01-01（仍远离纪元，防回归）。
function resolveReleaseZipMtime() {
    try {
        const committedAtSeconds = Number.parseInt(
            require("child_process").execSync("git log -1 --format=%ct", {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            }).trim(),
            10,
        );
        if (Number.isFinite(committedAtSeconds) && committedAtSeconds > 0) {
            return new Date(committedAtSeconds * 1000);
        }
    } catch (_) {
        // git 不可用（导出树/无仓库）：回退到稳定的非纪元默认值
    }
    return new Date(2026, 0, 1, 0, 0, 0, 0);
}
const RELEASE_ZIP_MTIME = resolveReleaseZipMtime();

// output.path is the repository root because the release archive is assembled
// from dist/* while keeping package.zip at the root. Webpack's clean:true would
// therefore be too broad; remove only generated JavaScript chunks before a
// production build so a renamed/removed lazy chunk cannot leak into package.zip.
function cleanGeneratedChunks() {
    const distDir = path.resolve(__dirname, "dist");
    if (!fs.existsSync(distDir)) return;
    for (const name of fs.readdirSync(distDir)) {
        if (name.endsWith(".js") && name !== "index.js") {
            fs.rmSync(path.join(distDir, name), {force: true});
        }
    }
}

class CleanGeneratedChunksPlugin {
    apply(compiler) {
        compiler.hooks.beforeRun.tap("CleanGeneratedChunksPlugin", cleanGeneratedChunks);
        compiler.hooks.watchRun.tap("CleanGeneratedChunksPlugin", cleanGeneratedChunks);
    }
}

const packageImagePatterns = [
    ["icon", "icon.png"],
    ["preview", "preview.png"],
].flatMap(([field, legacyName]) => {
    const fileName = pluginManifest[field] || (fs.existsSync(legacyName) ? legacyName : "");
    return fileName ? [{from: fileName, to: "./dist/"}] : [];
});

module.exports = (env, argv) => {
    const production = argv.mode === "production";
    const plugins = [
        ...(production ? [new CleanGeneratedChunksPlugin()] : []),
        new webpack.DefinePlugin({
            // 构建时注入日志开关：开发构建开启；生产构建默认关闭（配合 logger 死代码消除实现量产静音），
            // 真机排查时可 SW_LOG=1 显式打开生产日志
            __LOG_ENABLED__: JSON.stringify(!production || process.env.SW_LOG === "1"),
            __PLUGIN_VERSION__: JSON.stringify(pluginManifest.version),
        }),
        new MiniCssExtractPlugin({
            filename: "index.css",
        }),
    ];
    if (production) {
        plugins.push(
            new webpack.BannerPlugin({
                banner: () => {
                    // T-6847 实录：LICENSE 仓库内是 CRLF，checkout 平台决定进入
                    // bundle 的行尾——Windows 与 Ubuntu 构建出 ±百字节差，破坏
                    // 跨平台可复现。复制边界统一归一为 LF（与 CopyPlugin 的文档
                    // transform 同一策略）。
                    return fs.readFileSync("LICENSE").toString().replace(/\r\n?/g, "\n");
                },
                exclude: /^lv-kit-/,
            }),
        );
        plugins.push(
            new CopyPlugin({
                patterns: [
                    ...packageImagePatterns.map((p) => ({...p, to: "./"})),
                    {from: "public/lv-kit-*.js", to: "./[name][ext]"},
                    {from: "public/lv-sponsor-card.png", to: "./[name][ext]"},
                    // Normalize documentation line endings at the copy boundary so
                    // Windows and Ubuntu release runners produce identical archives.
                    // ROADMAP.md stays a repo-only dev doc (D-219); the interface
                    // map SVG ships because the market renders it from README.
                    {from: "README*.md", to: "./", transform: (content) => content.toString().replace(/\r\n?/g, "\n")},
                    {from: "docs/*.svg", to: "./docs/[name][ext]"},
                    {from: "docs/component-store-guide.md", to: "./docs/component-store-guide.md", transform: (content) => content.toString().replace(/\r\n?/g, "\n")},
                    {from: "docs/agent-document-context-m2.md", to: "./docs/agent-document-context-m2.md", transform: (content) => content.toString().replace(/\r\n?/g, "\n")},
                    {from: "plugin.json", to: "./", transform: (content) => content.toString().replace(/\r\n?/g, "\n")},
                    // Ship locale files minified: sources stay pretty for diffs,
                    // the archive only needs JSON.parse-able content. This buys
                    // back real bytes against the 300 KiB hard cap.
                    {from: "src/i18n/", to: "./i18n/", transform: (content) => JSON.stringify(JSON.parse(content.toString("utf8")))},
                ],
            }),
        );
        plugins.push(
            new ZipPlugin({
                filename: "package.zip",
                algorithm: "gzip",
                fileOptions: {
                    // Keep central-directory metadata stable across builds so
                    // identical sources produce byte-identical release archives.
                    mtime: RELEASE_ZIP_MTIME,
                    mode: 0o100664,
                    compress: true,
                    compressionLevel: 9,
                    forceZip64Format: false,
                },
                exclude: [/package\.zip$/],
            }),
        );
        plugins.push({
            apply(compiler) {
                compiler.hooks.afterEmit.tap("MovePackageZipToRoot", () => {
                    const emittedZip = path.resolve(__dirname, "dist", "package.zip");
                    const rootZip = path.resolve(__dirname, "package.zip");
                    if (fs.existsSync(emittedZip)) {
                        fs.copyFileSync(emittedZip, rootZip);
                        fs.rmSync(emittedZip, {force: true});
                    }
                });
            },
        });
    } else {
        plugins.push(
            new CopyPlugin({
                patterns: [
                    {from: "public/lv-kit-*.js", to: "./[name][ext]"},
                    {from: "public/lv-sponsor-card.png", to: "./[name][ext]"},
                    {from: "src/i18n/", to: "./i18n/"},
                    {from: "icon.png", to: "./icon.png"},
                    {from: "preview.png", to: "./preview.png"},
                ],
            }),
        );
    }
    return {
        mode: argv.mode || "development",
        watch: !production,
        devtool: production ? false : "eval-source-map",
        output: {
            filename: "[name].js",
            // T-7018 / 布局统一：生产产物全部以 dist/ 为根相对落点，package.zip 与 dist/ 1:1 同构；
            // chunkFilename 统一为 "[name].js"（由 webpackChunkName 魔法注释显式命名），避免直接挂载 dist/ 时 404。
            chunkFilename: "[name].js",
            publicPath: `/plugins/${pluginManifest.name}/`,
            path: production ? path.resolve(__dirname, "dist") : path.resolve(__dirname),
            libraryTarget: "commonjs2",
            library: {
                type: "commonjs2",
            },
        },
        externals: {
            siyuan: "siyuan",
        },
        entry: {
            index: "./src/index.ts",
        },
        optimization: {
            minimize: production,
            minimizer: [
                // legalComments:none 剥离压缩产物中保留的许可证注释；
                // LICENSE 仍由 BannerPlugin 以完整文本形式附在产物头部。
                new TerserPlugin({
                    parallel: 2,
                    extractComments: false,
                    terserOptions: {
                        ecma: 2020,
                        compress: {
                            passes: 2,
                            pure_getters: true,
                            booleans_as_integers: false,
                            collapse_vars: true,
                            reduce_vars: true,
                        },
                        format: {comments: false},
                    },
                }),
                new EsbuildPlugin({legalComments: "none", css: true, include: /\.css$/i}),
            ],
        },
        resolve: {
            extensions: [".ts", ".scss", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        {
                            loader: "esbuild-loader",
                            options: {
                                // 思源桌面端为 Electron、手机端为现代 WebView（minAppVersion 3.8.0，ADR 0064），
                                // es2020 覆盖可选链/空值合并且保留 async/await 原生语法，
                                // 避免降级到 es6 时注入大段 __async/generator 辅助函数。
                                target: "es2020",
                                ...(production && process.env.SW_LOG !== "1" ? {
                                    minifySyntax: true,
                                    pure: ["logger.warn", "logger.info", "logger.debug"],
                                } : {}),
                            },
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                        },
                        {
                            loader: "sass-loader",
                        },
                    ],
                },
            ],
        },
        plugins,
    };
};
