import {mountPlatformChrome} from "./platform-chrome";
import {Dialog, getAllTabs, getActiveTab} from "siyuan";
import {lvEcosystem} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {stableSortBy, normalizeQuickActionText, clampOversizedIcons, trimLeadingBlankThumbNodes, hasVisibleThumbContent} from "../util";
import {bindDocSearchFilter, disposeDocSearchSession, hasDocSearchFilter} from "../doc-search-ui";
import {BACK_TOP_THRESHOLD_PX, CONTENT_WIDTH_PX, THUMB_CACHE_MAX, THUMB_HTML_MAX, THUMB_CACHE_MAX_MOBILE, THUMB_HTML_MAX_MOBILE, THUMB_CLONE_MAX, THUMB_API_MAX, THUMB_API_MAX_MOBILE, THUMB_API_TIMEOUT_MS, THUMB_CACHE_KEY, SIDEBAR_DOCK_TYPE} from "../constants";
import {getSiyuan, ISiyuanLayoutDock, IProtyleTabModel} from "../types";
import {type Tab, type IOverlayClose, type DockDisplay, type IGroupedTab, type IDockPanel, type IThumbCache, thumbObserverCache, type PlatformSurface, type ISpeedSwitchHost} from "./plugin-types";

const pendingThumbCacheWrites = new WeakMap<object, Map<string, {title: string; html: string}>>();
const pendingThumbCacheTimers = new WeakMap<object, number>();
const thumbQueueCancels = new WeakMap<HTMLElement, () => void>();
const sanitizedThumbCache = new Map<string, DocumentFragment>();
const THUMB_FRAME_BUDGET_MS = 6;

export interface ProtyleSidebarRuntime extends Omit<ISpeedSwitchHost, "renderDockList" | "createDockItem" | "activateDock" | "getDockPanels" | "getDockByType" | "getThumbCache" | "saveThumbCache" | "setThumbCache" | "pruneThumbCache" | "renderThumbItem" | "renderThumbnails" | "renderThumbBatch" | "sanitizeThumbHtml" | "applyThumbContent" | "flushPendingThumbScales" | "acquireThumbApi" | "releaseThumbApi" | "fillThumbByApi" | "cloneLimitedContent" | "getThumbSource" | "renderSidebarPanel" | "buildSidebarHtml" | "observeSidebarResize" | "collectDirtyIconRoots" | "flushDirtyIconRoots" | "observeSidebarIcons" | "bindSidebarToolbarEvents" | "scheduleSidebarRefresh" | "rescaleThumbs" | "refreshSidebar" | "refreshSidebarActive" | "toggleSidebar"> {}
export class ProtyleSidebarRuntime {
    // 渲染左侧侧边栏面板列表（文档树/大纲/书签/反链/关系图等，含其他插件注册的面板）
    // mode：hidden 完全隐藏（保持 fn__none，内容区占满全宽）/ collapsed 折叠图标条 / full 完整列表
    private renderDockList(dockElement: HTMLElement | null, dialog: Dialog, excludedDocks: string[], mode: DockDisplay) {
        if (!dockElement || mode === "hidden") {
            return;
        }
        const excluded = new Set(excludedDocks);
        const panels = this.getDockPanels().filter((panel) => !excluded.has(panel.type));
        if (panels.length === 0) {
            return;
        }
        dockElement.classList.remove("fn__none");
        dockElement.innerHTML = "";

        // 单次捕获当前激活 dock 节点类型，避免每个面板循环对整个页面 DOM 执行 querySelector
        let activeDockType: string | null = null;
        try {
            activeDockType = document.querySelector<HTMLElement>(".dock__item--active")?.getAttribute("data-type") || null;
        } catch {
            activeDockType = null;
        }

        // 折叠 ⇄ 完整 切换按钮：弹窗内即时切换（不写回设置，设置只决定初始形态）
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "sw__dock-toggle b3-tooltips b3-tooltips__e";
        const setToggleState = (collapsed: boolean) => {
            toggle.setAttribute("aria-label", collapsed ? this.i18n.expandDock : this.i18n.collapseDock);
            toggle.innerHTML = `<svg><use xlink:href="#${collapsed ? "iconRight" : "iconLeft"}"></use></svg>`;
            dockElement.classList.toggle("sw__dock--collapsed", collapsed);
        };
        toggle.addEventListener("click", () => {
            setToggleState(!dockElement.classList.contains("sw__dock--collapsed"));
        });
        setToggleState(mode === "collapsed");
        dockElement.appendChild(toggle);

        const label = document.createElement("div");
        label.className = "sw__dock-label";
        label.textContent = this.i18n.panels;
        dockElement.appendChild(label);

        panels.forEach((panel) => {
            dockElement.appendChild(this.createDockItem(panel, dialog, activeDockType));
        });
    }

    // 构建一个面板列表项（图标 + 名称），点击即激活该面板
    private createDockItem(panel: IDockPanel, dialog: Dialog, activeDockType?: string | null): HTMLElement {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "sw__dock-item";
        item.dataset.dockType = panel.type;

        // 面板当前已展开时高亮标识（复用父级单次捕获结果）
        if (activeDockType ? activeDockType === panel.type : false) {
            item.classList.add("sw__active");
        }

        const icon = document.createElement("span");
        icon.className = "sw__dock-icon";
        icon.innerHTML = `<svg><use xlink:href="#${panel.icon}"></use></svg>`;
        const title = document.createElement("span");
        title.className = "sw__dock-title";
        title.textContent = panel.title;
        item.appendChild(icon);
        item.appendChild(title);
        // 折叠模式下 hover 浮出的面板名称（完整模式由 CSS 隐藏）
        const flyout = document.createElement("span");
        flyout.className = "sw__dock-flyout";
        flyout.textContent = panel.title;
        item.appendChild(flyout);

        item.addEventListener("click", () => this.activateDock(panel.type, dialog));
        return item;
    }

    // 激活侧边栏面板并关闭切换器
    private activateDock(type: string, dialog: Dialog) {
        try {
            const dock = this.getDockByType(type);
            if (dock) {
                // 与思源 Ctrl+Tab 切换面板一致：show=true 表示聚焦/展开该面板
                dock.toggleModel(type, true);
            }
        } catch (e) {
            logger.warn("switch dock fail", e);
        }
        dialog.destroy();
    }

    // 读取布局配置中的全部面板（左/右/下三侧 dock），只保留当前真实存在的面板
    private getDockPanels(): IDockPanel[] {
        const panels: IDockPanel[] = [];
        const seen = new Set<string>();
        try {
            const uiLayout = getSiyuan()?.config?.uiLayout;
            if (!uiLayout) {
                return panels;
            }
            (["left", "right", "bottom"] as const).forEach((position) => {
                const groups = uiLayout[position]?.data;
                if (!Array.isArray(groups)) {
                    return;
                }
                groups.forEach((group: any[]) => {
                    (group || []).forEach((item: any) => {
                        if (item?.type && !seen.has(item.type) && this.getDockByType(item.type)) {
                            seen.add(item.type);
                            panels.push({
                                type: item.type,
                                title: normalizeQuickActionText(item.title || item.type, 80) || item.type,
                                icon: item.icon || "iconDock",
                            });
                        }
                    });
                });
            });
        } catch (e) {
            logger.warn("get dock panels fail", e);
        }
        return panels;
    }

    // 按 type 查找面板所属的 Dock（左侧/右侧/底部），与思源 getDockByType 行为一致
    private getDockByType(type: string): ISiyuanLayoutDock | undefined {
        const layout = getSiyuan()?.layout;
        if (!layout) {
            return undefined;
        }
        const sides: Array<ISiyuanLayoutDock | undefined> = [layout.leftDock, layout.rightDock, layout.bottomDock];
        for (const dock of sides) {
            if (dock?.data?.[type]) {
                return dock;
            }
        }
        return undefined;
    }

    private getThumbCache(): IThumbCache {
        const data = this.data[THUMB_CACHE_KEY];
        // 与 normalizeThumbCache 的容器判据一致：数组同样是 object，旧判据会把
        // 数组当缓存返回，后续 cache[rootId] = {...} 会往数组上挂具名属性。
        // 加载期归一化已把这类值重置为空对象，这里是运行期的第二道防线。
        return data && typeof data === "object" && !Array.isArray(data) ? data as IThumbCache : {};
    }

    private async saveThumbCache(cache: IThumbCache) {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const loaded = this.data[THUMB_CACHE_KEY];
        const merged = (loaded && typeof loaded === "object" && !Array.isArray(loaded))
            ? { ...(loaded as IThumbCache), ...cache }
            : cache;
        this.data[THUMB_CACHE_KEY] = merged;
        this.saveDataDebounced(THUMB_CACHE_KEY);
    }

    // 写入一条缓存（实时 DOM 优先更新），超过上限时按最旧淘汰；不立即写盘，由调用方批量 flush
    private setThumbCache(cache: IThumbCache, rootId: string, title: string, html: string) {
        // 手机端使用更保守的缓存上限（存储/内存更紧张）
        const htmlMax = this.isMobile ? THUMB_HTML_MAX_MOBILE : THUMB_HTML_MAX;
        const cacheMax = this.isMobile ? THUMB_CACHE_MAX_MOBILE : THUMB_CACHE_MAX;
        if (html.length > htmlMax) {
            return;
        }
        cache[rootId] = {title, html, ts: Date.now()};
        // 容量控制：超出上限时删最旧的条目；用稳定排序让 ts 相同时按插入顺序淘汰，行为可预测
        const keys = Object.keys(cache);
        if (keys.length > cacheMax) {
            const sorted = stableSortBy(keys, (k) => cache[k].ts);
            sorted.slice(0, sorted.length - cacheMax).forEach((key) => delete cache[key]);
        }
    }

    // 清理缓存中已无对应打开页签的孤儿条目（页签关闭即失效）
    private pruneThumbCache(tabs: Tab[]) {
        const openIds = new Set<string>();
        tabs.forEach((tab) => {
            const rootId = this.rootIdOf(tab);
            if (rootId) {
                openIds.add(rootId);
            }
        });
        const cache = this.getThumbCache();
        let dirty = false;
        Object.keys(cache).forEach((key) => {
            if (!openIds.has(key)) {
                delete cache[key];
                dirty = true;
            }
        });
        if (dirty) {
            this.saveThumbCache(cache);
        }
    }

    // T-7004：清空缩略图缓存——只清 THUMB_CACHE_KEY（rootID → HTML 快照，可由
    // 回源 API 重建）；RSS 已读与关联投影是用户语义数据，不在清空范围。
    clearThumbCache() {
        this.data[THUMB_CACHE_KEY] = {};
        this.saveDataDebounced(THUMB_CACHE_KEY);
    }

    // 渲染单个页签缩略图：实时 DOM 克隆 → 持久化缓存 → 内核 API 回源（带并发闸门）
    private renderThumbItem(item: IGroupedTab) {
        const thumb = item.card?.querySelector<HTMLElement>(".sw__thumb");
        if (!thumb || !thumb.isConnected) {
            return;
        }
        const title = item.tab.title || "";
        const rootId = this.rootIdOf(item.tab);
        const source = this.getThumbSource(item.tab);
        thumb.innerHTML = "";
        if (source) {
            // 视觉空白的实时克隆不进缓存，回退 API 回源（T-6970 缩略图空框防护）
            if (this.applyThumbContent(thumb, source, title)) {
                // 实时 DOM 可用：立刻呈现缩略图，合并同批缓存写盘（避免每张卡单独触发排序与 saveThumbCache）
                if (rootId) {
                    let pending = pendingThumbCacheWrites.get(this);
                    if (!pending) {
                        pending = new Map();
                        pendingThumbCacheWrites.set(this, pending);
                    }
                    pending.set(rootId, {title, html: source.innerHTML});
                    if (!pendingThumbCacheTimers.has(this)) {
                        const timer = window.setTimeout(() => {
                            pendingThumbCacheTimers.delete(this);
                            const batchMap = pendingThumbCacheWrites.get(this);
                            if (!batchMap || batchMap.size === 0 || this.isUnloading) return;
                            const cache = this.getThumbCache();
                            batchMap.forEach((entry, id) => {
                                this.setThumbCache(cache, id, entry.title, entry.html);
                            });
                            batchMap.clear();
                            void this.saveThumbCache(cache);
                        }, 80);
                        pendingThumbCacheTimers.set(this, timer);
                    }
                }
                return;
            }
            this.fillThumbByApi(item.tab, thumb);
            return;
        }
        // 无实时 DOM：尝试命中持久化缓存（跨重启/重置保留）
        const cache = this.getThumbCache();
        const cached = rootId ? cache[rootId] : undefined;
        if (cached) {
            const wrap = document.createElement("div");
            wrap.className = "protyle-wysiwyg";
            // T-7173：持久化缓存是弱信任存储——读取必经有界净化
            const fragment = this.sanitizeThumbHtml(cached.html);
            if (!fragment) return;
            wrap.appendChild(fragment);
            this.applyThumbContent(thumb, wrap, title);
            return;
        }
        // 缓存也未命中：先占位，再通过内核 API 读取文档内容（成功后写入缓存）
        const placeholder = document.createElement("div");
        placeholder.className = "sw__thumb-placeholder";
        placeholder.textContent = title || item.tab.id;
        thumb.classList.add("sw__thumb--compact");
        thumb.appendChild(placeholder);
        this.fillThumbByApi(item.tab, thumb);
    }

    // 视口懒渲染：只给滚动到可视区（含 240px 预载边距）的卡片生成缩略图，
    // 视野外保持加载占位，并按帧时间预算分帧排水，避免首屏集中克隆/解析卡顿主线程
    private renderThumbnails(list: IGroupedTab[], scrollElement: HTMLElement, batch: number) {
        // 同一容器重复渲染时（排序切换/列表刷新）先断开旧观察器与挂起队列，防止泄漏与重复渲染
        // 用 WeakMap 把 IntersectionObserver 绑在元素上，替代 (el as any).__swThumbObserver 的自挂私有属性写法
        const prevCancel = thumbQueueCancels.get(scrollElement);
        if (prevCancel) {
            prevCancel();
            thumbQueueCancels.delete(scrollElement);
        }
        const prev = thumbObserverCache.get(scrollElement);
        if (prev) {
            prev.disconnect();
            thumbObserverCache.delete(scrollElement);
        }

        // 环境不支持 IntersectionObserver 时退回原分批全量渲染（思源内核均为 Chromium，仅防御）
        if (typeof IntersectionObserver !== "function") {
            this.renderThumbBatch(list, batch);
            return;
        }

        const thumbItems = new Map<HTMLElement, IGroupedTab>();
        const pendingQueue: IGroupedTab[] = [];
        let drainScheduled = false;
        let disposed = false;
        const drainQueue = () => {
            drainScheduled = false;
            if (disposed || !scrollElement.isConnected) {
                pendingQueue.length = 0;
                return;
            }
            const start = typeof performance !== "undefined" ? performance.now() : 0;
            let processed = 0;
            while (pendingQueue.length > 0) {
                const nextItem = pendingQueue.shift()!;
                this.renderThumbItem(nextItem);
                processed += 1;
                if (processed >= 2 && typeof performance !== "undefined" && performance.now() - start >= THUMB_FRAME_BUDGET_MS) {
                    break;
                }
            }
            if (pendingQueue.length > 0 && !drainScheduled) {
                drainScheduled = true;
                this.scheduleAnimationFrame(drainQueue);
            }
        };
        thumbQueueCancels.set(scrollElement, () => {
            disposed = true;
            pendingQueue.length = 0;
        });

        const observer = new IntersectionObserver((entries) => {
            if (disposed) return;
            let enqueued = false;
            for (let i = 0; i < entries.length; i += 1) {
                const entry = entries[i];
                if (!entry.isIntersecting) continue;
                observer.unobserve(entry.target);
                const item = thumbItems.get(entry.target as HTMLElement);
                if (item) {
                    thumbItems.delete(entry.target as HTMLElement);
                    pendingQueue.push(item);
                    enqueued = true;
                }
            }
            if (enqueued && !drainScheduled) {
                drainScheduled = true;
                this.scheduleAnimationFrame(drainQueue);
            }
        }, {root: scrollElement, rootMargin: "240px 0px"});
        thumbObserverCache.set(scrollElement, observer);

        list.forEach((item) => {
            const thumb = item.card?.querySelector<HTMLElement>(".sw__thumb");
            if (!thumb) {
                return;
            }
            // 复用的旧卡片与插件卡片已渲染过（无加载占位）：跳过观察，避免重克隆
            if (!thumb.querySelector(".sw__thumb-loading")) {
                return;
            }
            thumbItems.set(thumb, item);
            observer.observe(thumb);
        });
    }

    // 分批全量渲染（IntersectionObserver 不可用时的兜底路径）
    private renderThumbBatch(list: IGroupedTab[], batch: number) {
        const cache = this.getThumbCache();
        let dirty = false;
        let index = 0;
        const runBatch = () => {
            const end = Math.min(index + batch, list.length);
            for (; index < end; index++) {
                const item = list[index];
                const thumb = item.card?.querySelector<HTMLElement>(".sw__thumb");
                if (!thumb) {
                    continue;
                }
                const title = item.tab.title || "";
                const rootId = this.rootIdOf(item.tab);
                const source = this.getThumbSource(item.tab);
                thumb.innerHTML = "";
                if (source && this.applyThumbContent(thumb, source, title)) {
                    if (rootId) {
                        this.setThumbCache(cache, rootId, title, source.innerHTML);
                        dirty = true;
                    }
                    continue;
                }
                if (source) {
                    // 空白克隆：回退缓存/API 路径（applyThumbContent 已就地放标题占位）
                    this.fillThumbByApi(item.tab, thumb);
                    continue;
                }
                const cached = rootId ? cache[rootId] : undefined;
                if (cached) {
                    const wrap = document.createElement("div");
                    wrap.className = "protyle-wysiwyg";
                    // T-7173：持久化缓存是弱信任存储——读取必经有界净化
                    const fragment = this.sanitizeThumbHtml(cached.html);
                    if (!fragment) {
                        this.fillThumbByApi(item.tab, thumb);
                        continue;
                    }
                    wrap.appendChild(fragment);
                    this.applyThumbContent(thumb, wrap, title);
                    continue;
                }
                const placeholder = document.createElement("div");
                placeholder.className = "sw__thumb-placeholder";
                placeholder.textContent = title || item.tab.id;
                thumb.classList.add("sw__thumb--compact");
                thumb.appendChild(placeholder);
                this.fillThumbByApi(item.tab, thumb);
            }
            if (index < list.length) {
                this.scheduleAnimationFrame(runBatch);
            } else if (dirty) {
                this.saveThumbCache(cache);
            }
        };
        this.scheduleAnimationFrame(runBatch);
    }

    // 将克隆内容装进缩略图框并按宽度缩放。返回 false 表示内容视觉空白（如整篇空段落），
    // 已就地回退为标题占位——调用方应继续走 API 回源且不得把空白内容写入缓存（T-6970）。
    // T-7173：缩略图 HTML 有界净化——三来源（实时克隆/持久化缓存/内核 getDoc）中，
    // 后两者经 innerHTML 解析（历史缺陷：弱信任存储与内核响应未净化即挂载）。
    // DOMParser 产出 inert 文档（不跑脚本、不加载资源、不触发事件），再按白名单
    // 搬运节点：剥全部事件属性/style/srcset/javascript: 与 data:text 源，剔除
    // script/iframe 等活动标签；缩略图只需视觉骨架，交互标签一并剔除。
    private sanitizeThumbHtml(html: string): DocumentFragment | null {
        if (typeof DOMParser !== "function") return null; // 极旧 WebView：调用方降级为占位
        const cached = sanitizedThumbCache.get(html);
        if (cached) {
            return cached.cloneNode(true) as DocumentFragment;
        }
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const fragment = parsed.createDocumentFragment();
        const stripTags = new Set(["script", "style", "iframe", "object", "embed", "link", "meta", "base", "template", "form", "input", "button", "textarea", "select", "audio", "video", "source", "track"]);
        const walk = (src: Element, dest: Node): void => {
            for (const node of Array.from(src.childNodes)) {
                if (node.nodeType === (parsed.defaultView?.Node?.TEXT_NODE ?? 3)) {
                    dest.appendChild(parsed.createTextNode(node.textContent || ""));
                    continue;
                }
                if (node.nodeType !== (parsed.defaultView?.Node?.ELEMENT_NODE ?? 1)) continue;
                const el = node as Element;
                const tag = el.tagName.toLowerCase();
                if (stripTags.has(tag)) continue;
                const clone = parsed.createElement(tag);
                for (const attr of Array.from(el.attributes)) {
                    const name = attr.name.toLowerCase();
                    if (name.startsWith("on") || name === "style" || name === "srcset") continue;
                    if (name === "src" || name === "href" || name === "xlink:href") {
                        const value = attr.value.trim().toLowerCase();
                        if (value.startsWith("javascript:") || value.startsWith("data:text")) continue;
                    }
                    clone.setAttribute(attr.name, attr.value);
                }
                walk(el, clone);
                dest.appendChild(clone);
            }
        };
        walk(parsed.body, fragment);
        if (sanitizedThumbCache.size >= 48) {
            const firstKey = sanitizedThumbCache.keys().next().value;
            if (firstKey !== undefined) sanitizedThumbCache.delete(firstKey);
        }
        sanitizedThumbCache.set(html, fragment.cloneNode(true) as DocumentFragment);
        return fragment;
    }

    private applyThumbContent(thumb: HTMLElement, source: HTMLElement, title: string): boolean {
        // 真机反馈：日记等文档开头常见空段落，缩放后整框只剩空白；先裁掉前导空白块
        trimLeadingBlankThumbNodes(source);
        if (!hasVisibleThumbContent(source)) {
            const placeholder = document.createElement("div");
            placeholder.className = "sw__thumb-placeholder";
            placeholder.textContent = title || thumb.parentElement?.getAttribute("data-tab-id") || "";
            thumb.classList.add("sw__thumb--compact");
            thumb.appendChild(placeholder);
            return false;
        }
        thumb.classList.remove("sw__thumb--compact");
        const content = document.createElement("div");
        content.className = "sw__thumb-content";
        content.appendChild(source);
        thumb.appendChild(content);
        // 依据盒子实际宽度计算缩放比例；容器尚未完成布局（宽度为 0）时等下一帧重算，
        // 后续尺寸变化由侧边栏的 ResizeObserver 兜底重算
        content.style.visibility = "hidden";
        this.pendingThumbScales.push({thumb, content, tries: 0});
        if (!this.thumbScaleFramePending) {
            this.thumbScaleFramePending = true;
            this.scheduleAnimationFrame(() => this.flushPendingThumbScales());
        }
        content.setAttribute("aria-label", title);
        return true;
    }

    /** 消费挂起的缩略图量测批次：两阶段批量读写分离（T-7821），并承接失联条目重排队 */
    private flushPendingThumbScales(): void {
        this.thumbScaleFramePending = false;
        const batch = this.pendingThumbScales.splice(0);
        const measured: Array<{el: HTMLElement; width: number}> = [];
        // 用户实测"缩略图大面积空白"根因：renderList 重渲染的卡片复用流程会把卡片
        // 摘下再挂回（detach→reattach）。旧批量在摘下窗口期把条目整批丢弃——重挂回
        // 后内容永远停留在 visibility:hidden 的空白框。改为：失联条目保留重排队，
        // 重挂回的下一帧补量测补显形；每条 60 帧重试上限，杜绝永久空转。
        const deferred: Array<{thumb: HTMLElement; content: HTMLElement; tries: number}> = [];
        for (let i = 0; i < batch.length; i += 1) {
            const entry = batch[i];
            if (!entry.thumb.isConnected) {
                if ((entry.tries || 0) < 60) deferred.push({thumb: entry.thumb, content: entry.content, tries: (entry.tries || 0) + 1});
                continue;
            }
            measured.push({
                el: entry.content,
                width: entry.thumb.clientWidth || entry.thumb.getBoundingClientRect().width,
            });
        }
        for (let i = 0; i < measured.length; i += 1) {
            const {el, width} = measured[i];
            if (width > 0) {
                el.style.transform = `scale(${(width / CONTENT_WIDTH_PX).toFixed(3)})`;
            }
            el.style.visibility = "visible";
        }
        if (deferred.length > 0) {
            this.pendingThumbScales.unshift(...deferred);
            if (!this.thumbScaleFramePending) {
                this.thumbScaleFramePending = true;
                this.scheduleAnimationFrame(() => this.flushPendingThumbScales());
            }
        }
    }

    // 关闭切换器/重渲染时批量取消在途回源：等待项拿到槽位后因失连检查自动离队
    cancelThumbFetches() {
        this.navigation?.cancelThumbFetches();
        this.thumbApiControllers.forEach((controller) => {
            try { controller.abort(); } catch { /* 无 AbortController 环境忽略 */ }
        });
        this.thumbApiControllers.clear();
    }

    private async acquireThumbApi(): Promise<void> {
        const max = this.isMobile ? THUMB_API_MAX_MOBILE : THUMB_API_MAX;
        if (this.thumbApiActive < max) {
            this.thumbApiActive++;
            return;
        }
        await new Promise<void>((resolve) => {
            this.thumbApiQueue.push(() => {
                this.thumbApiActive++;
                resolve();
            });
        });
    }

    private releaseThumbApi() {
        this.thumbApiActive--;
        this.thumbApiQueue.shift()?.();
    }

    // 页签 DOM 中暂无内容（如后台未渲染完）时，通过内核 API 读取文档 HTML 作为缩略内容，并写入缓存
    private async fillThumbByApi(tab: Tab, thumb: HTMLElement) {
        const rootId = this.rootIdOf(tab);
        if (!rootId) {
            return; // 闈炴枃妗ｉ〉绛撅紝淇濇寔鍗犱綅
        }
        await this.acquireThumbApi();
        // T-7172：拿到槽位后先验失连——卡片已被重绘移除则立即离队，不发请求
        if (!thumb.isConnected) {
            this.releaseThumbApi();
            return;
        }
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        if (controller) this.thumbApiControllers.set(thumb, controller);
        let timer = 0;
        try {
            // size=32：缩略图只需首屏内容，减小响应体与解析开销
            timer = controller
                ? window.setTimeout(() => controller.abort(), THUMB_API_TIMEOUT_MS)
                : 0;
            const response = await fetch("/api/filetree/getDoc", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: rootId, mode: 0, size: 32}),
                ...(controller ? {signal: controller.signal} : {}),
            });
            if (timer) {
                window.clearTimeout(timer);
                timer = 0;
            }
            if (!response.ok) throw new Error(String(response.status));
            const html: string | undefined = (await response.json())?.data?.content;
            if (!thumb.isConnected || !html) return;
            const wrap = document.createElement("div");
            wrap.className = "protyle-wysiwyg";
            const fragment = this.sanitizeThumbHtml(html);
            if (!fragment) return;
            thumb.innerHTML = "";
            wrap.appendChild(fragment);
            if (!this.applyThumbContent(thumb, wrap, tab.title || "")) return;
            // API 读取成功：写入缓存，下次（含重启后）直接命中
            const cache = this.getThumbCache();
            this.setThumbCache(cache, rootId, tab.title || "", html);
            this.saveThumbCache(cache);
        } catch (e) {
            // 璇诲彇澶辫触淇濇寔鍗犱綅鍗冲彲
            logger.warn("fetch doc content fail", e);
        } finally {
            if (timer) window.clearTimeout(timer);
            if (this.thumbApiControllers.get(thumb) === controller) this.thumbApiControllers.delete(thumb);
            this.releaseThumbApi();
        }
    }

    // 浅克隆外层容器，并仅对前 max 个直接子块做深拷贝（真正的 O(1) 首屏克隆，彻底与大文档体积解耦）
    private cloneLimitedContent(source: HTMLElement, max: number): HTMLElement {
        if (this.navigation) return this.navigation.cloneLimitedContent(source, max);
        const clone = source.cloneNode(false) as HTMLElement;
        const children = source.children;
        const count = Math.min(children.length, max);
        for (let i = 0; i < count; i += 1) {
            clone.appendChild(children[i].cloneNode(true));
        }
        return clone;
    }

    // 获取可克隆的缩略图内容源；文档页签优先取其 WYSIWYG 内容
    // 注意：每次打开切换器都会重新调用本方法克隆实时 DOM，保证缩略图展示的是页签当前最新状态
    // T-7173 边界：保持 cloneNode（严禁 innerHTML 解析实时内容）；
    // T-7360 性能根治：浅克隆外层容器，仅对前 THUMB_CLONE_MAX 个直接子块做 cloneNode(true)，与大文档体积彻底解耦
    private getThumbSource(tab: Tab): HTMLElement | null {
        const cloneHead = (el: HTMLElement) => {
            const c = el.cloneNode(false) as HTMLElement;
            const n = Math.min(el.children.length, THUMB_CLONE_MAX);
            for (let i = 0; i < n; i += 1) c.appendChild(el.children[i].cloneNode(true));
            return c;
        };
        try {
            // Editor 模型的 .editor 即 Protyle 实例，其 wysiwyg.element 为实时文档 DOM
            const model = (tab as unknown as { model?: IProtyleTabModel }).model;
            const wysiwyg = model?.editor?.wysiwyg?.element;
            if (wysiwyg && wysiwyg.childElementCount > 0) return cloneHead(wysiwyg);
            // 兜底：从面板容器里直接找 WYSIWYG 内容（不依赖 model 内部结构）
            const panelWysiwyg = tab.panelElement?.querySelector<HTMLElement>(".protyle-wysiwyg");
            if (panelWysiwyg && panelWysiwyg.childElementCount > 0) return cloneHead(panelWysiwyg);
            // 最后再退回整个面板内容
            if (tab.panelElement && tab.panelElement.childElementCount > 0) return cloneHead(tab.panelElement);
        } catch (e) {
            logger.warn("build thumbnail fail", e);
        }
        return null;
    }

    // 在 dock 面板内渲染紧凑版切换器（单列卡片，常驻侧边栏便于快速切换）
    private renderSidebarPanel(element: HTMLElement) {
        if (!element) {
            return;
        }
        const previousScrollElement = element.querySelector<HTMLElement>(".sw__scroll");
        const previousSearchFilters = previousScrollElement
            ? this.docSearchState.filters.get(previousScrollElement)
            : undefined;
        const previousSearchQuery = element.querySelector<HTMLInputElement>(".sw__search")?.value || "";
        // T-7038：重绘现场事务——全量重建前捕获滚动与焦点卡片。浮层由
        // sidebarHistoryDropdownDispose 统一关闭（T-7040 已并入排序浮层），
        // 分组折叠状态存宿主级 Set 天然存活；此处补滚动与焦点两要素。
        const previousScrollTop = previousScrollElement?.scrollTop ?? 0;
        const sidebarActive = element.ownerDocument.activeElement;
        const sidebarFocus = sidebarActive && typeof (sidebarActive as HTMLElement).closest === "function"
            ? sidebarActive as HTMLElement : null;
        const focusInSidebar = !!previousScrollElement && !!sidebarFocus && previousScrollElement.contains(sidebarFocus);
        const previousFocusCardId = focusInSidebar
            ? sidebarFocus!.closest(".sw__card")?.getAttribute("data-tab-id") || null
            : null;
        if (previousScrollElement) {
            disposeDocSearchSession.call(this, previousScrollElement);
        }
        this.sidebarHistoryDropdownDispose?.();
        this.sidebarHistoryDropdownDispose = null;
        this.sidebarSearchFilterDispose?.();
        this.sidebarSearchFilterDispose = null;
        this.sidebarElement = element;
        element.classList.add("speed-switch", "sw__body", "sw--sidebar", "sw-platform-surface", "sw-platform-surface--switcher");
        element.dataset.swSurface = "switcher";
        this.setSyncPresentation(this.syncing);
        // 侧边栏缩略图布局：enlarge（默认）放大填满栏宽；columns 按宽度自动增加列数
        element.classList.toggle("sw--sidebar-columns", this.getSettings().sidebarLayout === "columns");
        element.innerHTML = this.buildSidebarHtml();
        const closeSidebarDock = () => {
            const type = this.name + SIDEBAR_DOCK_TYPE;
            try {
                this.getDockByType(type)?.toggleModel?.(type, false);
            } catch (error) {
                logger.warn("close sidebar fail", error);
            }
        };
        mountPlatformChrome(element, {
            surface: "switcher",
            labels: this.getPlatformSurfaceLabels(),
            // Keep the sidebar surface navigation in lockstep with the
            // persisted module switches.  A hard-coded list here made the
            // Studio/Workbench entry remain visible after being disabled in
            // settings (the route guard rejected it only after a click).
            available: this.getAvailablePlatformSurfaces(),
            onNavigate: (surface: PlatformSurface) => {
                if (this.isUnloading || !element.isConnected) return;
                this.openPlatformSurface(surface, "switcher", {entry: "surface-nav"});
            },
            onHelp: () => this.openPlatformGuide("switcher"),
            helpLabel: this.i18n.platformGuideButton,
            // 侧栏没有可依赖的 Dialog 外壳；把平台头部的关闭动作接回
            // SiYuan dock 模型，保证与弹窗/移动面板使用同一退出语义。
            onClose: () => {
                if (element.isConnected) closeSidebarDock();
            },
            closeHint: this.i18n.platformCloseHint,
            closeLabel: this.i18n.close,
        });
        // 侧栏没有 Dialog 的宿主 Escape 处理，平台头部仍提示 Esc 退出，
        // 因此在 dock 根节点补同一条关闭语义。监听采用冒泡阶段，
        // 让排序浮层、拖拽取消等内部 Escape 处理优先完成。
        if (element.dataset.swSidebarEscapeBound !== "true") {
            element.dataset.swSidebarEscapeBound = "true";
            element.addEventListener("keydown", (event) => {
                if (event.key !== "Escape" || event.defaultPrevented) return;
                event.preventDefault();
                event.stopPropagation();
                closeSidebarDock();
            });
        }
        // T-6758: the sidebar host is created/replaced by SiYuan lazily.  Run
        // reconciliation after the host's own markup is ready so mounting the
        // portal cannot be lost to this render's innerHTML replacement.
        this.updateFloatingBallVisibility();
        this.observeSidebarIcons(element);

        const tabs = this.bridge.getAllTabs();
        this.pruneThumbCache(tabs);
        const activeTab = this.bridge.getActiveTab();
        const refresh = () => this.refreshSidebar();
        const listOpts = {onOverlayClose: refresh, onTabsChanged: refresh};
        const updatedMap: {[rootId: string]: string} = {};
        const scrollElement = element.querySelector<HTMLDivElement>(".sw__scroll");
        if (!scrollElement) {
            return;
        }
        if (previousSearchFilters) {
            this.docSearchState.filters.set(scrollElement, Object.freeze({...previousSearchFilters}));
        }
        this.renderList(scrollElement, tabs, activeTab, listOpts, this.getSettings().sortBy, updatedMap);
        // T-7038：恢复现场——滚动按内容高度钳制复位（首帧 previousScrollTop 为 0 属无操作）；
        // 焦点卡片按 tabId 找回，找不到诚实放弃；焦点原在滚动区外（搜索框/浮层）不抢焦点。
        if (previousScrollTop > 0) {
            scrollElement.scrollTop = Math.min(previousScrollTop, Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight));
        }
        if (focusInSidebar && previousFocusCardId) {
            const sceneCards = scrollElement.querySelectorAll<HTMLElement>(".sw__card[data-tab-id]");
            for (const card of sceneCards) {
                if (card.dataset.tabId === previousFocusCardId) { card.focus({preventScroll: true}); break; }
            }
        }

        // 侧栏共用 blocks.updated；无排序/标记需求时跳过首屏 SQL，避免侧栏打开等待内核。
        const sidebarSettings = this.getSettings();
        if (sidebarSettings.sortBy === "updatedDesc" || sidebarSettings.showCardUpdatedBadge === true) {
            this.loadUpdatedMap(tabs).then((map) => {
                Object.assign(updatedMap, map);
                const searchInput = element.querySelector<HTMLInputElement>(".sw__search");
                if (element.isConnected && this.getSettings().sortBy === "updatedDesc" && searchInput && searchInput.value.trim() === "") {
                    this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts, "updatedDesc", updatedMap);
                } else if (element.isConnected && this.getSettings().showCardUpdatedBadge === true) {
                    this.refreshCardUpdatedBadges(scrollElement, updatedMap);
                }
            }).catch((err) => logger.warn("loadUpdatedMap on sidebar failed", err));
        }

        // 面板尺寸变化时仅重算缩略图缩放比例（ResizeObserver 覆盖拖动分隔条等所有场景）
        this.observeSidebarResize(element);
        // 顶栏交互：搜索 / 收藏下拉 / 排序 / 设置 / 回到顶部
        this.sidebarHistoryDropdownDispose = this.bindSidebarToolbarEvents(element, scrollElement, refresh);
        const searchInput = element.querySelector<HTMLInputElement>(".sw__search");
        if (searchInput && (previousSearchQuery || hasDocSearchFilter.call(this, scrollElement))) {
            searchInput.value = previousSearchQuery;
            this.applySearch(scrollElement, searchInput, refresh);
        }
        this.renderQuickActions(element, "sidebar", element.querySelector<HTMLInputElement>(".sw__search"), refresh);
        const sidebarModeBar = element.querySelector<HTMLElement>(".sw__mode-chips-bar");
        this.setupSearchModeChips(sidebarModeBar, searchInput, () => {
            if (searchInput) this.applySearch(scrollElement, searchInput, refresh);
        });
    }

    // 侧边栏 DOM 骨架：搜索 + 收藏下拉 + 排序 + 设置 + 滚动区 + 回到顶部
    private buildSidebarHtml(): string {
        return `<div class="sw__content">
    <div class="sw__toolbar">
        <div class="sw__search-wrap">
            <svg class="sw__search-icon" width="14" height="14"><use xlink:href="#iconSearch"></use></svg>
            <input class="b3-text-field sw__search" placeholder="${this.i18n.searchTabs}" aria-label="${this.i18n.searchTabs}" />
            <button type="button" class="sw__search-clear fn__none b3-tooltips b3-tooltips__s" aria-label="${this.i18n.cancel || "清除"}" title="${this.i18n.cancel || "清除"}">
                <svg width="12" height="12"><use xlink:href="#iconClose"></use></svg>
            </button>
            <button type="button" class="sw__search-filter-btn" aria-label="${this.i18n.searchFilters} · 筛选笔记本/路径/类型" title="${this.i18n.searchFilters}">
                <svg width="15" height="15"><use xlink:href="#iconFilter"></use></svg>
            </button>
        </div>
        <div class="sw__select-wrap">
            <div class="sw__fav-dd"></div>
        </div>
        <div class="sw__select-wrap">
            <button type="button" class="b3-button b3-button--text sw__sort-trigger b3-tooltips b3-tooltips__s" aria-label="${this.i18n.setSortBy} · 排序与分组">
                <svg width="18" height="18"><use xlink:href="#iconSort"></use></svg>
                <span class="sw__sort-trigger-label"></span>
            </button>
        </div>
        <div class="sw__history-dd sw__history-dd--icon"></div>
        <button type="button" class="b3-button b3-button--text sw__icon-btn sw__journal-btn" aria-label="${this.i18n.journalBtn}" title="${this.i18n.journalBtn}">
            <svg width="16" height="16"><use xlink:href="#iconCalendar"></use></svg>
        </button>
        <button type="button" class="b3-button b3-button--text sw__icon-btn sw__settings-btn" aria-label="${this.i18n.settings} · 插件设置" title="${this.i18n.settings}">
            <svg width="16" height="16"><use xlink:href="#iconSettings"></use></svg>
        </button>
        <button type="button" class="b3-button b3-button--text sw__icon-btn sw__help-guide-btn b3-tooltips b3-tooltips__s" aria-label="${this.i18n.platformGuideButton || "快速开始"} · 使用说明与快捷键指引" title="${this.i18n.platformGuideButton || "快速开始"}">
            <svg width="16" height="16"><use xlink:href="#iconHelp"></use></svg>
        </button>
        <button type="button" class="b3-button b3-button--text sw__icon-btn sw__activity-stream-btn b3-tooltips b3-tooltips__s" aria-label="${this.i18n.homeActivityStreamTitle || "今日生态流"}" title="${this.i18n.homeActivityStreamTitle || "今日生态流"}">
            <svg width="16" height="16"><use xlink:href="#iconSparkles"></use></svg>
        </button>
    </div>
    <div class="sw__mode-chips-bar" role="group" aria-label="${this.i18n.chipsLabel}"></div>
    <div class="sw__scroll" tabindex="0"></div>
    <div class="sw__quick-actions" role="toolbar" aria-label="${this.i18n.quickActions}"></div>
    <div class="sw__ecosystem-status" role="status" title="小驴全家桶协同指示器"></div>
    <button type="button" class="sw__back-top b3-tooltips b3-tooltips__n" aria-label="${this.i18n.backTop}">
        <svg><use xlink:href="#iconUp"></use></svg>
    </button>
</div>`;
    }

    // 侧边栏尺寸监听：拖动分隔条等场景只重算缩略图缩放，不重建 DOM
    private observeSidebarResize(element: HTMLElement) {
        if (this.sidebarResizeObserver) {
            this.sidebarResizeObserver.disconnect();
        }
        if (typeof ResizeObserver !== "function") {
            this.sidebarResizeObserver = null;
            return;
        }
        this.sidebarResizeObserver = new ResizeObserver(() => {
            this.rescaleThumbs(element);
            // T-6762/B5: the divider can resize the dock without a viewport
            // resize. Ask the existing controller to re-read host bounds;
            // this is one event-driven style update, with no polling.
            this.floatingBallUis.get("sidebar")?.update({});
        });
        this.sidebarResizeObserver.observe(element);
    }

    // 常驻 dock 会经历宿主重绘与插件内容增量替换；与弹窗相同地按帧合并 SVG
    // 尺寸钳制，避免样式短暂失效时浏览器 300×150 默认尺寸把工具栏撑开。
    private collectDirtyIconRoots(host: HTMLElement, dirty: Set<Element>, records?: MutationRecord[]) {
        if (!records) {
            dirty.add(host);
            return;
        }
        for (let i = 0; i < records.length; i += 1) {
            const target = records[i].target as Element | null;
            if (target && typeof target.closest === "function" && target.closest(".sw__thumb-content, .sw__doc-preview-body")) {
                continue;
            }
            const added = records[i].addedNodes;
            for (let j = 0; j < added.length; j += 1) {
                const node = added[j];
                if (node && node.nodeType === 1) {
                    const el = node as Element;
                    if (typeof el.closest === "function" && el.closest(".sw__thumb-content, .sw__doc-preview-body")) {
                        continue;
                    }
                    dirty.add(el.tagName.toLowerCase() === "svg" ? (el.parentElement || host) : el);
                }
            }
        }
    }

    private flushDirtyIconRoots(host: HTMLElement, dirty: Set<Element>) {
        const roots = Array.from(dirty);
        dirty.clear();
        if (!host.isConnected) return;
        if (roots.includes(host) || roots.length > 16) {
            clampOversizedIcons(host);
            return;
        }
        for (let i = 0; i < roots.length; i += 1) {
            if (roots[i].isConnected) clampOversizedIcons(roots[i]);
        }
    }

    private observeSidebarIcons(element: HTMLElement) {
        this.sidebarIconObserver?.disconnect();
        this.sidebarIconFrameCancel?.();
        this.sidebarIconFrameCancel = null;
        const dirtyRoots = new Set<Element>();
        const schedule = (records?: MutationRecord[]) => {
            this.collectDirtyIconRoots(element, dirtyRoots, records);
            if (dirtyRoots.size === 0 || this.sidebarIconFrameCancel) return;
            const run = () => {
                this.sidebarIconFrameCancel = null;
                this.flushDirtyIconRoots(element, dirtyRoots);
            };
            if (typeof requestAnimationFrame === "function") {
                const frame = requestAnimationFrame(run);
                this.sidebarIconFrameCancel = () => cancelAnimationFrame(frame);
            } else {
                const timer = window.setTimeout(run, 16);
                this.sidebarIconFrameCancel = () => window.clearTimeout(timer);
            }
        };
        this.sidebarIconObserver = typeof MutationObserver === "function"
            ? new MutationObserver(schedule) : null;
        this.sidebarIconObserver?.observe(element, {childList: true, subtree: true});
        requestAnimationFrame(() => { if (element.isConnected) clampOversizedIcons(element); });
    }

    // 侧边栏顶栏事件：搜索 / 收藏下拉 / 排序切换 / 设置 / 回到顶部
    private bindSidebarToolbarEvents(element: HTMLElement, scrollElement: HTMLDivElement, refresh: IOverlayClose): () => void {
        // 搜索：与弹窗一致，页签匹配在上、全库文档在下
        const searchInput = element.querySelector<HTMLInputElement>(".sw__search");
        const disposeHistoryDropdown = this.setupOpenHistoryDropdown(element.querySelector<HTMLElement>(".sw__history-dd"), refresh);
        this.sidebarSearchFilterDispose = searchInput
            ? bindDocSearchFilter.call(this, element, scrollElement, searchInput, refresh)
            : null;
        const disposeSearchComposition: () => void = searchInput
            ? this.bindSearchInputComposition(searchInput, () => {
                this.applySearch(scrollElement, searchInput, refresh);
            }, scrollElement, refresh)
            : (): void => undefined;

        // 收藏下拉组件：星标触发 + 分组面板（侧边栏跳转后仅刷新列表；展开期间避免重建整栏 DOM）
        const favDd = element.querySelector<HTMLElement>(".sw__fav-dd");
        const refreshOnFavChanged = () => {
            const panelOpen = Boolean(favDd?.querySelector(".sw__fav-panel:not(.fn__none)"));
            if (panelOpen && scrollElement.isConnected) {
                this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), {
                    onOverlayClose: refresh,
                    onTabsChanged: refresh,
                }, this.getSettings().sortBy, {});
                return;
            }
            refresh();
        };
        this.setupFavDropdown(favDd, refresh, refreshOnFavChanged);

        // 分组·排序一体化浮层（与弹窗同款，浮层挂 body 不受 dock 层级影响）；
        // T-7040：disposer 与历史下拉一起并入返回值，由侧栏卸载链统一释放
        const disposeSortMenu = this.bindSortTriggerMenu(element,
            () => this.refreshSidebar(),
            () => this.refreshSidebar());

        element.querySelector(".sw__help-guide-btn")?.addEventListener("click", () => {
            this.openPlatformGuide("switcher");
        });
        element.querySelector(".sw__settings-btn")?.addEventListener("click", () => {
            this.openSetting();
        });

        // T-7041：侧栏独立日记入口（ROADMAP §2.2 三端必备）——复用桌面同一命令
        // openJournal，不新增第二套实现；侧栏是 dock 面板无需先销毁
        element.querySelector(".sw__journal-btn")?.addEventListener("click", () => {
            this.openJournal();
        });
        element.querySelector(".sw__activity-stream-btn")?.addEventListener("click", () => {
            this.openActivityStreamDialog();
        });

        const ecoStatusEl = element.querySelector<HTMLElement>(".sw__ecosystem-status");
        if (ecoStatusEl && typeof lvEcosystem !== "undefined" && typeof lvEcosystem.getStatusBadgeText === "function") {
            ecoStatusEl.textContent = lvEcosystem.getStatusBadgeText();
            ecoStatusEl.title = ecoStatusEl.textContent;
        }

        const backTopBtn = element.querySelector<HTMLElement>(".sw__back-top");
        let backTopRaf = 0;
        const onBackTopScroll = () => {
            if (backTopRaf) return;
            backTopRaf = window.requestAnimationFrame(() => {
                backTopRaf = 0;
                backTopBtn?.classList.toggle("sw__show", scrollElement.scrollTop >= BACK_TOP_THRESHOLD_PX);
            });
        };
        const onBackTopClick = () => {
            if (backTopRaf) {
                window.cancelAnimationFrame(backTopRaf);
                backTopRaf = 0;
            }
            scrollElement.scrollTo({top: 0, behavior: (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth"});
        };
        scrollElement.addEventListener("scroll", onBackTopScroll, {passive: true});
        backTopBtn?.addEventListener("click", onBackTopClick);
        // T-7040：排序浮层与历史下拉共用侧栏释放通道
        return () => {
            disposeSearchComposition();
            disposeHistoryDropdown();
            disposeSortMenu();
        };
    }

    // 重算容器内全部缩略图的缩放比例（侧边栏尺寸变化时调用，内容随面板宽度自动伸缩）
    // 侧栏刷新合并：loaded/destroy 事件连发（如批量打开/关闭）时合并为一次重建，
    // 避免逐事件全量重建侧栏 DOM；150ms 尾沿触发
    private scheduleSidebarRefresh() {
        if (this.sidebarRefreshTimer) return;
        this.sidebarRefreshTimer = window.setTimeout(() => {
            this.sidebarRefreshTimer = 0;
            if (!this.syncing && this.sidebarElement?.isConnected) this.refreshSidebar();
        }, 150);
    }

    private rescaleThumbs(container: HTMLElement) {
        if (this.navigation) {
            this.navigation.rescaleThumbs(container);
            return;
        }
        const thumbs = container.querySelectorAll<HTMLElement>(".sw__thumb");
        const measured: Array<{content: HTMLElement; width: number}> = [];
        for (let i = 0; i < thumbs.length; i += 1) {
            const thumb = thumbs[i];
            const content = thumb.querySelector<HTMLElement>(".sw__thumb-content");
            const width = thumb.clientWidth;
            if (content && width > 0) measured.push({content, width});
        }
        for (let i = 0; i < measured.length; i += 1) {
            const {content, width} = measured[i];
            content.style.transform = `scale(${(width / CONTENT_WIDTH_PX).toFixed(3)})`;
            content.style.visibility = "visible";
        }
    }

    // 刷新侧边栏列表（面板仍连接在 DOM 上时）
    private refreshSidebar() {
        if (this.syncing) return;
        if (this.sidebarElement?.isConnected) {
            this.renderSidebarPanel(this.sidebarElement);
        }
    }

    // 轻量刷新：仅更新侧边栏卡片的当前页签高亮（switch-protyle 高频触发，避免重建列表）
    private refreshSidebarActive() {
        const element = this.sidebarElement;
        if (!element?.isConnected) {
            return;
        }
        const activeId = this.getActiveTab()?.id;
        element.querySelectorAll<HTMLElement>(".sw__card").forEach((card) => {
            card.classList.toggle("sw__active", card.dataset.tabId === activeId);
        });
    }

    // 打开（或聚焦已打开的）侧边栏面板
    private toggleSidebar() {
        const type = this.name + SIDEBAR_DOCK_TYPE;
        try {
            const dock = this.getDockByType(type);
            if (dock) {
                dock.toggleModel(type, true);
                this.refreshSidebar();
            }
        } catch (e) {
            logger.warn("toggle sidebar fail", e);
        }
    }
}
