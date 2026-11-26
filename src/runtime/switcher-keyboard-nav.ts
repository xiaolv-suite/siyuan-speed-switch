import {getAllTabs, getActiveTab, openTab} from "siyuan";
import {logger} from "../logger";
import {capMru} from "../util";
import {computeScrollRatio, planScrollRestore} from "../recent-closed";
import {activateDocResultItem, openDocSearchResult, previewTabOrDoc} from "../doc-search-ui";
import {MESSAGE_DEFAULT_MS, MRU_MAX, BLOCK_ID_RE, MRU_KEY} from "../constants";
import {getSiyuan} from "../types";
import {type Tab, type IOverlayClose, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface SwitcherKeyboardNavRuntime extends Omit<ISpeedSwitchHost, "bindKeydown" | "activateDocItemByDigit" | "moveDocItemFocus" | "activateCardByElement" | "cycleSearchChip" | "pickCardByPosition" | "focusCard" | "scrollIntoView" | "centerCardInView" | "activateTab" | "activeScrollElement" | "captureDocScrollFromElement" | "captureActiveDocScroll" | "applyDocScrollAfterOpen" | "captureJumpOrigin" | "jumpBack" | "jumpForward"> {}
export class SwitcherKeyboardNavRuntime {
    // 方向键移动卡片，Tab 保留原生控件顺序，Enter 切换，Esc 关闭。
    private bindKeydown(scrollElement: HTMLElement, closeOverlay: IOverlayClose) {
        scrollElement.addEventListener("keydown", (event) => {
            const target = event.target as HTMLElement;
            const key = event.key;
            if (event.isComposing || event.keyCode === 229) {
                event.stopPropagation();
                return;
            }
            // T-7356: Ctrl+Shift+T / Cmd+Shift+T 一键撤销关闭页签并恢复
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && key.toLowerCase() === "t") {
                event.preventDefault();
                event.stopPropagation();
                this.undoLastClosedTab(closeOverlay);
                return;
            }
            if (target.closest("input, select, textarea, [contenteditable]:not([contenteditable='false']), .sw__doc-preview-body")) return;
            // 修饰键路径先于普通方向和空卡片分支；输入控件保留原生光标移动。
            if ((key === "ArrowLeft" || key === "ArrowRight") && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
                if (scrollElement.querySelector(".sw__search-chips")) {
                    event.preventDefault();
                    this.cycleSearchChip(scrollElement, key === "ArrowRight" ? 1 : -1);
                }
                return;
            }
            if (key === "Tab") return;
            if (target.closest("button, input, select, textarea, .sw__doc-preview-body")) {
                // T-6837/T-6838：焦点经 Tab 落在文档结果行（button）时数字直达与
                // ↑/↓ 行导航仍须可用；其余控件（输入框/下拉等）照旧让路，不劫持按键
                const plain = !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
                const navKey = plain && (/^[1-9]$/.test(key) || key === "ArrowDown" || key === "ArrowUp");
                if (!target.closest(".sw__doc-item") || !navKey) {
                    return;
                }
                // T-6838：结果行 ↑/↓ 移动行焦点（仅全库文档网格内生效；未接管时
                // 不 preventDefault，保留列表原生滚动）
                if (key === "ArrowDown" || key === "ArrowUp") {
                    if (this.moveDocItemFocus(scrollElement, target, key === "ArrowDown" ? 1 : -1)) {
                        event.preventDefault();
                    }
                    return;
                }
            }
            // T-7822：在卡片/滚动区按 Ctrl/Cmd+F 或 / 直接聚焦搜索框；盲打可打印字符（字母、>命令、#标签、@大纲等）直接转入搜索框过滤
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && key.toLowerCase() === "f") {
                const surface = scrollElement.closest<HTMLElement>(".sw-platform-surface") || scrollElement.closest(".speed-switch") || scrollElement.parentElement;
                const searchInput = surface?.querySelector<HTMLInputElement>(".sw__search");
                if (searchInput && searchInput.isConnected) {
                    event.preventDefault();
                    event.stopPropagation();
                    searchInput.focus({preventScroll: true});
                    if (searchInput.value) searchInput.select();
                    return;
                }
            }
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
                const surface = scrollElement.closest<HTMLElement>(".sw-platform-surface") || scrollElement.closest(".speed-switch") || scrollElement.parentElement;
                const searchInput = surface?.querySelector<HTMLInputElement>(".sw__search");
                if (searchInput && searchInput.isConnected) {
                    if (key === "/") {
                        event.preventDefault();
                        searchInput.focus({preventScroll: true});
                        if (searchInput.value) searchInput.select();
                        return;
                    }
                    if (key === "?" || (event.shiftKey && key === "/")) {
                        // T-7839: 按 ? 呼出全表面快捷键 CheatSheet 速查看板 (CAND-11)
                        event.preventDefault();
                        this.openPlatformGuide("switcher");
                        return;
                    }
                    const nextVal = key === "Backspace" && searchInput.value.length > 0
                        ? Array.from(searchInput.value).slice(0, -1).join("")
                        : (key.length === 1 && key !== " " && !/^[1-9]$/.test(key) ? searchInput.value + key : null);
                    if (nextVal !== null) {
                        event.preventDefault();
                        searchInput.focus({preventScroll: true});
                        searchInput.value = nextVal;
                        try { searchInput.setSelectionRange(nextVal.length, nextVal.length); } catch (_) { /* ignore */ }
                        const Evt = searchInput.ownerDocument.defaultView?.Event || Event;
                        searchInput.dispatchEvent(new Evt("input", {bubbles: true}));
                        return;
                    }
                }
            }
            const cards = Array.from(scrollElement.querySelectorAll<HTMLElement>(".sw__card"))
                .filter((card) => !card.closest(".fn__none"));
            if (cards.length === 0) {
                // T-6837：搜索态页签卡隐藏时，数字直达转投文档结果行（不静默丢失）
                if (/^[1-9]$/.test(key) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
                    event.preventDefault();
                    this.activateDocItemByDigit(scrollElement, key, closeOverlay);
                }
                return;
            }
            const current = cards.findIndex((el) => el.classList.contains("sw__focused"));
            const focusIndex = current >= 0 ? current : 0;

            // T-7409: 卡片直达快捷键 ⌘D 收藏/取消、⌘P 置顶/取消、⌘W 关闭当前页签（与动作画板保持 100% 对齐）
            const ctrlOrMeta = Boolean(event.ctrlKey || event.metaKey);
            if (ctrlOrMeta && !event.shiftKey && !event.altKey) {
                const lowerKey = key.toLowerCase();
                const targetCard = cards[focusIndex];
                if (targetCard) {
                    const tab = this.cardTabs.get(targetCard);
                    const handlers = this.cardMenuHandlers.get(targetCard);
                    if (lowerKey === "d" && tab) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.handleToggleFav(tab, targetCard);
                        return;
                    }
                    if (lowerKey === "p" && tab) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.handleTogglePin(tab, targetCard);
                        return;
                    }
                    if (lowerKey === "w" && tab && handlers?.onCloseTab) {
                        event.preventDefault();
                        event.stopPropagation();
                        handlers.onCloseTab(tab, targetCard);
                        return;
                    }
                }
            }

            let colCount = 1;
            const plain = !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
            if (plain && (key === "ArrowDown" || key === "ArrowUp")) {
                const grid = scrollElement.querySelector(".sw__grid") as HTMLElement | null;
                if (grid) {
                    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").filter((c) => c && c !== "none");
                    if (cols.length > 0) colCount = cols.length;
                }
            }

            // 流式分组下组块宽度不等，方向键按屏幕坐标就近移动。
            const flowNav = scrollElement.classList.contains("sw--grouped-flow");
            const flowNeighbor = (dir: string): number => {
                const neighbor = this.pickCardByPosition(cards, cards[focusIndex], dir);
                return neighbor ? cards.indexOf(neighbor) : -1;
            };

            let next = -1;
            if (key === "ArrowRight" && plain) {
                event.preventDefault();
                next = key === "ArrowRight" && flowNav && flowNeighbor(key) >= 0
                    ? flowNeighbor(key)
                    : (focusIndex + 1) % cards.length;
            } else if (key === "ArrowLeft" && plain) {
                event.preventDefault();
                next = key === "ArrowLeft" && flowNav && flowNeighbor(key) >= 0
                    ? flowNeighbor(key)
                    : (focusIndex - 1 + cards.length) % cards.length;
            } else if (key === "ArrowDown" && plain) {
                event.preventDefault();
                if (flowNav && flowNeighbor(key) >= 0) {
                    next = flowNeighbor(key);
                } else if (focusIndex + colCount < cards.length) {
                    next = focusIndex + colCount;
                } else {
                    const firstDoc = scrollElement.querySelector<HTMLElement>(".sw__doc-grid .sw__doc-item:not(.fn__none)");
                    if (firstDoc && !firstDoc.closest(".fn__none")) {
                        firstDoc.focus();
                        this.scrollIntoView(firstDoc, scrollElement);
                        return;
                    }
                    next = cards.length - 1;
                }
            } else if (key === "ArrowUp" && plain) {
                event.preventDefault();
                if (flowNav && flowNeighbor(key) >= 0) {
                    next = flowNeighbor(key);
                } else if (focusIndex - colCount < 0) {
                    const surface = scrollElement.closest<HTMLElement>(".sw-platform-surface") || scrollElement.closest(".speed-switch") || scrollElement.parentElement;
                    const searchInput = surface?.querySelector<HTMLInputElement>(".sw__search");
                    if (searchInput && searchInput.isConnected) {
                        searchInput.focus();
                        return;
                    }
                    next = 0;
                } else {
                    next = focusIndex - colCount;
                }
            } else if (key === "Home" && plain) {
                // T-7574: Home 快捷跳至卡片列表首项
                event.preventDefault();
                next = 0;
            } else if (key === "End" && plain) {
                // T-7574: End 快捷跳至卡片列表末项
                event.preventDefault();
                next = cards.length - 1;
            } else if (key === "PageUp" && plain) {
                // T-7574: PageUp 向上跨步导航（跨 1 个视口步长）
                event.preventDefault();
                const step = Math.max(colCount * 3, 5);
                next = Math.max(0, focusIndex - step);
            } else if (key === "PageDown" && plain) {
                // T-7574: PageDown 向下跨步导航（跨 1 个视口步长）
                event.preventDefault();
                const step = Math.max(colCount * 3, 5);
                next = Math.min(cards.length - 1, focusIndex + step);
            } else if ((key === "Enter" || key === " " || key === "Spacebar") && plain) {
                // T-7574: Enter 与 Space 均可激活卡片（WAI-ARIA 标准复合组件行为）
                event.preventDefault();
                this.activateCardByElement(cards[focusIndex], closeOverlay);
                return;
            } else if (/^[1-9]$/.test(key) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
                // T-6820 数字直达：1-9 打开第 n 个可见卡片（与 R3 面板数字快选同构；
                // 输入框在滚动容器外，输入数字不会误触此分支）
                event.preventDefault();
                // T-6837：查询词非空且结果行可见时优先直达文档结果（搜索态心智）
                if (!this.activateDocItemByDigit(scrollElement, key, closeOverlay)) {
                    this.activateCardByElement(cards[Number(key) - 1], closeOverlay);
                }
                return;
            } else if (key === "ContextMenu" || (key === "F10" && event.shiftKey)) {
                // T-6461 动作面板键：键盘呼出聚焦卡片的动作菜单（Shift+F10 / ContextMenu
                // 为标准上下文菜单键，不与输入框快捷键冲突；Raycast Action Panel 心智）
                event.preventDefault();
                const target = cards[focusIndex];
                if (!target) return;
                const tab = this.cardTabs.get(target);
                const menuHandlers = this.cardMenuHandlers.get(target);
                if (tab && menuHandlers) {
                    const rect = target.getBoundingClientRect();
                    this.openCardMenu(tab, target, menuHandlers, rect.left + 16, rect.top + 16);
                }
                return;
            } else if (key === "Escape") {
                event.stopPropagation();
                closeOverlay();
                return;
            }

            if (next >= 0 && cards[next]) {
                this.focusCard(cards[next], true);
                this.scrollIntoView(cards[next], scrollElement);
            }
        });
        // T-7007：焦点进入卡片（Tab 进入、附属动作按钮聚焦、方向键 focus()）时
        // 同步视觉焦点与预览，保证 DOM 焦点与 sw__focused 单一真源。
        scrollElement.addEventListener("focusin", (event) => {
            const target = event.target as HTMLElement | null;
            const card = target?.closest<HTMLElement>(".sw__card");
            if (card && scrollElement.contains(card)) {
                this.focusCard(card);
            }
        });
    }

    // T-6837 键序直达第二片：数字直达文档结果行——查询词非空且第 n 条可见时
    // 优先于页签卡（搜索态用户心智在结果行）；未接管返回 false 回退卡片直达
    private activateDocItemByDigit(scrollElement: HTMLElement, key: string, closeOverlay: IOverlayClose): boolean {
        const queryKey = String(scrollElement.dataset.swDocSearchQuery || "").trim().toLowerCase();
        if (!queryKey) return false;
        const items = Array.from(scrollElement.querySelectorAll<HTMLElement>(".sw__doc-grid .sw__doc-item"))
            .filter((element) => !element.closest(".fn__none"));
        const item = items[Number(key) - 1];
        if (!item) return false;
        activateDocResultItem.call(this, item, closeOverlay, {query: queryKey});
        return true;
    }

    // T-6838 结果行 ↑/↓ 行导航：在全库文档网格的可见行间移动焦点并滚动跟随；
    // 焦点行不在网格内（工作台/统一分区行）返回 false，按键交还原生滚动
    private moveDocItemFocus(scrollElement: HTMLElement, current: HTMLElement, delta: number): boolean {
        const items = Array.from(scrollElement.querySelectorAll<HTMLElement>(".sw__doc-grid .sw__doc-item"))
            .filter((element) => !element.closest(".fn__none"));
        const at = items.indexOf(current);
        if (at < 0) return false;
        const targetIndex = at + delta;
        if (targetIndex < 0) {
            const cards = Array.from(scrollElement.querySelectorAll<HTMLElement>(".sw__card"))
                .filter((card) => !card.closest(".fn__none"));
            if (cards.length > 0) {
                const lastCard = cards[cards.length - 1];
                this.focusCard(lastCard, true);
                this.scrollIntoView(lastCard, scrollElement);
                return true;
            }
            const surface = scrollElement.closest<HTMLElement>(".sw-platform-surface") || scrollElement.parentElement;
            const searchInput = surface?.querySelector<HTMLInputElement>(".sw__search");
            if (searchInput) {
                searchInput.focus();
                return true;
            }
            return false;
        }
        const next = items[Math.min(items.length - 1, targetIndex)];
        if (next) {
            next.focus();
            this.scrollIntoView(next, scrollElement);
        }
        return true;
    }

    // 流式布局下的方向键导航：按屏幕坐标就近移动（组块宽度不等，固定列数换算会跳错位）
    // T-6820：按元素激活页签卡（Enter 与数字直达共用；卡上无对应页签时静默）
    private activateCardByElement(card: HTMLElement | undefined, closeOverlay: IOverlayClose) {
        if (!card) return;
        const tabId = card.dataset.tabId;
        if (!tabId) return;
        const tab = this.cardTabs.get(card) || (this.isMobile
            ? this.getMobileTabs().find((item) => item.id === tabId)
            : this.bridge.getAllTabs().find((item) => item.id === tabId));
        if (tab) {
            this.activateTab(tab, closeOverlay);
        }
    }

    // T-6820 结果类型快捷键：Ctrl+←/→ 循环过滤条（all→tabs→unified→docs）。
    // 空查询时无过滤条，快捷键静默不生效。
    private cycleSearchChip(scrollElement: HTMLElement, delta: number) {
        const order = ["all", "tabs", "unified", "docs"] as const;
        const row = scrollElement.querySelector<HTMLElement>(".sw__search-chips");
        if (!row) return;
        const current = this.docSearchState.chipFilters.get(scrollElement) || "all";
        const index = order.indexOf(current as typeof order[number]);
        const next = order[(index + delta + order.length) % order.length];
        this.docSearchState.chipFilters.set(scrollElement, next);
        scrollElement.dataset.swChip = next;
        row.querySelectorAll<HTMLElement>(".sw__search-chip").forEach((el) => {
            const active = el.dataset.chip === next;
            el.classList.toggle("is-active", active);
            // T-7042：键盘路径与点击路径同语义——chips 是按钮组（aria-pressed），
            // aria-selected 是 tablist 专属属性，普通按钮上读屏会忽略
            el.setAttribute("aria-pressed", String(active));
        });
    }

    private pickCardByPosition(cards: HTMLElement[], current: HTMLElement, key: string): HTMLElement | null {
        const base = current.getBoundingClientRect();
        let best: HTMLElement | null = null;
        let bestScore = Number.POSITIVE_INFINITY;
        cards.forEach((card) => {
            if (card === current) return;
            const rect = card.getBoundingClientRect();
            const dx = rect.left - base.left;
            const dy = rect.top - base.top;
            let primary = 0;
            let cross = 0;
            if (key === "ArrowRight") {
                primary = dx; cross = Math.abs(dy);
                if (primary <= 1) return;
            } else if (key === "ArrowLeft") {
                primary = -dx; cross = Math.abs(dy);
                if (primary <= 1) return;
            } else if (key === "ArrowDown") {
                primary = dy; cross = Math.abs(dx);
                if (primary <= 1) return;
            } else if (key === "ArrowUp") {
                primary = -dy; cross = Math.abs(dx);
                if (primary <= 1) return;
            } else {
                return;
            }
            const score = Math.abs(primary) + cross * 2.5;
            if (score < bestScore) {
                bestScore = score;
                best = card;
            }
        });
        return best;
    }

    private focusCard(card: HTMLElement | undefined | null, domFocus = false) {
        if (!card) {
            return;
        }
        // T-7007：键盘导航路径把 DOM 焦点移到卡片本体（Tab 顺序与读屏跟随）；
        // mouseenter 悬浮聚焦保持纯视觉，不抢 DOM 焦点。
        if (domFocus && card.isConnected) {
            try {
                card.focus({preventScroll: true});
            } catch (_) {
                card.focus();
            }
        }
        if (card.classList.contains("sw__focused")) {
            if (domFocus) {
                const scrollElement = card.closest<HTMLElement>(".sw__scroll");
                if (scrollElement?.querySelector(".sw__tab-preview")) {
                    previewTabOrDoc.call(this, scrollElement, card, true);
                }
            }
            return;
        }
        const container = card.closest(".sw__scroll") || card.parentElement;
        if (container) {
            container.querySelectorAll<HTMLElement>(".sw__card.sw__focused, .sw__card[aria-current='true']").forEach((el) => {
                el.classList.remove("sw__focused");
                el.removeAttribute("aria-current");
            });
        }
        card.classList.add("sw__focused");
        card.setAttribute("aria-current", "true");
        const scrollElement = card.closest<HTMLElement>(".sw__scroll");
        if (scrollElement) {
            if (domFocus) {
                this.centerCardInView(card, scrollElement);
            }
            if (scrollElement.querySelector(".sw__tab-preview")) {
                previewTabOrDoc.call(this, scrollElement, card, domFocus);
            }
        }
    }

    private scrollIntoView(card: HTMLElement, container: HTMLElement) {
        const cardRect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const cushion = 8;
        if (cardRect.top < containerRect.top + cushion) {
            container.scrollTop -= (containerRect.top + cushion - cardRect.top);
        } else if (cardRect.bottom > containerRect.bottom - cushion) {
            container.scrollTop += (cardRect.bottom - (containerRect.bottom - cushion));
        }
    }

    private centerCardInView(card: HTMLElement, container: HTMLElement) {
        const cardRect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (containerRect.height > 0) {
            const cushion = 24;
            const isOutOfView = cardRect.top < containerRect.top + cushion || cardRect.bottom > containerRect.bottom - cushion;
            if (isOutOfView) {
                const targetScrollTop = container.scrollTop + (cardRect.top + cardRect.height / 2) - (containerRect.top + containerRect.height / 2);
                container.scrollTop = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - container.clientHeight));
            }
        } else {
            this.scrollIntoView(card, container);
        }
    }

    // 切换到目标页签；弹窗模式随后销毁弹窗，侧边栏模式随后刷新列表
    private activateTab(tab: Tab, onClose?: IOverlayClose) {
        // 记录 MRU：按 pinKey（文档页签为 rootID）记录，手机端与桌面端使用同一份 MRU 数据，
        // 通过插件数据同步后两端「最近使用」保持一致
        const key = this.pinKeyOf(tab);
        const mru = this.getMru();
        const list = mru.filter((id) => id !== key);
        list.unshift(key);
        // 上限收敛：超出 MRU_MAX 从尾部丢弃最旧条目，防止插件数据随使用无限膨胀
        this.data[MRU_KEY] = capMru(list, MRU_MAX);
        this.saveDataDebounced(MRU_KEY);
        void this.recordOpenHistory(tab).catch((err) => {
            logger.warn("recordOpenHistory in activateTab fail", err);
        });

        if (this.isMobile) {
            // 手机端：MobileTabs.switchTo 切换页签
            try {
                getSiyuan()?.mobile?.tabs?.switchTo?.(tab.id);
            } catch (e) {
                logger.warn("mobile switch tab fail", e);
            }
            onClose?.();
            return;
        }

        // 等价于点击该页签：内部会切到目标页签，并通过 setPanelFocus 激活其所在窗口（支持分栏）
        try {
            tab.parent.switchTab(tab.headElement, true);
            // 偶发场景下 showHeading 不是必暴露的方法，思源历史版本不一定存在，做能力检测
            const parentWithHeading = tab.parent as unknown as { showHeading?: () => void };
            if (typeof parentWithHeading.showHeading === "function") {
                parentWithHeading.showHeading();
            }
        } catch (e) {
            logger.warn("switch tab fail", e);
        }
        onClose?.();
    }

    private activeScrollElement(): HTMLElement | null {
        const editor = this.resolveActiveHostEditor() as {protyle?: {element?: HTMLElement}} | null;
        const content = editor?.protyle?.element?.querySelector?.<HTMLElement>(".protyle-content")
            ?? document.querySelector<HTMLElement>(".layout__wnd--active .protyle-content");
        return content;
    }

    setSessionMark(): void {
        const scroller = this.activeScrollElement();
        const rootId = this.rootIdOf(this.getActiveTab());
        if (!scroller || !rootId) {
            showMessage(this.i18n.sessionMarkNoDoc, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const ratio = computeScrollRatio(scroller.scrollTop, scroller.scrollHeight, scroller.clientHeight);
        if (this.sessionMarks.size >= 12) {
            const oldest = this.sessionMarks.keys().next().value;
            if (oldest !== undefined) this.sessionMarks.delete(oldest);
        }
        this.sessionMarks.set(rootId, ratio);
        showMessage(this.i18n.sessionMarkSet);
    }

    async jumpToSessionMark(): Promise<void> {
        if (this.sessionMarks.size === 0) {
            showMessage(this.i18n.sessionMarkNone, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const entries = [...this.sessionMarks.entries()];
        const [rootId, ratio] = entries[this.sessionMarks.size - 1]; // 最近一次标记
        // 先确保目标文档处于打开并聚焦状态，再按比例回卷
        const alreadyActive = this.rootIdOf(this.getActiveTab()) === rootId;
        if (!alreadyActive) {
            await openDocSearchResult.call(this, rootId, null);
        }
        // 有界等待渲染稳定后按比例回卷（复用 T-6801 口径）
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((resolve) => window.setTimeout(resolve, 50));
            const scroller = this.activeScrollElement();
            if (!scroller) continue;
            const target = planScrollRestore(
                {scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight},
                ratio,
            );
            if (target !== null) {
                scroller.scrollTop = target.top;
                break;
            }
        }
        showMessage(this.i18n.sessionMarkJumped);
    }

    private captureDocScrollFromElement(rootId: string, element: HTMLElement) {
        if (this.getSettings().rememberScrollPosition === false) {
            this.docScrollMemory.clear();
            return;
        }
        if (!BLOCK_ID_RE.test(rootId)) return;
        const container = element.querySelector<HTMLElement>(".protyle-content");
        if (!container) return;
        const ratio = computeScrollRatio(container.scrollTop, container.scrollHeight, container.clientHeight);
        if (ratio <= 0) {
            this.docScrollMemory.delete(rootId);
            return;
        }
        this.docScrollMemory.set(rootId, ratio);
        while (this.docScrollMemory.size > 50) {
            const oldest = this.docScrollMemory.keys().next().value;
            if (oldest === undefined) break;
            this.docScrollMemory.delete(oldest);
        }
    }

    private captureActiveDocScroll() {
        if (this.getSettings().rememberScrollPosition === false) {
            this.docScrollMemory.clear();
            return;
        }
        const editor = this.resolveActiveHostEditor();
        const element = (editor?.protyle as unknown as {element?: HTMLElement} | undefined)?.element;
        if (!element) return;
        const rootId = (editor!.protyle as unknown as {block?: {parentID?: string}}).block?.parentID || "";
        this.captureDocScrollFromElement(rootId, element);
    }

    private applyDocScrollAfterOpen(rootId: string) {
        if (this.getSettings().rememberScrollPosition === false) {
            this.docScrollMemory.clear();
            return;
        }
        const ratio = this.docScrollMemory.get(rootId);
        if (typeof ratio !== "number" || !Number.isFinite(ratio)) return;
        let attempts = 0;
        const tick = () => {
            const editor = this.resolveActiveHostEditor();
            const element = (editor?.protyle as unknown as {element?: HTMLElement} | undefined)?.element;
            const container = element?.querySelector<HTMLElement>(".protyle-content");
            if (container && container.scrollHeight > container.clientHeight) {
                const plan = planScrollRestore(
                    {scrollTop: container.scrollTop, scrollHeight: container.scrollHeight, clientHeight: container.clientHeight},
                    ratio,
                );
                if (plan) container.scrollTop = plan.top;
                return;
            }
            if (attempts++ < 30) window.setTimeout(tick, 50);
        };
        tick();
    }

    private captureJumpOrigin(): void {
        if (this.suppressJumpCapture) return;
        const editor = this.resolveActiveHostEditor();
        const rootId = (editor?.protyle as unknown as {block?: {parentID?: string}})?.block?.parentID || "";
        if (!rootId || !BLOCK_ID_RE.test(rootId)) return;
        this.jumpBackStack.push({rootId});
        if (this.jumpBackStack.length > 50) this.jumpBackStack.shift();
        this.jumpForwardStack = [];
    }

    private async jumpBack(): Promise<boolean> {
        const target = this.jumpBackStack.pop();
        if (!target) return false;
        const editor = this.resolveActiveHostEditor();
        const currentRootId = (editor?.protyle as unknown as {block?: {parentID?: string}})?.block?.parentID || "";
        if (currentRootId && BLOCK_ID_RE.test(currentRootId)) {
            this.jumpForwardStack.push({rootId: currentRootId});
            if (this.jumpForwardStack.length > 50) this.jumpForwardStack.shift();
        }
        this.suppressJumpCapture = true;
        try {
            if (this.isMobile) await this.mobileOpenDoc(target.rootId);
            else await this.bridge.openTab({app: this.app, doc: {id: target.rootId}});
        } finally {
            this.suppressJumpCapture = false;
        }
        return true;
    }

    private async jumpForward(): Promise<boolean> {
        const target = this.jumpForwardStack.pop();
        if (!target) return false;
        const editor = this.resolveActiveHostEditor();
        const currentRootId = (editor?.protyle as unknown as {block?: {parentID?: string}})?.block?.parentID || "";
        if (currentRootId && BLOCK_ID_RE.test(currentRootId)) {
            this.jumpBackStack.push({rootId: currentRootId});
            if (this.jumpBackStack.length > 50) this.jumpBackStack.shift();
        }
        this.suppressJumpCapture = true;
        try {
            if (this.isMobile) await this.mobileOpenDoc(target.rootId);
            else await this.bridge.openTab({app: this.app, doc: {id: target.rootId}});
        } finally {
            this.suppressJumpCapture = false;
        }
        return true;
    }

    // T-6830 打开策略：按 rootId 找已打开页签；桌面/移动共用 rootIdOf 归一
    findOpenTabByRootId(rootId: string): Tab | null {
        const target = String(rootId || "");
        if (!target) return null;
        const tabs = this.currentTabs();
        return tabs.find((tab) => this.rootIdOf(tab) === target) || null;
    }

    reuseOpenTabsEnabled(): boolean {
        return this.getSettings().reuseOpenTabs === true;
    }

    activateTabForReuse(rootId: string, onClose?: IOverlayClose): boolean {
        const existing = this.findOpenTabByRootId(rootId);
        if (!existing) return false;
        this.activateTab(existing, onClose);
        return true;
    }
}
