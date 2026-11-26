import {Dialog, openTab} from "siyuan";
import {buildMobileSwitcherHtml as buildMobileSwitcherHtmlSurface} from "../surfaces";
import {logger} from "../logger";
import {groupFavoritesByGroup} from "../util";
import {hasDocSearchFilter} from "../doc-search-ui";
import {openMobileSwitcherDialog, renderMobileList, openMobileGroupActions, registerMobileSheetCloser} from "../mobile-switcher-ui";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap} from "../platform-dom";
import {openDocumentOnMobile} from "../document-actions";
import {FAB_HIDE_DELAY_MS, MOBILE_COLUMNS_DOUBLE, MOBILE_COLUMNS_AUTO, BLOCK_ID_RE} from "../constants";
import {getSiyuan} from "../types";
import {type ITabGroupRenderCtx, type Tab, type PlatformSurface, type PlatformSurfaceContext, type SortBy, type IOverlayClose, type ISwSettings, type IGroupedTab, type IFavoriteItem, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface MobileSwitcherRuntime extends Omit<ISpeedSwitchHost, "getMobileTabs" | "getMobileActiveTabId" | "mobileOpenDoc" | "showMobileSwitcher" | "renderMobileSwitcherList" | "buildMobileGroupGrid" | "renderMobileCardsInGroup" | "showMobileFavSheet" | "buildMobileFavSheetHtml" | "renderMobileFavSheetBody" | "appendMobileFavSheetSection" | "buildMobileFavSheetList" | "closeMobileFavSheetOverlay" | "bindMobileFavSheetBackdropClose" | "restoreMobileSwitcherAboveHostPanels" | "hideMobileKeyboard"> {}
export class MobileSwitcherRuntime {
    private getMobileTabs(): Tab[] {
        const state = getSiyuan()?.mobile?.tabs?.state;
        if (!state?.tabs) {
            return [];
        }
        return state.tabs
            .filter((t) => t.current?.rootID)
            .map((t) => ({
                id: t.id,                       // MobileTabs 页签 id（switchTo/close 使用）
                title: t.current!.title,
                notebookId: t.current!.notebookID,
                path: t.current!.path,
                // 手机端页签图标可能在 t.icon 或 t.current.icon，优先 t.icon（思源不同版本字段不同）
                icon: (t as unknown as {icon?: string}).icon || t.current!.icon || "",
                // 兼容 rootIdOf()：直接命中 model.editor.block.rootID 分支
                model: {editor: {block: {rootID: t.current!.rootID}}},
            } as unknown as Tab));
    }

    // 手机端当前激活页签 id（无激活时返回 undefined）
    private getMobileActiveTabId(): string | undefined {
        return getSiyuan()?.mobile?.tabs?.state?.activeTabID;
    }

    // 手机端打开文档（思源 plugin API openTab 在移动端是空实现），返回是否成功：
    // 1) 优先 MobileTabs.open(rootID)（思源 3.8+）：必须保持宿主对象调用（抽成裸函数调用会丢 this）
    //    内部 abortController/navigationEpoch 访问直接抛错），await 返回值判断结果而非固定延时轮询；
    //    open 明确返回失败（invalid/cancelled/failed）时不降级——openTab 在移动端是空实现，降级无意义；
    // 2) 仅当 MobileTabs API 不存在（思源 <3.8）才降级到 plugin.openTab 兜底通道
    private async mobileOpenDoc(rootId: string): Promise<boolean> {
        let targetId = rootId;
        const ok = await openDocumentOnMobile({
            rootId: targetId,
            tabs: getSiyuan()?.mobile?.tabs,
            app: this.app,
            openTab,
            logger,
        });
        if (ok) return true;
        if (BLOCK_ID_RE.test(rootId)) {
            try {
                const rowJson = await this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT root_id FROM blocks WHERE id='${rootId.replace(/'/g, "''")}' LIMIT 1`,
                });
                const resolvedRoot = String((rowJson?.data || [])[0]?.root_id || "");
                if (resolvedRoot && resolvedRoot !== rootId) {
                    targetId = resolvedRoot;
                    const retryOk = await openDocumentOnMobile({
                        rootId: targetId,
                        tabs: getSiyuan()?.mobile?.tabs,
                        app: this.app,
                        openTab,
                        logger,
                        onFailure: () => showMessage(this.i18n.openDocFailed),
                    });
                    if (retryOk) return true;
                }
            } catch (_) {}
        }
        showMessage(this.i18n.openDocFailed);
        return false;
    }

    // 手机端切换器：全屏覆盖弹窗，简化工具栏，单列/双列卡片，纯触摸操作。
    // （T-6679：minAppVersion 已抬到 3.8.0，"旧版无 MobileTabs API 需提示升级"的
    // 运行时门成为死代码，随 ADR 0064 首批兼容层简化移除）
    private showMobileSwitcher(focusSearch = false, returnTo: PlatformSurface = "switcher", context?: PlatformSurfaceContext | null) {
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err) => {
                logger.warn("showMobileSwitcher tier2 load fail", err);
            });
        }
        const tabs = this.getMobileTabs();
        openMobileSwitcherDialog.call(this, tabs, focusSearch, returnTo, context);
    }

    // 打开手机端切换器 Dialog：装配顶栏、列表、搜索、FAB 隐藏等
    public createMobileSwitcherDialog(release: {fn: () => void}): Dialog {
        const holder: {dialog: Dialog | null} = {dialog: null};
        const dialog = new Dialog({
            title: this.i18n.dialogSwitcherTitle || "页签切换器",
            content: buildMobileSwitcherHtmlSurface(this.i18n as any),
            width: "100vw",
            height: "100dvh",
            disableAnimation: true,
            destroyCallback: () => {
                if (this.mobileSwitcherDialog === holder.dialog) this.mobileSwitcherDialog = null;
                release.fn();
            },
        });
        holder.dialog = dialog;
        this.mobileSwitcherDialog = dialog;
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.dialogSwitcherTitle || "页签切换器", "", "iconLvSpeedSwitch");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        return dialog;
    }

    // 手机端顶栏按钮：设置 / 日记 + 排序切换（排序切换复用装配期 renderMobileList 与 updatedMap）
    private renderMobileSwitcherList(
        dialog: Dialog,
        scrollElement: HTMLDivElement,
        sortSelect: HTMLSelectElement,
        settings: ISwSettings,
    ) {
        const listOpts = {
            onOverlayClose: () => dialog.destroy(),
            onTabsChanged: () => {
                refreshMobileList();
                const searchInput = dialog.element.querySelector<HTMLInputElement>(".sw__search");
                if (searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, scrollElement))) {
                    this.applySearch(scrollElement, searchInput, () => dialog.destroy());
                }
            },
        };
        let updatedMap: {[rootId: string]: string} = {};
        const refreshMobileList = () => {
            renderMobileList.call(this, scrollElement, this.getMobileTabs(),
                {id: this.getMobileActiveTabId()} as Tab, listOpts, sortSelect.value as SortBy, updatedMap);
        };
        refreshMobileList();
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().then(() => {
                if (dialog.element.isConnected && !this.isUnloading) {
                    refreshMobileList();
                }
            }).catch(() => {});
        }
        // 移动端沿用同一更新时间映射；默认 MRU 且未显示改动标记时跳过首屏 SQL。
        const mergedMap = updatedMap;
        if (settings.sortBy === "updatedDesc" || settings.showCardUpdatedBadge === true) {
            this.loadUpdatedMap(this.getMobileTabs()).then((map) => {
                Object.assign(mergedMap, map);
                if (dialog.element.isConnected && sortSelect.value === "updatedDesc") {
                    refreshMobileList();
                    const searchInput = dialog.element.querySelector<HTMLInputElement>(".sw__search");
                    if (searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, scrollElement))) {
                        this.applySearch(scrollElement, searchInput, () => dialog.destroy());
                    }
                } else if (dialog.element.isConnected && this.getSettings().showCardUpdatedBadge === true) {
                    this.refreshCardUpdatedBadges(scrollElement, mergedMap);
                }
            }).catch((err) => logger.warn("loadUpdatedMap on mobile failed", err));
        }
        return {renderMobileList: refreshMobileList};
    }

    // 手机端渲染页签卡片列表
    private buildMobileGroupGrid(settings: ISwSettings): HTMLElement {
        const grid = document.createElement("div");
        grid.className = "sw__grid sw__mobile-grid";
        if (settings.mobileColumns === MOBILE_COLUMNS_DOUBLE) {
            grid.classList.add("sw__mobile-grid--double");
        } else if (settings.mobileColumns === MOBILE_COLUMNS_AUTO) {
            // auto: portrait=single, landscape=double (handled by CSS media query)
            grid.classList.add("sw__mobile-grid--auto");
        }
        return grid;
    }

    // 手机端分组卡片渲染：委托 acquireGroupCard（mobile=true 附带 sw__mobile-card）；返回 all 列表供缩略图懒渲染
    private renderMobileCardsInGroup(
        grid: HTMLElement,
        ordered: IGroupedTab[],
        ctx: ITabGroupRenderCtx,
    ): IGroupedTab[] {
        const all: IGroupedTab[] = [];
        ordered.forEach((item) => {
            const card = this.acquireGroupCard(item, ctx, true);
            grid.appendChild(card);
            item.card = card;
            all.push(item);
        });
        return all;
    }

    // 手机端收藏底部弹窗；onTabsChanged：组内页签批量开/关后刷新背后的切换器列表
    private showMobileFavSheet(dialog: Dialog, closeOverlay: IOverlayClose, onTabsChanged?: () => void, returnFocus?: HTMLElement | null) {
        const favorites = this.getFavorites();
        const groupNames = this.getFavoriteGroupNames();

        if (!favorites.length && !groupNames.length) {
            // 无任何收藏时给出反馈而非静默无响应
            showMessage(this.i18n.mobileNoFav);
            return;
        }

        // 鏋勫缓搴曢儴寮圭獥
        const overlay = document.createElement("div");
        overlay.className = "sw__mobile-sheet-overlay";
        overlay.innerHTML = this.buildMobileFavSheetHtml();
        document.body.appendChild(overlay);

        const sheet = overlay.querySelector<HTMLElement>(".sw__mobile-sheet");
        const body = overlay.querySelector<HTMLElement>(".sw__mobile-sheet-body");
        if (!sheet || !body) {
            // 骨架异常时不能把空遮罩留在 body 上拖住全屏交互
            overlay.remove();
            return;
        }
        overlay.tabIndex = -1;

        const unregisterFavSheet = registerMobileSheetCloser(() => {
            overlay.dataset.closing = "true";
            overlay.remove();
        });
        const closeSheet = () => {
            unregisterFavSheet();
            this.closeMobileFavSheetOverlay(overlay, sheet, returnFocus);
        };
        // 渲染分组/单列列表 空态
        this.renderMobileFavSheetBody(body, favorites, groupNames, closeOverlay, onTabsChanged, overlay, closeSheet);

        // 动画：下一帧滑入
        this.scheduleAnimationFrame(() => { if (sheet.isConnected) sheet.classList.add("sw__mobile-sheet--open"); });
        // 点击背景关闭
        overlay.querySelector<HTMLButtonElement>(".sw__mobile-sheet-close")?.addEventListener("click", closeSheet);
        overlay.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeSheet();
                return;
            }
            if (event.key === "Home" || event.key === "End") {
                const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
                if (buttons.length > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const target = event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];
                    target?.focus({preventScroll: true});
                    return;
                }
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
                const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
                if (idx >= 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const nextIndex = (idx + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
                    buttons[nextIndex]?.focus({preventScroll: true});
                    return;
                }
            }
            if (event.key === "Tab") {
                const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
                if (buttons.length === 0) return;
                event.preventDefault();
                event.stopPropagation();
                const curIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
                const nextIndex = curIndex < 0 ? (event.shiftKey ? buttons.length - 1 : 0)
                    : (curIndex + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
                buttons[nextIndex]?.focus({preventScroll: true});
            }
        });
        this.bindMobileFavSheetBackdropClose(overlay, sheet, returnFocus, closeSheet);
        overlay.querySelector<HTMLButtonElement>(".sw__mobile-sheet-close")?.focus({preventScroll: true});
    }

    // 收藏底部弹窗 DOM 骨架：抽屉 + 拖把柄 + 标题 + 内容容器
    private buildMobileFavSheetHtml(): string {
        return `<div class="sw__mobile-sheet" role="dialog" aria-modal="true" aria-label="${this.escapeAttr(this.i18n.mobileFavTitle)}">
    <div class="sw__mobile-sheet-handle"></div>
    <div class="sw__mobile-sheet-title">
        <span>${this.i18n.mobileFavTitle}</span>
        <span class="sw__mobile-sheet-close-hint" aria-label="Esc ${this.i18n.platformCloseHint || "退出"}"><kbd>Esc</kbd><span>${this.i18n.platformCloseHint || "退出"}</span></span>
        <button type="button" class="b3-button b3-button--text sw__mobile-sheet-close" aria-label="${this.i18n.close}" title="${this.i18n.close}">
            <svg><use xlink:href="#iconClose"></use></svg>
        </button>
    </div>
    <div class="sw__mobile-sheet-body"></div>
</div>`;
    }

    // 渲染收藏内容：分组（带 ⋯ 批量按钮）/ 单列表（无分组命名空间时）/ 空态
    private renderMobileFavSheetBody(
        body: HTMLElement,
        favorites: IFavoriteItem[],
        groupNames: string[],
        closeOverlay: IOverlayClose,
        onTabsChanged: (() => void) | undefined,
        overlay: HTMLElement,
        closeSheet: () => void,
    ) {
        const groups = groupFavoritesByGroup(favorites, groupNames);
        const groupedNames = Array.from(groups.keys()).filter((name) => name !== "");
        const ungrouped = groups.get("") || [];

        if (groupedNames.length === 0) {
            body.appendChild(this.buildMobileFavSheetList(ungrouped, overlay, closeOverlay, closeSheet));
        } else {
            groupedNames.forEach((name) => {
                this.appendMobileFavSheetSection(body, name, groups.get(name) || [], false,
                    overlay, closeOverlay, onTabsChanged, closeSheet);
            });
            if (ungrouped.length > 0) {
                this.appendMobileFavSheetSection(body, this.i18n.ungrouped, ungrouped, true,
                    overlay, closeOverlay, onTabsChanged, closeSheet);
            }
        }

        // favorites 为空（仅有空分组注册）时追加空态
        if (favorites.length === 0) {
            const empty = document.createElement("div");
            empty.className = "sw__mobile-sheet-empty";
            empty.setAttribute("role", "status");
            empty.textContent = this.i18n.mobileNoFav;
            body.appendChild(empty);
        }
    }

    // 渲染单个分组区块：标题（组名 + 数量 + ⋯）+ 项列表
    private appendMobileFavSheetSection(
        body: HTMLElement,
        name: string,
        items: IFavoriteItem[],
        isUngrouped: boolean,
        overlay: HTMLElement,
        closeOverlay: IOverlayClose,
        onTabsChanged: (() => void) | undefined,
        closeSheet: () => void,
    ) {
        const section = document.createElement("div");
        section.className = "sw__mobile-sheet-section";
        const header = document.createElement("div");
        header.className = "sw__mobile-sheet-section-header";
        // ⋯ 按钮：触发组内批量开/关（嵌套底部弹窗）
        header.innerHTML = `<span>${this.escapeAttr(name)}</span>
<span class="sw__mobile-sheet-count">${items.length}</span>
<button type="button" class="sw__mobile-sheet-more" aria-label="${this.escapeAttr(this.i18n.favGroupTip)}">
    <svg><use xlink:href="#iconMore"></use></svg>
</button>`;
        const moreBtn = header.querySelector<HTMLButtonElement>(".sw__mobile-sheet-more");
        moreBtn?.addEventListener("click", (event) => {
            event.stopPropagation();
            // 批量操作完成后：关闭嵌套弹窗 → 关闭收藏弹窗 → 刷新背后切换器列表
            const onNestedClosed = () => {
                document.querySelectorAll(".sw__mobile-sheet-overlay--nested").forEach((el) => el.remove());
                closeSheet();
                onTabsChanged?.();
            };
            openMobileGroupActions.call(this, name, items, onNestedClosed, moreBtn);
        });
        section.appendChild(header);
        section.appendChild(this.buildMobileFavSheetList(items, overlay, closeOverlay, closeSheet));
        body.appendChild(section);
    }

    // 单列表：每项是文件图标 + 标题，点击关闭弹窗并跳转
    private buildMobileFavSheetList(
        favorites: IFavoriteItem[],
        overlay: HTMLElement,
        closeOverlay: IOverlayClose,
        closeSheet?: () => void,
    ): HTMLElement {
        const list = document.createElement("div");
        list.className = "sw__mobile-sheet-list";
        favorites.forEach((fav) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "sw__mobile-sheet-item";
            item.innerHTML = `<svg><use xlink:href="#iconFile"></use></svg><span>${this.escapeAttr(fav.title)}</span>`;
            item.addEventListener("click", () => {
                closeSheet?.();
                this.jumpToFavorite(fav, closeOverlay);
            });
            list.appendChild(item);
        });
        return list;
    }

    // 点击背景关闭：抽屉下滑 + 遮罩淡出，250ms 后移除
    private closeMobileFavSheetOverlay(overlay: HTMLElement, sheet: HTMLElement, returnFocus?: HTMLElement | null) {
        if (!overlay.isConnected || overlay.dataset.closing === "true") return;
        overlay.dataset.closing = "true";
        sheet.classList.remove("sw__mobile-sheet--open");
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.remove();
            if (returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
        }, FAB_HIDE_DELAY_MS);
    }

    private bindMobileFavSheetBackdropClose(overlay: HTMLElement, _sheet: HTMLElement, _returnFocus: HTMLElement | null | undefined, closeSheet: () => void) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeSheet();
        });
    }

    // T-6925（真机反馈修复）：手机端宿主 MobileTabs.close 的副作用会把我们的切换器
    // 压到原生浮层之下——关非活动页签后宿主 openOverview 弹出页签总览（openModel 给
    // #model 分配递增 zIndex 顶层），关活动页签走 closeModel。此处按用户等价操作点
    // 宿主自己的 #modelClose 关掉总览，并把仍连接的切换器弹窗重新置顶，
    // 使"在插件里关页签"继续停留在插件内（弹窗本身从不主动关闭）。
    private restoreMobileSwitcherAboveHostPanels() {
        const dialog = this.mobileSwitcherDialog;
        if (!dialog?.element.isConnected) return;
        const model = document.getElementById("model");
        if (model && model.style.transform === "translateX(0px)" && model.querySelector(".mobile-tabs")) {
            // #modelClose 非 HTMLElement（无 .click()），须以事件触发宿主自己的关闭路径
            (model.querySelector("#modelClose") as Element | null)
                ?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
        }
        const siyuan = getSiyuan() as {zIndex?: number} | null;
        if (siyuan && Number.isFinite(Number(siyuan.zIndex))) {
            siyuan.zIndex = Number(siyuan.zIndex) + 1;
            dialog.element.style.zIndex = String(siyuan.zIndex);
        }
    }

    // T-6794 收起键盘：Android 原生桥（思源 keyboardToolbar 同款守卫调用）；
    // iOS 无对应桥，如实不可用。
    private hideMobileKeyboard(): boolean {
        if (!this.isMobile) return false;
        const bridge = window as unknown as {JSAndroid?: {hideKeyboard?: () => void}};
        if (bridge.JSAndroid && typeof bridge.JSAndroid.hideKeyboard === "function") {
            bridge.JSAndroid.hideKeyboard();
            return true;
        }
        return false;
    }
}
