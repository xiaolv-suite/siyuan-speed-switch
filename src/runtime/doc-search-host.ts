import {Dialog, getActiveTab, openTab} from "siyuan";
import {logger} from "../logger";
import {getVisibleSwitcherCards} from "../util";
import {beginSearch} from "../search-session";
import {buildSearchCacheKey, buildUnifiedSections, buildNavigationResultModel, formatCleanQuery, parseSearchQuery, updateSavedSearchEntry} from "../search-model";
import {getBuiltinQuickActions, getGlobalQuickActions, resolveQuickActionLabel} from "../quick-actions";
import {applySavedSearchFilters, collectOpenRootIds, getDocSearchSession, openDocSearchResult, mountDocPreviewPane, renderDocResults, runDocSearchFetch, updateDocSearchHealth} from "../doc-search-ui";
import {projectRelatedContent, isRelatedCacheHit, buildRelatedSwrStore, mergeRelatedSwrEntry, beginRelatedContentRequest, isRelatedContentRequestCurrent, finishRelatedContentRequest} from "../related-content-model";
import {projectSnippetObjects, filterSnippetObjects} from "../platform-surface-model";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap, mountPlatformDialogMobileClose} from "../platform-dom";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {buildTagSmartGroupQuery, projectTagSmartGroupEntries} from "../favorite-actions";
import {normalizeFloatingBallConfig, applyFloatingBallPreset} from "../floating-ball-model";
import {SEARCH_DEBOUNCE_MS, MESSAGE_DEFAULT_MS, BLOCK_ID_RE, RELATED_SWR_KEY} from "../constants";
import {type IDocSearchFilters, type IOverlayClose, type QuickActionTarget, type IQuickAction, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface DocSearchHostRuntime extends Omit<ISpeedSwitchHost, "bindSearchInputComposition" | "bindSearchInputComposition" | "bindSearchInputComposition" | "applySearch" | "applySearchChips" | "renderCommandList" | "renderUnifiedSections" | "activateUnifiedItem" | "renderWorkbench" | "renderSnippetSearchSection" | "ensureSnippetObjects" | "recordRecentSearchQuery" | "copyToClipboard" | "persistRelatedSwr" | "fillRelatedContent" | "renderRelatedRow" | "openTagSmartGroupEntries" | "openHostListDialog"> {}
export class DocSearchHostRuntime {
    /**
     * 中文输入法（IME）守卫：composition（拼音候选中）期间的 input 事件
     * 不触发搜索，避免拼音中间态作为关键词发出请求并闪现错误结果；
     * compositionend 后立即补一次触发。applySearch 内部有防抖与请求
     * 序号去重，compositionend 与随后的 input 双触发是无害的。
     */
    private bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void): () => void;
    private bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void, scrollElement?: HTMLElement, onClose?: IOverlayClose): () => void;
    private bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void, scrollElement?: HTMLElement, onClose?: IOverlayClose): () => void {
        let composing = false;
        let disposed = false;
        const searchWrap = input.closest(".sw__search-wrap");
        const clearBtn = searchWrap?.querySelector<HTMLButtonElement>(".sw__search-clear");
        const updateClearVisibility = () => {
            if (clearBtn) {
                clearBtn.classList.toggle("fn__none", !input.value);
            }
        };
        let inputDebounceTimer: number | null = null;
        const clearDebounceTimer = () => {
            if (inputDebounceTimer !== null) {
                window.clearTimeout(inputDebounceTimer);
                inputDebounceTimer = null;
            }
        };
        const triggerDebounced = (immediate = false) => {
            clearDebounceTimer();
            if (disposed || input.isConnected === false || scrollElement?.isConnected === false) return;
            if (immediate) {
                onTrigger();
                return;
            }
            inputDebounceTimer = window.setTimeout(() => {
                inputDebounceTimer = null;
                if (disposed || input.isConnected === false || scrollElement?.isConnected === false) return;
                onTrigger();
            }, 80);
        };
        const onClearClick = () => {
            input.value = "";
            updateClearVisibility();
            triggerDebounced(true);
            input.focus();
        };
        if (clearBtn) {
            clearBtn.addEventListener("click", onClearClick);
        }
        const onFocus = () => {
            if (input.value) input.select();
        };
        const onCompositionStart = () => {
            composing = true;
            clearDebounceTimer();
        };
        const onCompositionEnd = () => {
            composing = false;
            updateClearVisibility();
            triggerDebounced(true);
        };
        const onInput = () => {
            updateClearVisibility();
            if (composing) return;
            // 若用户清空了输入框，立即恢复全量列表；若处于连续敲击打字中，使用 80ms 黄金防抖合并高频重绘
            if (!input.value) {
                triggerDebounced(true);
            } else {
                triggerDebounced(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && input.value) {
                if (composing || event.isComposing || event.keyCode === 229) return;
                event.preventDefault();
                event.stopPropagation();
                const rawVal = input.value;
                const prefixMatch = rawVal.match(/^(@|＠|\^|＾|#|＃|!|！|\*|＊|>|》|\?|？|:|：|-|－|task:|task：|\[ \])/);
                if (prefixMatch && rawVal.length > prefixMatch[0].length) {
                    input.value = prefixMatch[0];
                } else {
                    input.value = "";
                }
                updateClearVisibility();
                triggerDebounced(true);
                return;
            }
            if (event.key === "ArrowDown") {
                if (composing || event.isComposing || event.keyCode === 229) return;
                const scrollEl = scrollElement
                    || input.closest(".sw__body")?.querySelector<HTMLElement>(".sw__scroll")
                    || input.closest(".sw-platform-surface")?.querySelector<HTMLElement>(".sw__scroll");
                if (scrollEl) {
                    const cards = getVisibleSwitcherCards(scrollEl) as HTMLElement[];
                    const firstTarget = cards.find((c) => c.classList.contains("sw__focused")) || cards[0]
                        || scrollEl.querySelector<HTMLElement>(".sw__command-item")
                        || scrollEl.querySelector<HTMLElement>(".sw__unified-item")
                        || scrollEl.querySelector<HTMLElement>(".sw__doc-item")
                        || scrollEl.querySelector<HTMLElement>(".sw__workbench-tile")
                        || scrollEl.querySelector<HTMLElement>(".sw__doc-empty-action")
                        || scrollEl.querySelector<HTMLElement>(".sw__platform-guide-action");
                    if (firstTarget) {
                        event.preventDefault();
                        try { firstTarget.focus({preventScroll: true}); } catch (_) { firstTarget.focus(); }
                        firstTarget.scrollIntoView?.({block: "nearest"});
                        return;
                    }
                }
            }
            if (event.key === "Enter") {
                if (composing || event.isComposing || event.keyCode === 229) return;
                if (inputDebounceTimer !== null) {
                    clearDebounceTimer();
                    onTrigger();
                }
                const scrollEl = scrollElement
                    || input.closest(".sw__body")?.querySelector<HTMLElement>(".sw__scroll")
                    || input.closest(".sw-platform-surface")?.querySelector<HTMLElement>(".sw__scroll");
                if (scrollEl) {
                    const commandItem = scrollEl.querySelector<HTMLElement>(".sw__command-item");
                    if (commandItem) {
                        event.preventDefault();
                        commandItem.click();
                        return;
                    }
                    const cards = getVisibleSwitcherCards(scrollEl) as HTMLElement[];
                    const targetCard = cards.find((c) => c.classList.contains("sw__focused")) || cards[0];
                    if (targetCard && typeof this.activateCardByElement === "function") {
                        event.preventDefault();
                        if (!targetCard.classList.contains("sw__focused")) {
                            scrollEl.querySelectorAll<HTMLElement>(".sw__card.sw__focused, .sw__card[aria-current='true']").forEach((el) => {
                                el.classList.remove("sw__focused");
                                el.removeAttribute("aria-current");
                            });
                            targetCard.classList.add("sw__focused");
                            targetCard.setAttribute("aria-current", "true");
                        }
                        this.activateCardByElement(targetCard, onClose || (() => {}));
                        return;
                    }
                    const unifiedItem = scrollEl.querySelector<HTMLElement>(".sw__unified-item");
                    if (unifiedItem) {
                        event.preventDefault();
                        unifiedItem.click();
                        return;
                    }
                    const docItem = scrollEl.querySelector<HTMLElement>(".sw__doc-item");
                    if (docItem) {
                        event.preventDefault();
                        docItem.click();
                        return;
                    }
                }
                const session = scrollEl ? this.docSearchState?.sessions?.get(scrollEl) : undefined;
                if (session && session.timer !== null) {
                    window.clearTimeout(session.timer);
                    session.timer = null;
                    const flush = session.flush;
                    session.flush = null;
                    if (typeof flush === "function") {
                        flush();
                    }
                    event.preventDefault();
                    return;
                }
                const hasPendingRemote = Boolean(
                    scrollEl?.querySelector(".sw__doc-status--loading")
                    || (session && (session.timer !== null || session.controller))
                );
                // T-7413: 检索词无任何匹配项且无在途远程检索/挂起定时器时，按 Enter 自愈清空并刷新
                if (input.value) {
                    if (hasPendingRemote) {
                        event.preventDefault();
                        return;
                    }
                    event.preventDefault();
                    input.value = "";
                    updateClearVisibility();
                    onTrigger();
                    return;
                }
            }
        };
        input.addEventListener("focus", onFocus);
        input.addEventListener("compositionstart", onCompositionStart);
        input.addEventListener("compositionend", onCompositionEnd);
        input.addEventListener("input", onInput);
        input.addEventListener("keydown", onKeyDown);
        updateClearVisibility();
        return () => {
            disposed = true;
            clearDebounceTimer();
            if (clearBtn) clearBtn.removeEventListener("click", onClearClick);
            input.removeEventListener("focus", onFocus);
            input.removeEventListener("compositionstart", onCompositionStart);
            input.removeEventListener("compositionend", onCompositionEnd);
            input.removeEventListener("input", onInput);
            input.removeEventListener("keydown", onKeyDown);
        };
    }

    // 执行搜索：已打开页签匹配卡片显示在上半部分，同时（防抖）搜索全库文档标题显示在下半部分
    private applySearch(scrollElement: HTMLElement, searchInput: HTMLInputElement, onClose: IOverlayClose) {
        if (!scrollElement || scrollElement.isConnected === false) return;
        const keyword = searchInput.value.trim();
        if (keyword.length >= 2) {
            this.recordRecentSearchQuery?.(keyword);
        }
        scrollElement.dataset.swDocSearchQuery = keyword;
        const isCommand = this.search ? this.search.isCommandMode(keyword) : (keyword.startsWith(">") || keyword.startsWith("》"));
        searchInput.dataset.swMode = isCommand ? "command" : "search";
        const session = getDocSearchSession.call(this, scrollElement);
        // 所有输入分支（含命令模式）均立即取消旧定时器/请求并使旧结果失效。
        const version = beginSearch(session);
        const filters = this.docSearchState.filters.get(scrollElement) || {};
        // T-6802 查询运算符：解析一次，全链路共享（本地页签匹配 / 内核查询清洗 /
        // 统一索引分区 / 文档结果客户端预过滤）。发给内核的查询剔除排除项。
        const parsedQuery = this.search ? this.search.parseQuery(searchInput.value) : parseSearchQuery(searchInput.value);
        const rawKernelQuery = isCommand ? "" : (this.search ? this.search.formatCleanQuery(parsedQuery) : formatCleanQuery(parsedQuery));
        const isTaskPenetration = !isCommand && (
            keyword.startsWith("- ") || keyword.startsWith("－ ")
            || keyword.startsWith("task:") || keyword.startsWith("task：")
            || keyword.startsWith("[ ]")
            || ((keyword.startsWith("-") || keyword.startsWith("－")) && !/\s+\S/.test(keyword))
        );
        const kernelQuery = isTaskPenetration && !rawKernelQuery ? keyword : rawKernelQuery;
        this.docSearchState.parsedQueries.set(scrollElement, parsedQuery);
        const localTabCount = this.filterCards(scrollElement, searchInput.value, new Set(), filters, parsedQuery);
        updateDocSearchHealth.call(this, scrollElement, {
            query: keyword,
            remote: Boolean(kernelQuery),
            state: kernelQuery ? "loading" : "idle",
            counts: {tabs: localTabCount},
            sources: {
                tabs: {status: localTabCount > 0 ? "ready" : "empty"},
                opened: {status: kernelQuery ? "pending" : "skipped"},
                global: {status: kernelQuery ? "pending" : "skipped"},
            },
        }, true);
        // T-6799 统一索引：查询时把"收藏/最近关闭/文档集"的命中分区渲染在
        // 页签卡片与全库文档结果之间；空查询时整块移除。
        // T-6820 命令前缀：`>` 进入命令面板模式，只列可执行动作（不再搜文档）
        if (keyword.startsWith("》")) {
            scrollElement.querySelector(".sw__snippet-results")?.remove();
            this.renderCommandList(scrollElement, this.search ? this.search.extractCommandQuery(keyword) : keyword.slice(1).trim(), onClose);
            return;
        }
        if (keyword.startsWith(">")) {
            scrollElement.querySelector(".sw__snippet-results")?.remove();
            this.renderCommandList(scrollElement, this.search ? this.search.extractCommandQuery(keyword) : keyword.slice(1).trim(), onClose);
            return;
        }
        scrollElement.querySelector(".sw__command-list")?.remove();
        this.renderUnifiedSections(scrollElement, keyword, onClose, parsedQuery);
        // T-6881 查询态片段分区：关键词命中原生片段时呈现"片段实验室"分区
        this.renderSnippetSearchSection(scrollElement, keyword);
        // T-6807 零词条工作台：空查询时直接呈现"场景预设/文档集/智能分组"入口。
        this.renderWorkbench(scrollElement, keyword, onClose);
        // T-6809 过滤条：查询时在结果区顶部提供类型收窄 chips（纯展示层可见性）。
        this.applySearchChips(scrollElement, keyword);

        // 关键词为空：隐藏文档结果，恢复纯列表
        if (keyword === "" || (kernelQuery === "" && !isTaskPenetration)) {
            // 空查询，或只剩排除项（没有正向词可交给内核）时不发请求
            renderDocResults.call(this, scrollElement, null, onClose);
            const tabLayout = scrollElement.querySelector<HTMLElement>(".sw__tab-preview");
            if (tabLayout) mountDocPreviewPane.call(this, tabLayout, scrollElement);
            return;
        }
        // 命中缓存直接渲染（缓存结果可安全复用）
        const cacheKey = buildSearchCacheKey({scope: "global", query: kernelQuery, filters});
        const cached = session.cache.get(cacheKey);
        if (cached) {
            renderDocResults.call(this, scrollElement, cached, onClose);
            // Open-tab content is surface-specific and may have changed since
            // the cached global result. Refresh it without re-fetching global.
            void runDocSearchFetch.call(this, scrollElement, searchInput, keyword, version, onClose, filters, cacheKey, kernelQuery);
            return;
        }
        renderDocResults.call(this, scrollElement, [], onClose, "loading");
        // 延迟 180ms 再请求全库文档（防抖），避免每个按键都打内核；
        const flushRemoteSearch = () => {
            session.timer = null;
            session.flush = null;
            // 守卫用原始 keyword，内核请求用清洗后的 kernelQuery（T-6802 修正）
            void runDocSearchFetch.call(this, scrollElement, searchInput, keyword, version, onClose, filters, cacheKey, kernelQuery);
        };
        session.flush = flushRemoteSearch;
        session.timer = window.setTimeout(flushRemoteSearch, SEARCH_DEBOUNCE_MS);
    }

    private applySearchChips(scrollElement: HTMLElement, keyword: string) {
        if (!keyword) {
            this.docSearchState.chipFilters.delete(scrollElement);
            scrollElement.removeAttribute("data-sw-chip");
            scrollElement.querySelector(".sw__search-chips")?.remove();
            return;
        }
        const selected = this.docSearchState.chipFilters.get(scrollElement) || "all";
        scrollElement.dataset.swChip = selected;
        let row = scrollElement.querySelector<HTMLElement>(".sw__search-chips");
        if (!row) {
            row = document.createElement("div");
            row.className = "sw__search-chips";
            // T-7007：chips 语义收口为按钮组（aria-pressed）——半套 tablist
            // （有 role=tab 无 aria-controls/roving/方向键）比诚实降级更误导读屏。
            row.setAttribute("role", "group");
            row.setAttribute("aria-label", this.i18n.chipsLabel);
            const defs: Array<[string, string]> = [
                ["all", this.i18n.chipsAll],
                ["tabs", this.i18n.chipsTabs],
                ["unified", this.i18n.chipsCollections],
                ["docs", this.i18n.chipsDocs],
            ];
            defs.forEach(([key, label]) => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "sw__search-chip";
                chip.dataset.chip = key;
                chip.textContent = label;
                chip.setAttribute("aria-pressed", "false");
                chip.addEventListener("click", () => {
                    this.docSearchState.chipFilters.set(scrollElement, key);
                    scrollElement.dataset.swChip = key;
                    row!.querySelectorAll<HTMLElement>(".sw__search-chip").forEach((el) => {
                        const active = el.dataset.chip === key;
                        el.classList.toggle("is-active", active);
                        el.setAttribute("aria-pressed", String(active));
                    });
                });
                row.appendChild(chip);
            });
            scrollElement.prepend(row);
        }
        row.querySelectorAll<HTMLElement>(".sw__search-chip").forEach((el) => {
            const active = el.dataset.chip === selected;
            el.classList.toggle("is-active", active);
            el.setAttribute("aria-pressed", String(active));
        });
    }

    // 常驻多模态搜索模式 Chips 栏（对标 Arc / Raycast 模式指示与快速切换）
    setupSearchModeChips(container: HTMLElement | null, searchInput: HTMLInputElement | null, onTrigger: () => void): () => void {
        if (!container || !searchInput) return () => undefined;
        const isVisible = Boolean(this.getSettings?.()?.showSearchModeChips);
        if (!isVisible) {
            container.classList.add("fn__none");
            container.style.display = "none";
        } else {
            container.classList.remove("fn__none");
            container.style.display = "";
        }
        const isMobileInput = this.isMobile || Boolean(searchInput.closest(".sw__mobile"));
        const defaultPlaceholder = isMobileInput
            ? (this.i18n.searchTabsMobile || "搜索页签/文档…")
            : (this.i18n.searchTabs || "搜索页签或全库文档…");
        const modes = [
            {key: "all", prefix: "", label: this.i18n.chipsTabs || "页签", icon: "iconLayout", placeholder: defaultPlaceholder},
            {key: "outline", prefix: "@", label: "@ " + (this.i18n.searchModeHeading || "大纲"), icon: "iconAlignLeft", placeholder: "@ " + (this.i18n.searchModeHeading || "大纲") + "…"},
            {key: "block", prefix: "^", label: "^ " + (this.i18n.searchModeBlock || "正文"), icon: "iconParagraph", placeholder: "^ " + (this.i18n.searchModeBlock || "正文") + "…"},
            {key: "tag", prefix: "#", label: "# " + (this.i18n.searchModeTag || "标签"), icon: "iconTag", placeholder: "# " + (this.i18n.searchModeTag || "标签") + "…"},
            {key: "bookmark", prefix: "!", label: "! " + (this.i18n.searchModeBookmark || "书签"), icon: "iconBookmark", placeholder: "! " + (this.i18n.searchModeBookmark || "书签") + "…"},
            {key: "command", prefix: ">", label: "> " + (this.i18n.searchModeCommand || "命令"), icon: "iconSparkles", placeholder: "> " + (this.i18n.searchModeCommand || "命令") + "…"},
            {key: "task", prefix: "-", label: "- " + (this.i18n.searchModeTask || "待办"), icon: "iconCheck", placeholder: "- " + (this.i18n.searchModeTask || "待办") + "…"},
            {key: "help", prefix: "?", label: "? " + (this.i18n.searchModeHelp || "速查"), icon: "iconHelp", placeholder: "? " + (this.i18n.searchModeHelp || "速查") + "…"},
        ];
        container.innerHTML = "";
        container.className = "sw__mode-chips-bar" + (isVisible ? "" : " fn__none");
        container.setAttribute("role", "group");
        container.setAttribute("aria-label", this.i18n.chipsLabel);

        const chipButtons: HTMLElement[] = [];
        const updateActiveMode = () => {
            const val = (searchInput.value || "").trim();
            let matchedPrefix = "";
            if (val.startsWith("@") || val.startsWith("＠") || (val.includes(":") && !val.includes("://")) || (val.includes("：") && !val.includes("://"))) matchedPrefix = "@";
            else if (val.startsWith("^") || val.startsWith("＾") || val.startsWith("……")) matchedPrefix = "^";
            else if (val.startsWith("#") || val.startsWith("＃")) matchedPrefix = "#";
            else if (val.startsWith("!") || val.startsWith("！") || val.startsWith("*") || val.startsWith("＊")) matchedPrefix = "!";
            else if (val.startsWith(">") || val.startsWith("》")) matchedPrefix = ">";
            else if (val.startsWith("?") || val.startsWith("？")) matchedPrefix = "?";
            else if (val.startsWith("-") || val.startsWith("－") || val.startsWith("task:") || val.startsWith("task：") || val.startsWith("[ ]")) matchedPrefix = "-";

            chipButtons.forEach((btn) => {
                const btnPrefix = btn.dataset.prefix || "";
                const active = matchedPrefix ? btnPrefix === matchedPrefix : btnPrefix === "";
                btn.classList.toggle("is-active", active);
                btn.setAttribute("aria-pressed", String(active));
            });
            const activeMode = modes.find((m) => m.prefix === matchedPrefix) || modes[0];
            searchInput.placeholder = activeMode.placeholder;
        };

        if (isVisible) {
            modes.forEach(({key, prefix, label, icon}) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "b3-button b3-button--text sw__mode-chip" + (prefix === "" ? " is-active" : "");
                btn.dataset.mode = key;
                btn.dataset.prefix = prefix;
                btn.setAttribute("aria-pressed", String(prefix === ""));
                btn.innerHTML = `<svg width="12" height="12"><use xlink:href="#${icon}"></use></svg><span>${label}</span>`;
                btn.addEventListener("click", () => {
                    const rawVal = searchInput.value || "";
                    const currentPrefixMatch = rawVal.match(/^(@|＠|\^|＾|#|＃|!|！|\*|＊|>|》|\?|？|:|：|-|－|task:|task：|\[ \])/);
                    const pureText = currentPrefixMatch ? rawVal.slice(currentPrefixMatch[0].length).trim() : rawVal.trim();
                    const isAlreadyActive = btn.classList.contains("is-active") && prefix !== "";
                    if (isAlreadyActive || prefix === "") {
                        // T-7599: 二次点击当前已激活药丸，或者点击“全部/页签”，翻转取消前缀恢复全量模式
                        searchInput.value = pureText;
                    } else if (prefix === "-") {
                        searchInput.value = pureText ? `- ${pureText}` : prefix;
                    } else {
                        searchInput.value = pureText ? `${prefix}${pureText}` : prefix;
                    }
                    updateActiveMode();
                    onTrigger();
                    searchInput.focus();
                });
                btn.addEventListener("keydown", (e: KeyboardEvent) => {
                    const idx = chipButtons.indexOf(btn);
                    if (e.key === "ArrowRight") {
                        e.preventDefault();
                        chipButtons[(idx + 1) % chipButtons.length]?.focus();
                    } else if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        chipButtons[(idx - 1 + chipButtons.length) % chipButtons.length]?.focus();
                    } else if (e.key === "Tab") {
                        e.preventDefault();
                        if (e.shiftKey) {
                            if (idx === 0) searchInput.focus();
                            else chipButtons[idx - 1]?.focus();
                        } else {
                            if (idx === chipButtons.length - 1) searchInput.focus();
                            else chipButtons[idx + 1]?.focus();
                        }
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        searchInput.focus();
                    } else if (e.key === "Home") {
                        e.preventDefault();
                        chipButtons[0]?.focus();
                    } else if (e.key === "End") {
                        e.preventDefault();
                        chipButtons[chipButtons.length - 1]?.focus();
                    }
                });
                chipButtons.push(btn);
                container.appendChild(btn);
            });
        }

        const onSearchKeyDown = (e: KeyboardEvent) => {
            if (!isVisible || chipButtons.length === 0) return;
            if (e.key === "ArrowUp" && searchInput.selectionStart === 0 && searchInput.selectionEnd === 0) {
                const activeBtn = chipButtons.find((b) => b.classList.contains("is-active")) || chipButtons[0];
                if (activeBtn) {
                    e.preventDefault();
                    activeBtn.focus();
                }
            } else if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey && !searchInput.value) {
                // T-7837: 搜索框空值时按 Tab / Shift+Tab 直达穿透药丸导航 (CAND-05)
                e.preventDefault();
                const activeIdx = chipButtons.findIndex((b) => b.classList.contains("is-active"));
                const targetIdx = e.shiftKey
                    ? (activeIdx <= 0 ? chipButtons.length - 1 : activeIdx - 1)
                    : (activeIdx >= chipButtons.length - 1 ? 0 : activeIdx + 1);
                chipButtons[targetIdx]?.focus();
            }
        };

        searchInput.addEventListener("input", updateActiveMode);
        searchInput.addEventListener("keydown", onSearchKeyDown);
        return () => {
            searchInput.removeEventListener("input", updateActiveMode);
            searchInput.removeEventListener("keydown", onSearchKeyDown);
        };
    }

    private renderCommandList(scrollElement: HTMLElement, query: string, onClose: IOverlayClose) {
        scrollElement.querySelector(".sw__unified")?.remove();
        scrollElement.querySelector(".sw__doc-results")?.remove();
        scrollElement.querySelector(".sw__search-chips")?.remove();
        let box = scrollElement.querySelector<HTMLElement>(".sw__command-list");
        if (!box) {
            box = document.createElement("div");
            box.className = "sw__command-list sw__group";
            // 键盘上下方向键循环切换与回车执行命令项 (B-13)
            box.addEventListener("keydown", (event: KeyboardEvent) => {
                const active = document.activeElement as HTMLElement | null;
                if (!active || !active.classList.contains("sw__command-item")) return;
                const items = Array.from(box!.querySelectorAll<HTMLElement>(".sw__command-item:not([disabled])"));
                const currentIndex = items.indexOf(active);
                if (currentIndex === -1) return;
                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    const nextIndex = (currentIndex + 1) % items.length;
                    const nextItem = items[nextIndex];
                    nextItem?.focus();
                    nextItem?.scrollIntoView({block: "nearest"});
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    if (currentIndex === 0) {
                        const searchInput = scrollElement.closest(".speed-switch")?.querySelector<HTMLInputElement>("input.sw__search");
                        searchInput?.focus();
                    } else {
                        const prevItem = items[currentIndex - 1];
                        prevItem?.focus();
                        prevItem?.scrollIntoView({block: "nearest"});
                    }
                }
            });
            scrollElement.appendChild(box);
        }
        box.classList.remove("fn__none");
        box.textContent = "";
        const label = document.createElement("div");
        label.className = "sw__window-label";
        label.textContent = this.i18n.commandModeLabel;
        box.appendChild(label);
        // T-6845：命令模式标签同走宿主 i18n（P-F 中英混排收口）
        const catalog = [...getBuiltinQuickActions(), ...getGlobalQuickActions()]
            .filter((action) => action.targets?.includes("desktop"))
            .map((action) => ({...action, label: resolveQuickActionLabel(action, this.i18n)}));
        const matched = this.search.filterCommands(query, catalog);
        if (!matched.length) {
            const empty = document.createElement("div");
            empty.className = "sw__doc-status sw__doc-status--empty";
            empty.textContent = this.i18n.commandModeEmpty;
            box.appendChild(empty);
            return;
        }
        // T-6911：内建动作与思源宿主命令分两组展示；组头可折叠（P5 选择器同款交互 +
        // 键盘等价），注册表本身有界（内建 22 + 宿主 12），不再做整体截断。
        const groups: Array<{key: "builtin" | "global" | "plugins"; label: string; actions: typeof matched}> = [
            {key: "builtin", label: this.i18n.commandGroupBuiltin, actions: matched.filter((action) => action.kind !== "global")},
            {key: "global", label: this.i18n.commandGroupGlobal, actions: matched.filter((action) => action.kind === "global")},
        ];
        const pluginCommands = this.getPluginCommands();
        if (pluginCommands.length > 0) {
            const pluginActions = this.search.filterCommands(query, pluginCommands)
                .slice(0, 15)
                .map((cmd) => ({
                    id: cmd.id,
                    kind: "command" as const,
                    value: cmd.value,
                    label: `${cmd.pluginTitle} · ${cmd.label}`,
                    icon: cmd.icon || "iconPlugin",
                    targets: ["desktop", "sidebar", "mobile"] as QuickActionTarget[],
                }));
            if (pluginActions.length > 0) {
                groups.push({
                    key: "plugins",
                    label: this.i18n.commandGroupPlugins || "生态与插件命令",
                    actions: pluginActions as any,
                });
            }
        }
        const q = query.toLowerCase();
        // 支持快门与常用直达 (Epoch 6 联邦规范)
        const commonBridge: any = getBridgeSafely("common");
        if (commonBridge && typeof commonBridge.search === "function" && q) {
            const expectedQuery = q;
            void Promise.resolve(commonBridge.search(q)).then((res: any) => {
                if (!box.isConnected) return;
                const activeSearchInput = scrollElement.closest(".speed-switch")?.querySelector<HTMLInputElement>("input.sw__search");
                if (activeSearchInput && activeSearchInput.value.trim().replace(/^[>＞]\s*/, "").toLowerCase() !== expectedQuery) return;
                box.querySelector(".sw__command-group--common")?.remove();
                if (res?.ok && Array.isArray(res.data) && res.data.length > 0) {
                    const commonGroup = document.createElement("div");
                    commonGroup.className = "sw__command-group sw__command-group--common";
                    const commonHeading = document.createElement("div");
                    commonHeading.className = "sw__window-label";
                    commonHeading.textContent = `小驴常用 · ${Math.min(5, res.data.length)}`;
                    const commonList = document.createElement("div");
                    commonList.className = "sw__command-group-list";
                    res.data.slice(0, 5).forEach((snippet: any) => {
                        const itemEl = document.createElement("button");
                        itemEl.type = "button";
                        itemEl.className = "sw__command-item b3-list-item";
                        itemEl.innerHTML = `<span class="sw__command-icon"><svg aria-hidden="true"><use xlink:href="#iconFile"></use></svg></span><span class="sw__command-label">${this.escapeAttr(snippet.title || snippet.content || "")}</span><span class="sw__command-kind">↵</span>`;
                        itemEl.onclick = () => {
                            this.copyToClipboard(snippet.content || "");
                            onClose();
                        };
                        commonList.appendChild(itemEl);
                    });
                    commonGroup.append(commonHeading, commonList);
                    box.appendChild(commonGroup);
                }
            }).catch(() => {});
        }
        for (const group of groups) {
            if (!group.actions.length) continue;
            const section = document.createElement("div");
            section.className = "sw__command-group";
            const heading = document.createElement("div");
            heading.className = "sw__window-label sw__command-group-toggle";
            heading.textContent = `${group.label} · ${group.actions.length}`;
            heading.setAttribute("role", "button");
            heading.tabIndex = 0;
            const commandGroupList = document.createElement("div");
            commandGroupList.className = "sw__command-group-list";
            const applyCollapsed = () => {
                const collapsed = this.commandCollapsedGroups.has(group.key);
                commandGroupList.style.display = collapsed ? "none" : "";
                heading.setAttribute("aria-expanded", String(!collapsed));
            };
            const toggleCollapsed = () => {
                if (this.commandCollapsedGroups.has(group.key)) this.commandCollapsedGroups.delete(group.key);
                else this.commandCollapsedGroups.add(group.key);
                applyCollapsed();
            };
            heading.addEventListener("click", toggleCollapsed);
            heading.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleCollapsed();
                }
            });
            section.appendChild(heading);
            group.actions.forEach((action) => {
                // 审查轮 P-A：命令项重做为 quick pick 式行（左图标 + 左对齐标签 + 右激活提示），
                // 之前复用 .sw__doc-item 类但处在 .sw__command-list 作用域外，退化为裸按钮
                const item = document.createElement("button");
                item.type = "button";
                item.className = "sw__command-item";
                const icon = document.createElement("span");
                icon.className = "sw__command-icon";
                icon.innerHTML = `<svg aria-hidden="true"><use xlink:href="#${this.escapeAttr(action.icon || "iconTerminal")}"></use></svg>`;
                const label = document.createElement("span");
                label.className = "sw__command-label";
                label.textContent = action.label || action.value || "";
                const hint = document.createElement("span");
                hint.className = "sw__command-kind";
                hint.textContent = "↵";
                hint.title = this.i18n.commandModeLabel;
                item.append(icon, label, hint);
                item.addEventListener("click", () => {
                    onClose();
                    this.executeQuickAction(action as IQuickAction, null, onClose);
                });
                commandGroupList.appendChild(item);
            });
            section.appendChild(commandGroupList);
            applyCollapsed();
            box.appendChild(section);
        }
    }

    private renderUnifiedSections(scrollElement: HTMLElement, keyword: string, onClose: IOverlayClose, parsedQuery?: {phrases: string[]; excludes: string[]; terms: string[]}) {
        const existing = scrollElement.querySelector<HTMLElement>(".sw__unified");
        if (!keyword) {
            existing?.remove();
            return;
        }
        const sections = buildUnifiedSections({
            query: keyword,
            favorites: this.getFavorites(),
            closed: this.getClosedHistory(),
            documentSets: this.getDocumentSets(),
            excludeRootIds: collectOpenRootIds.call(this),
            limitPerSection: 4,
            parsedQuery,
        });
        const navigation: any = buildNavigationResultModel({
            query: keyword,
            unifiedSections: sections,
            maxItemsPerGroup: 4,
            maxTotalItems: 12,
        });
        const unifiedGroup = navigation.groups.find((group: any) => group.key === "unified");
        const visibleSections = unifiedGroup?.sections || [];
        if (!visibleSections.length) {
            existing?.remove();
            return;
        }
        let box = existing;
        if (!box) {
            box = document.createElement("div");
            box.className = "sw__unified";
            const docResults = scrollElement.querySelector(".sw__doc-results");
            if (docResults) scrollElement.insertBefore(box, docResults);
            else scrollElement.appendChild(box);
        }
        box.textContent = "";
        const sectionTitles: Record<string, string> = {
            favorites: this.i18n.unifiedFavorites,
            closed: this.i18n.unifiedClosed,
            "doc-sets": this.i18n.unifiedDocSets,
        };
        visibleSections.forEach((section: any) => {
            const sectionEl = document.createElement("div");
            sectionEl.className = "sw__unified-section";
            const label = document.createElement("div");
            label.className = "sw__window-label";
            label.textContent = sectionTitles[section.key] || section.key;
            const grid = document.createElement("div");
            grid.className = "sw__doc-grid";
            section.items.forEach((item: any) => {
                const record = item as Record<string, unknown>;
                const meta = item.kind === "favorite"
                    ? (String(record.group || "") || this.i18n.unifiedFavorites)
                    : item.kind === "doc-set"
                        ? `${record.entryCount} ${this.i18n.unifiedDocSetDocs}`
                        : (Number(record.closedAt) > 0 ? new Date(Number(record.closedAt)).toLocaleDateString() : "");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "sw__doc-item";
                // T-6799 布局修复：补齐 32px 图标列——统一分区条目此前缺少
                // .sw__doc-icon 导致 .sw__doc-copy 被放入 32px 列，文字压成 2 字宽
                const icon = document.createElement("span");
                icon.className = "sw__doc-icon";
                icon.innerHTML = '<svg aria-hidden="true"><use xlink:href="#iconFile"></use></svg>';
                const copy = document.createElement("span");
                copy.className = "sw__doc-copy";
                const title = document.createElement("span");
                title.className = "sw__doc-title";
                title.textContent = item.kind === "doc-set"
                    ? String(record.name || "")
                    : String(record.title || "");
                const metaEl = document.createElement("span");
                metaEl.className = "sw__doc-path";
                if (meta) metaEl.textContent = meta;
                copy.append(title, metaEl);
                button.append(icon, copy);
                button.addEventListener("click", () => this.activateUnifiedItem(item, onClose));
                // T-6810 并排打开：右键在右侧分屏打开（桌面）
                if (!this.isMobile && (item.kind === "favorite" || item.kind === "closed")) {
                    const itemRecord = item as Record<string, unknown>;
                    const rootId = String(itemRecord.rootId || "");
                    if (rootId && BLOCK_ID_RE.test(rootId)) {
                        button.title = (button.title ? button.title + " · " : "") + this.i18n.docSearchSplitHint;
                        button.addEventListener("contextmenu", (event) => {
                            event.preventDefault();
                            onClose();
                            void this.bridge.openTab({app: this.app, doc: {id: rootId}, position: "right"});
                        });
                    }
                }
                grid.appendChild(button);
            });
            sectionEl.append(label, grid);
            box.appendChild(sectionEl);
        });
    }

    private activateUnifiedItem(item: {kind: string; key?: string; rootId?: string; setId?: string}, onClose: IOverlayClose) {
        if (item.kind === "favorite") {
            const favorite = this.getFavorites().find((fav) => fav.key === item.key);
            if (favorite) {
                onClose();
                void this.jumpToFavorite(favorite, () => undefined);
                return;
            }
        }
        if (item.kind === "closed" || (item.kind === "favorite" && item.rootId)) {
            const rootId = String(item.rootId || "");
            if (!rootId) return;
            onClose();
            if (this.isMobile) {
                void this.mobileOpenDoc(rootId);
            } else {
                void this.bridge.openTab({app: this.app, doc: {id: rootId}});
            }
            return;
        }
        if (item.kind === "doc-set" && item.setId) {
            onClose();
            void this.restoreDocumentSetFromHome(item.setId);
        }
    }

    // T-6807 零词条工作台：空查询时直接呈现"场景预设/文档集/智能分组"入口
    // （Kvaesitso/Notion 的零态即工作台思想）。全部来自本地配置或按需拉取，
    // 不发任何无界请求；有查询时整块移除，避免与结果区争抢注意力。
    private renderWorkbench(scrollElement: HTMLElement, keyword: string, onClose: IOverlayClose) {
        // P3：工作台停靠坞——独立于滚动流的固定区域，页签再多也常驻首屏
        const dock = scrollElement.parentElement?.querySelector<HTMLElement>(".sw__workbench-dock");
        if (!dock) return;
        const existing = dock.querySelector<HTMLElement>(".sw__workbench");
        if (keyword) {
            existing?.remove();
            dock.classList.add("fn__none");
            return;
        }
        if (existing) return;
        const presets = normalizeFloatingBallConfig(this.getSettings().floatingBall).presets || [];
        const docSets = this.getDocumentSets();
        const smartGroups = this.getSettings().favoriteSmartGroups || [];
        const savedSearches = this.getSettings().savedSearches || [];
        const activeRootId = this.rootIdOf(this.getActiveTab());
        const snippetCache = this.snippetObjectsCache;
        const snippetCacheFresh = Boolean(snippetCache && snippetCache.items.length && Date.now() - snippetCache.at < 60000);
        if (!presets.length && !docSets.length && !smartGroups.length && !savedSearches.length && !activeRootId && !snippetCacheFresh) {
            dock.classList.add("fn__none");
            return;
        }
        dock.classList.remove("fn__none");

        const box = document.createElement("div");
        box.className = "sw__workbench";
        const title = document.createElement("div");
        title.className = "sw__window-label";
        title.textContent = this.i18n.workbenchLabel;
        box.appendChild(title);

        const addRow = (label: string, items: Array<{label: string; onClick: () => void; onRemove?: () => void}>, kind = "default") => {
            if (!items.length) return;
            const rowTitle = document.createElement("div");
            rowTitle.className = "sw__workbench-row-label";
            rowTitle.textContent = label;
            box.appendChild(rowTitle);
            const row = document.createElement("div");
            row.className = "sw__workbench-row";
            items.forEach((item) => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "sw__workbench-chip";
                chip.dataset.swWorkbenchKind = kind;
                chip.textContent = item.label;
                chip.addEventListener("click", () => {
                    chip.disabled = true;
                    item.onClick();
                    chip.disabled = false;
                });
                // T-6827：保存的搜索支持右键删除（确认后移除并重建工作台）
                chip.addEventListener("contextmenu", (event) => {
                    if (!item.onRemove) return;
                    event.preventDefault();
                    item.onRemove();
                });
                row.appendChild(chip);
            });
            box.appendChild(row);
        };

        addRow(this.i18n.workbenchPresets, presets.map((preset: any) => ({
            label: preset.name,
            onClick: () => {
                const applied = applyFloatingBallPreset(this.getSettings().floatingBall, preset.id);
                if (!applied.preset) return;
                this.updateSettings({floatingBall: applied.config});
                showMessage(this.i18n.floatingBallPresetApplied.replace("{x}", applied.preset.name), MESSAGE_DEFAULT_MS);
            },
        })), "preset");
        addRow(this.i18n.workbenchDocSets, docSets.map((set: any) => ({
            label: set.name,
            onClick: () => {
                onClose();
                void this.restoreDocumentSetFromHome(set.setId);
            },
        })), "document-set");
        addRow(this.i18n.workbenchSmart, smartGroups.map((group) => ({
            label: `#${group.tag}`,
            onClick: () => this.openTagSmartGroupEntries(group),
        })), "smart-group");
        // T-6827 保存的搜索：单击应用（查询+笔记本筛选回放），右键删除
        addRow(this.i18n.workbenchSaved, savedSearches.map((saved: any) => ({
            label: saved.name,
            onClick: () => this.applySavedSearch(scrollElement, saved, onClose),
            onRemove: () => {
                if (!confirm(String(this.i18n.searchSavedDeleteConfirm).replace("{x}", String(saved.name || "")))) return;
                this.updateSettings({
                    savedSearches: (this.getSettings().savedSearches || []).filter((item: any) => item?.id !== saved.id),
                });
                scrollElement.querySelector(".sw__workbench")?.remove();
                this.renderWorkbench(scrollElement, "", onClose);
            },
        })), "saved-search");

        // T-6814 关联内容：活动文档的反链/提及（官方 getBacklink2 单次往返，
        // 有界投影 + 60s 会话缓存 + 竞态丢弃）。无活动文档或加载失败时整行不出现。
        if (activeRootId) {
            const relatedBox = document.createElement("div");
            relatedBox.className = "sw__workbench-related";
            // P2 骨架屏：等待期显示脉冲占位，数据到达后整行替换
            const skeleton = document.createElement("div");
            skeleton.className = "sw__workbench-row-label sw__workbench-related--loading";
            skeleton.textContent = this.i18n.workbenchRelated;
            skeleton.setAttribute("aria-busy", "true");
            relatedBox.appendChild(skeleton);
            box.appendChild(relatedBox);
            void this.fillRelatedContent(relatedBox, activeRootId, onClose);
        }

        // T-6979：无查询态的回执区只保留当前文档相关内容；片段对象
        // 仍可通过查询态分区及片段实验室内部选择器访问。

        // P3：工作台停靠坞：若存在页签预览双栏布局，挂载至左栏（.sw__tab-content）底部，
        // 确保右侧预览窗格（.sw__doc-preview）拥有纵贯全高的独立速览通道，不再被全宽底栏拦腰截断。
        const tabContent = scrollElement.querySelector<HTMLElement>(".sw__tab-content");
        if (tabContent && tabContent.isConnected) {
            tabContent.querySelectorAll(".sw__workbench").forEach((el) => el.remove());
            tabContent.appendChild(box);
            dock.textContent = "";
            dock.classList.add("fn__none");
        } else {
            dock.textContent = "";
            dock.appendChild(box);
            dock.classList.remove("fn__none");
        }
    }

    // T-6881（P2 第三批）：查询态片段分区——关键词命中原生片段名/类型时，
    // 在统一分区之后渲染"片段实验室"分区；单击行为与工作台 chips 一致
    // （携带 objectId 打开工作室定位片段）。关键词已变时丢弃本次渲染；
    // 空查询/无命中不占位。
    private renderSnippetSearchSection(scrollElement: HTMLElement, keyword: string) {
        const existing = scrollElement.querySelector<HTMLElement>(".sw__snippet-results");
        if (!keyword) {
            existing?.remove();
            return;
        }
        void this.ensureSnippetObjects().then((items) => {
        if (!scrollElement.isConnected) return;
        // 输入已前进：放弃旧关键词的渲染（本次取数已入缓存，下一次 applySearch 受益）
        if (scrollElement.dataset.swDocSearchQuery !== keyword) {
            existing?.remove();
            return;
        }
            const matched = filterSnippetObjects(this.snippetObjectsCache?.items || [], keyword, 6);
            if (!matched.length) {
                existing?.remove();
                return;
            }
            let box = existing;
            if (!box) {
                box = document.createElement("div");
                box.className = "sw__snippet-results";
                const docResults = scrollElement.querySelector(".sw__doc-results");
                if (docResults) scrollElement.insertBefore(box, docResults);
                else scrollElement.appendChild(box);
            }
            box.textContent = "";
            const label = document.createElement("div");
            label.className = "sw__window-label";
            label.textContent = `${this.i18n.workbenchSnippets} · ${matched.length}`;
            box.appendChild(label);
            const grid = document.createElement("div");
            grid.className = "sw__doc-grid";
            matched.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "sw__doc-item";
                const icon = document.createElement("span");
                icon.className = "sw__doc-icon";
                icon.textContent = item.type.toUpperCase();
                const copy = document.createElement("span");
                copy.className = "sw__doc-copy";
                const title = document.createElement("span");
                title.className = "sw__doc-title";
                title.textContent = item.name;
                const meta = document.createElement("span");
                meta.className = "sw__doc-path";
                meta.textContent = `${item.type.toUpperCase()} · ${item.lines} ${this.i18n.unitLines}${item.enabled ? " · " + this.i18n.snippetEnabledShort : ""}`;
                copy.append(title, meta);
                button.append(icon, copy);
                button.addEventListener("click", () => {
                    this.openPlatformSurface("studio", "switcher", {entry: "toolbar", objectId: item.id, query: keyword});
                });
                grid.appendChild(button);
            });
            box.appendChild(grid);
        });
    }

    // T-6878/T-6881：片段对象取数唯一入口——60s 会话缓存命中直接返回；
    // 未命中走单飞取数（并发调用共享同一 Promise），代际不匹配时丢弃迟到回包。
    private ensureSnippetObjects(): Promise<Array<{id: string; name: string; type: string; enabled: boolean; lines: number}>> {
        const cached = this.snippetObjectsCache;
        if (cached && Date.now() - cached.at < 60000) return Promise.resolve(cached.items);
        if (this.snippetObjectsInFlight) return this.snippetObjectsInFlight;
        const generation = ++this.snippetObjectsGeneration;
        const request = this.fetchKernelJson("/api/snippet/getSnippet", {type: "all", enabled: 2}, 8000).then((payload) => {
            if (generation !== this.snippetObjectsGeneration) {
                return this.snippetObjectsCache ? this.snippetObjectsCache.items : [];
            }
            const items = projectSnippetObjects(payload, {limit: 6});
            this.snippetObjectsCache = {items, at: Date.now()};
            return items;
        }).catch((error) => {
            logger.warn("snippet objects load fail", error);
            return [] as Array<{id: string; name: string; type: string; enabled: boolean; lines: number}>;
        }).then((items) => {
            this.snippetObjectsInFlight = null;
            return items;
        });
        this.snippetObjectsInFlight = request;
        return request;
    }

    // T-6827 保存的搜索：设置读取、保存（名称默认=查询文本，免去 Electron 不支持的
    // window.prompt；重命名交由后续版本）与应用回放。
    getSavedSearches(): Array<{id: string; name: string; query: string; notebook?: string}> {
        return Array.isArray(this.getSettings().savedSearches) ? this.getSettings().savedSearches : [];
    }

    saveCurrentSearch(query: string, filters: IDocSearchFilters = {}) {
        const cleanQuery = String(query || "").trim();
        if (!cleanQuery) return;
        const entry: {id: string; name: string; query: string; notebook?: string} = {
            id: `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: cleanQuery.slice(0, 40),
            query: cleanQuery.slice(0, 120),
        };
        if (filters && typeof (filters as any).notebook === "string" && (filters as any).notebook) {
            entry.notebook = String((filters as any).notebook).slice(0, 64);
        }
        this.updateSettings({savedSearches: [...this.getSavedSearches(), entry]});
        showMessage(this.i18n.searchSavedDone, MESSAGE_DEFAULT_MS);
    }

    // T-6952：编辑保存的搜索——纯模型归一（长度裁剪/空查询拒绝/notebook 清除），
    // 原 ID 恒不变（悬浮球固定槽与工作台 chips 按 ID 回读新条件）；取消路径不进本函数。
    updateSavedSearch(id: string, patch: {name?: string; query?: string; notebook?: string}): boolean {
        const result = updateSavedSearchEntry(this.getSavedSearches(), id, patch);
        if (!result.ok) {
            showMessage(this.i18n.searchSavedUpdateFailed, MESSAGE_DEFAULT_MS, "error");
            return false;
        }
        this.updateSettings({savedSearches: result.list});
        return true;
    }

    applySavedSearch(scrollElement: HTMLElement, saved: {id?: string; name?: string; query: string; notebook?: string}, onClose: IOverlayClose) {
        // 输入框在顶栏（.sw__toolbar），是滚动容器的兄弟节点——必须从对话框根查找
        const root = scrollElement.closest(".speed-switch") as HTMLElement | null;
        const searchInput = (root || scrollElement.ownerDocument).querySelector<HTMLInputElement>(".sw__search");
        if (!searchInput) return;
        applySavedSearchFilters.call(this, scrollElement, searchInput, saved, onClose);
    }

    private recordRecentSearchQuery(query: string) {
        const clean = (query || "").trim();
        if (!clean || clean.length < 2) return;
        this.recentSearchQueries = [clean, ...this.recentSearchQueries.filter((q) => q !== clean)].slice(0, 5);
    }

    private copyToClipboard(text: string) {
        if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage(this.i18n.snippetCopied || "已复制到剪贴板");
            }).catch((err) => {
                logger.warn("clipboard write fail", err);
                showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
            });
        } else {
            showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
        }
    }

    private persistRelatedSwr(): void {
        this.data[RELATED_SWR_KEY] = buildRelatedSwrStore([...this.relatedSwrStore.values()]);
        this.saveDataDebounced(RELATED_SWR_KEY);
    }

    private async fillRelatedContent(box: HTMLElement, rootId: string, onClose: IOverlayClose): Promise<void> {
        const requestGeneration = beginRelatedContentRequest(this.relatedContentRequestGenerations, rootId);
        const isCurrentRequest = () => isRelatedContentRequestCurrent(this.relatedContentRequestGenerations, rootId, requestGeneration);
        const finishRequest = () => finishRelatedContentRequest(this.relatedContentRequestGenerations, rootId, requestGeneration);
        const now = Date.now();
        const cached = this.relatedContentCache.get(rootId);
        let projection = cached && isRelatedCacheHit(cached, rootId, now) ? cached.projection : null;
        if (!projection) {
            // T-6840 SWR：持久层命中先显"缓存"标注的投影（不管 60s TTL），
            // 后台刷新照常进行——数据到达后整行替换为新鲜内容。
            const persisted = this.relatedSwrStore.get(rootId);
            if (persisted) {
                this.renderRelatedRow(box, persisted.projection, onClose, {cached: true});
            }
            // k/mk 为契约必传字段（可为空串）；块引索引在文档创建后有秒级延迟，
            // 首查为空时有界轮询（2.5s×5 次，共约 12.5s），期间面板被移除即放弃。
            const attempt = async (delayMs: number, retried: number): Promise<void> => {
                if (delayMs) {
                    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
                    // 仅重试路径提前判连：首次调用时工作台尚未插入 DOM（同步执行段）
                    if (!box.isConnected || this.isUnloading || !isCurrentRequest()) {
                        finishRequest();
                        return;
                    }
                }
                let payload;
                try {
                    payload = await this.fetchKernelJson("/api/ref/getBacklink2", {id: rootId, k: "", mk: "", includeMentions: true});
                } catch {
                    if (!persisted && box.isConnected && !this.isUnloading && isCurrentRequest()) box.remove();
                    finishRequest();
                    return;
                }
                if (!box.isConnected || this.isUnloading || !isCurrentRequest()) {
                    finishRequest();
                    return;
                }
                projection = payload ? projectRelatedContent(payload.data) : null;
                if (!projection || projection.items.length === 0) {
                    if (retried < 5) {
                        // 审查轮 P-E：首轮为空且尚无缓存内容时才把骨架换成"暂无关联"
                        // 弱提示（继续轮询），避免块引索引延迟期间 ~12s 的纯 spinner 观感
                        if (retried === 0 && !persisted) {
                            const skeleton = box.firstElementChild;
                            if (skeleton?.classList.contains("sw__workbench-related--loading")) {
                                skeleton.classList.remove("sw__workbench-related--loading");
                                skeleton.textContent = this.i18n.workbenchRelatedEmpty;
                            }
                        }
                        return void attempt(2500, retried + 1) as Promise<void>;
                    }
                    // 终态：重试耗尽仍无数据 → 已有缓存内容时保留（SWR 语义），
                    // 否则移除空占位框，不留空白
                    if (isCurrentRequest()) {
                        if (!persisted && box.dataset.swRelatedRendered !== "1") {
                            box.remove();
                        }
                    }
                    finishRequest();
                    return;
                }
                const storedAt = Date.now();
                this.relatedContentCache.delete(rootId);
                this.relatedContentCache.set(rootId, {rootId, at: storedAt, projection});
                while (this.relatedContentCache.size > 8) {
                    const oldest = [...this.relatedContentCache.values()].sort((left, right) => left.at - right.at)[0];
                    if (!oldest) break;
                    this.relatedContentCache.delete(oldest.rootId);
                }
                const nextRelatedSwr = mergeRelatedSwrEntry([...this.relatedSwrStore.values()], {rootId, at: storedAt, projection});
                this.relatedSwrStore = new Map(nextRelatedSwr.entries.map((entry) => [entry.rootId, entry]));
                this.persistRelatedSwr();
                this.renderRelatedRow(box, projection, onClose);
                finishRequest();
            };
            return void attempt(0, 0);
        }
        this.renderRelatedRow(box, projection, onClose);
        finishRequest();
    }

    private renderRelatedRow(box: HTMLElement, projection: {items: Array<{id: string; source: string; title: string; hPath: string}>; counts: {backlinks: number; mentions: number; shown: number}; truncated: boolean}, onClose: IOverlayClose, options: {cached?: boolean} = {}): void {
        if (!box.isConnected || projection.items.length === 0) return;
        box.textContent = "";
        // T-6840：SWR 命中渲染过的行带标记——后台刷新失败时不被终态清理误删
        box.dataset.swRelatedRendered = "1";
        const rowLabel = document.createElement("div");
        rowLabel.className = "sw__workbench-row-label";
        const total = projection.counts.backlinks + projection.counts.mentions;
        // T-6840：持久层命中（stale-while-revalidate 的 stale 半程）标注"缓存"
        const cachedSuffix = options.cached ? ` · ${this.i18n.workbenchRelatedCached}` : "";
        rowLabel.textContent = (projection.truncated
            ? `${this.i18n.workbenchRelated} (${projection.counts.shown}/${total})`
            : this.i18n.workbenchRelated) + cachedSuffix;
        box.appendChild(rowLabel);
        const row = document.createElement("div");
        row.className = "sw__workbench-row";
        projection.items.forEach((item) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "sw__workbench-chip";
            chip.textContent = (item.source === "mention" ? "∼ " : "") + item.title;
            chip.title = item.hPath || item.title;
            chip.addEventListener("click", () => {
                onClose();
                void openDocSearchResult.call(this, item.id, null);
            });
            row.appendChild(chip);
        });
        box.appendChild(row);
    }

    // T-6804/T-6807：拉取一个标签智能分组的条目并以只读列表呈现
    private openTagSmartGroupEntries(group: {name: string; tag: string}) {
        const query = buildTagSmartGroupQuery(group, {nowMs: Date.now()});
        if (!query) return;
        void this.fetchKernelJson("/api/query/sql", query).then((json) => {
            const entries = projectTagSmartGroupEntries(json?.data);
            const list = document.createElement("div");
            list.className = "sw__workbench-entries";
            entries.forEach((entry) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "sw__doc-item";
                const copy = document.createElement("span");
                copy.className = "sw__doc-copy";
                const title = document.createElement("span");
                title.className = "sw__doc-title";
                title.textContent = entry.title;
                copy.appendChild(title);
                item.appendChild(copy);
                item.addEventListener("click", () => {
                    if (this.isMobile) void this.mobileOpenDoc(entry.rootId);
                    else void this.bridge.openTab({app: this.app, doc: {id: entry.rootId}});
                });
                list.appendChild(item);
            });
            if (!entries.length) {
                const empty = document.createElement("p");
                empty.className = "sw-settings__hint";
                empty.textContent = this.i18n.favSmartGroupEmpty;
                list.appendChild(empty);
            }
            this.openHostListDialog(`${group.name} · #${group.tag}`, list);
        });
    }

    private openHostListDialog(title: string, content: HTMLElement) {
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            title,
            content: '<div class="speed-switch sw__host-list"></div>',
            width: this.isMobile ? "min(440px, 92vw)" : "min(420px, 92vw)",
            height: this.isMobile ? "min(420px, 68vh)" : "360px",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, title, "", "iconList");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());
        const root = dialog.element.querySelector<HTMLElement>(".sw__host-list");
        if (!root) {
            dialog.destroy();
            return;
        }
        root.appendChild(content);
        root.addEventListener("click", (e) => {
            if ((e.target as HTMLElement)?.closest?.(".sw__doc-item, button, a")) {
                dialog.destroy();
            }
        });
    }
}
