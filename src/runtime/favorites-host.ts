import {Dialog, Menu, openTab} from "siyuan";
import {lvNotify} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {groupFavoritesByGroup, resolveFavoriteRootId, planGroupOpenFavorites, sanitizeFavorites, sanitizeStringList} from "../util";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap} from "../platform-dom";
import {openDocumentOnDesktop} from "../document-actions";
import {removeFavoriteEntry, setFavoriteEntryGroup, migrateFavoriteEntry, normalizeFavoriteSmartGroups, buildTagSmartGroupQuery, projectTagSmartGroupEntries} from "../favorite-actions";
import {normalizeEssentials} from "../settings-model";
import {MESSAGE_DEFAULT_MS, TAB_SETTLE_MS, FAVORITES_MAX, PINNED_MAX, FAVORITE_GROUPS_MAX, FAV_PANEL_WIDTH_PX, FAV_PANEL_MAX_HEIGHT_PX, FAV_PANEL_MIN_HEIGHT_PX, PINNED_KEY, FAV_KEY, FAV_GROUPS_KEY, FAV_COLLAPSED_KEY} from "../constants";
import {type Tab, type IOverlayClose, type IFavoriteItem, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface FavoritesHostRuntime extends Omit<ISpeedSwitchHost, "reorderFavoriteGroups" | "reorderFavoritesInGroup" | "getPinned" | "togglePinned" | "getFavorites" | "saveFavorites" | "toggleFavorite" | "migrateFavoriteKey" | "initFavCollapsed" | "saveFavCollapsed" | "setupFavDropdown" | "positionFavPanel" | "renderFavPanel" | "appendFavSmartGroup" | "appendFavGroup" | "appendFavFlatList" | "makeFavItem" | "refreshFavDropdown" | "refreshFavSelects" | "setFavoriteGroup" | "addFavoriteToGroup" | "getFavGroupRegistry" | "saveFavGroupRegistry" | "getFavoriteGroupNames" | "createFavoriteGroup" | "deleteFavoriteGroup" | "renameFavoriteGroup" | "refreshCardFavState" | "openFavMenu" | "buildFavMenuUnfavorited" | "buildFavMenuFavorited" | "openFavGroupMenu" | "openFavItemMenu" | "applyFavItemChange" | "openGroupDialog" | "openFavoriteGroupDialog" | "jumpToFavorite" | "openGroupTabs" | "openGroupTabsInternal" | "closeGroupTabs" | "closeGroupTabsInternal"> {}
export class FavoritesHostRuntime {
    private reorderFavoriteGroups(source: string, target: string) {
        const names = this.getFavoriteGroupNames();
        const from = names.indexOf(source);
        const to = names.indexOf(target);
        if (from < 0 || to < 0 || from === to) return;
        const [moved] = names.splice(from, 1);
        names.splice(names.indexOf(target), 0, moved);
        this.saveFavGroupRegistry(names);
        this.refreshFavSelects();
    }

    private runWithTier2(apply: () => Promise<void> | void): Promise<void> | void {
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") {
            return this.ensureTier2Loaded().then(apply);
        }
        return apply();
    }

    private finishFavChange(dirty: boolean, list: IFavoriteItem[]): void {
        if (dirty) void this.saveFavorites(list);
        this.refreshFavSelects();
    }

    private reorderFavoritesInGroup(group: string, sourceKey: string, targetKey: string): Promise<void> | void {
        return this.runWithTier2(() => {
            const list = this.getFavorites();
            const groupItems = list.filter((item) => (item.group || "") === group);
            const from = groupItems.findIndex((item) => item.key === sourceKey);
            const to = groupItems.findIndex((item) => item.key === targetKey);
            if (from < 0 || to < 0 || from === to) return;
            const [moved] = groupItems.splice(from, 1);
            groupItems.splice(to, 0, moved);
            let cursor = 0;
            for (let index = 0; index < list.length; index++) {
                if ((list[index].group || "") === group) list[index] = groupItems[cursor++];
            }
            return this.finishFavChange(true, list);
        });
    }

    // 读取置顶列表
    private getPinned(): string[] {
        return this.readDataMemo(PINNED_KEY, (data) => {
            const result = sanitizeStringList(data, PINNED_MAX);
            if (result.changed) {
                this.data[PINNED_KEY] = result.items;
                this.saveDataDebounced(PINNED_KEY);
            }
            return result.items;
        });
    }

    // 切换置顶状态，返回切换后是否为置顶
    private togglePinned(tab: Tab): boolean {
        const key = this.pinKeyOf(tab);
        const list = this.getPinned();
        const index = list.indexOf(key);
        if (index >= 0) {
            list.splice(index, 1);
            this.data[PINNED_KEY] = list;
            this.saveDataDebounced(PINNED_KEY);
            return false;
        }
        list.unshift(key);
        if (list.length > PINNED_MAX) list.length = PINNED_MAX;
        this.data[PINNED_KEY] = list;
        this.saveDataDebounced(PINNED_KEY);
        return true;
    }

    // 读取收藏列表（最近收藏在前）
    private getFavorites(): IFavoriteItem[] {
        return this.readDataMemo(FAV_KEY, (data) => {
            const result = sanitizeFavorites(data, FAVORITES_MAX);
            if (result.changed) {
                this.data[FAV_KEY] = result.items;
                this.saveDataDebounced(FAV_KEY);
            }
            return result.items;
        });
    }

    private async saveFavorites(list: IFavoriteItem[]): Promise<void> {
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        this.data[FAV_KEY] = sanitizeFavorites(list, FAVORITES_MAX).items;
        this.saveDataDebounced(FAV_KEY);
    }

    public async addFavorite(item: IFavoriteItem): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const list = this.getFavorites();
        const existingIndex = list.findIndex((x) => (x.rootId && x.rootId === item.rootId) || x.key === item.key);
        if (existingIndex >= 0) {
            list[existingIndex] = {...list[existingIndex], ...item};
        } else {
            list.unshift(item);
        }
        await this.saveFavorites(list);
    }

    // 切换收藏状态，返回切换后是否为已收藏
    private async toggleFavorite(tab: Tab): Promise<boolean> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const list = this.getFavorites();
        const rootId = this.rootIdOf(tab);
        if (!rootId) {
            // 未解析页签（懒加载未激活）：key 会退化为一次性 tab.id，收藏后必然无法跳转，
            // 星标还会在页签激活后错乱引发重复收藏。此处仅允许移除同键历史脏数据，拒绝新增
            const index = list.findIndex((item) => item.key === tab.id);
            if (index >= 0) {
                list.splice(index, 1);
                await this.saveFavorites(list);
                return false;
            }
            showMessage(this.i18n.favNeedActivate);
            return false;
        }
        if (await this.migrateFavoriteKey(list, tab, rootId)) {
            return true;
        }
        const index = list.findIndex((item) => item.key === rootId);
        if (index >= 0) {
            list.splice(index, 1);
            await this.saveFavorites(list);
            return false;
        }
        list.unshift({key: rootId, title: this.titleOf(tab), rootId, group: ""});
        await this.saveFavorites(list);
        return true;
    }

    // 迁移历史脏收藏条目：旧版本曾把未解析页签的 tab.id（UUID）当作收藏 key，
    // 此类条目 rootId 为空、跳转必然失效。页签激活解析出 rootId 后将其改写为稳定键；
    // 若同文档已存在正常条目则脏条目属于历史重复，直接移除。返回是否发生了迁移
    private async migrateFavoriteKey(list: IFavoriteItem[], tab: Tab, rootId: string): Promise<boolean> {
        const result = migrateFavoriteEntry(list, tab.id, rootId);
        if (!result.migrated) return false;
        list.splice(0, list.length, ...result.items);
        try {
            await this.saveFavorites(list);
        } catch (err) {
            logger.warn("migrateFavoriteKey saveFavorites fail", err);
        }
        return true;
    }

    public async removeFavorite(key: string): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const result = removeFavoriteEntry(this.getFavorites(), key);
        if (result.changed) await this.saveFavorites(result.items);
    }

    // 从持久化数据初始化 favCollapsed 集合
    private initFavCollapsed() {
        const saved = this.data[FAV_COLLAPSED_KEY];
        // T-7184：以持久化快照重建集合（历史只追加——远端展开/删除分组的折叠项
        // 残留本地内存，跨设备折叠状态无法收敛）。快照即真相：损坏/缺失 = 全部展开。
        const next = new Set<string>();
        if (Array.isArray(saved)) {
            saved.forEach((name) => {
                if (typeof name === "string" && name) {
                    next.add(name);
                }
            });
        }
        this.favCollapsed = next;
    }

    // 折叠/展开状态变化后去抖写入持久化
    private async saveFavCollapsed(): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        this.data[FAV_COLLAPSED_KEY] = Array.from(this.favCollapsed);
        this.saveDataDebounced(FAV_COLLAPSED_KEY);
    }

    // 初始化一个收藏下拉组件（弹窗与侧边栏各一份）
    // onClose：选择收藏项后的收尾（弹窗销毁 / 侧边栏刷新），组件内部还会同时收起面板
    private setupFavDropdown(container: HTMLElement, onClose: IOverlayClose, onChanged: IOverlayClose = () => undefined) {
        container.innerHTML = `<button type="button" class="sw__fav-trigger b3-tooltips b3-tooltips__s" aria-label="${this.i18n.favorites} · 常用收藏文档">
    <svg><use xlink:href="#iconStar"></use></svg>
    <span class="sw__fav-trigger-text">${this.i18n.favorites}</span>
    <span class="sw__fav-badge fn__none"></span>
</button>
<div class="sw__fav-panel fn__none"></div>`;

        const trigger = container.querySelector<HTMLElement>(".sw__fav-trigger");
        const panel = container.querySelector<HTMLElement>(".sw__fav-panel");
        trigger?.setAttribute("aria-haspopup", "menu");
        trigger?.setAttribute("aria-expanded", "false");

        // 面板打开期间才监听 DOM 变化：容器被移除（弹窗销毁/侧边栏重渲染）时解绑全局监听；
        // 面板关闭即 disconnect，避免 body 级 MutationObserver 随编辑操作全局常驻
        const observer = typeof MutationObserver === "function" ? new MutationObserver(() => {
            if (!container.isConnected) {
                unbindGlobal();
            }
        }) : null;
        let repositionRaf = 0;
        const unbindGlobal = () => {
            if (repositionRaf) {
                window.cancelAnimationFrame(repositionRaf);
                repositionRaf = 0;
            }
            document.removeEventListener("pointerdown", onDocPointerDown, true);
            window.removeEventListener("resize", onReposition);
            document.removeEventListener("scroll", onReposition, true);
            observer?.disconnect();
        };
        // 收起面板并停止 DOM 观察（三条收起路径共用：再次点击触发器 / 点击外部 / 选中收藏项）。
        // T-7181：关闭即释放——pointerdown/resize/scroll 与 body 观察器同步解绑，
        // 不再等下一次全局点击兜底。
        const closePanel = () => {
            panel.classList.add("fn__none");
            const focusInside = panel?.contains(document.activeElement) ?? false;
            trigger?.setAttribute("aria-expanded", "false");
            // 全局监听仅在面板展开期间存在，关闭后立即释放。
            unbindGlobal();
            if (focusInside && trigger?.isConnected) trigger.focus({preventScroll: true});
        };
        trigger.addEventListener("keydown", (event) => {
            if (panel.classList.contains("fn__none")) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closePanel();
                return;
            }
            if (event.key === "ArrowDown") {
                const firstBtn = panel.querySelector<HTMLButtonElement>("button:not(:disabled)");
                if (firstBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    firstBtn.focus({preventScroll: true});
                }
            }
        });
        panel?.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || panel.classList.contains("fn__none")) return;
            event.preventDefault();
            event.stopPropagation();
            closePanel();
        });
        // 点击外部收起面板；面板关闭期间 MutationObserver 已停止，
        // 宿主容器被移除后由这次全局点击兜底解绑全部监听
        const onDocPointerDown = (event: PointerEvent) => {
            if (!container.isConnected) {
                unbindGlobal();
                return;
            }
            if (!container.contains(event.target as Node)) {
                closePanel();
            }
        };
        // 视口尺寸/滚动变化时重新贴位（fixed 定位不随文档流移动，RAF 节流）
        const onReposition = () => {
            if (repositionRaf) return;
            repositionRaf = window.requestAnimationFrame(() => {
                repositionRaf = 0;
                if (!panel.classList.contains("fn__none") && container.isConnected) {
                    this.positionFavPanel(trigger, panel);
                }
            });
        };
        trigger.addEventListener("click", () => {
            const willOpen = panel.classList.contains("fn__none");
            if (willOpen) {
                this.renderFavPanel(panel, () => {
                    closePanel();
                    onClose();
                }, onChanged);
                panel.classList.remove("fn__none");
                trigger.setAttribute("aria-expanded", "true");
                this.positionFavPanel(trigger, panel);
                document.addEventListener("pointerdown", onDocPointerDown, true);
                window.addEventListener("resize", onReposition);
                document.addEventListener("scroll", onReposition, {capture: true, passive: true});
                // 性能护栏：仅监听宿主父容器直接子节点增删，绝不开启全局 body 的 subtree: true
                const obsTarget = container.parentElement || document.body;
                observer?.observe(obsTarget, {childList: true, subtree: false});
            } else {
                closePanel();
            }
        });

        this.refreshFavDropdown(container);
    }

    // 计算收藏下拉面板坐标：fixed 定位脱离侧边栏/弹窗的 overflow 裁剪，
    // 宽度按宿主（切换器弹窗或侧边栏面板）与视口的可用空间收缩，
    // 优先与触发器右对齐、出现在下方；左侧越界贴宿主左缘，下方空间不足翻转到上方
    private positionFavPanel(trigger: HTMLElement, panel: HTMLElement) {
        const rect = trigger.getBoundingClientRect();
        const margin = 6;
        let minLeft = margin;
        let maxRight = window.innerWidth - margin;
        const host = trigger.closest<HTMLElement>(".speed-switch");
        if (host) {
            const hostRect = host.getBoundingClientRect();
            minLeft = Math.max(minLeft, hostRect.left + 2);
            maxRight = Math.min(maxRight, hostRect.right - 2);
        }
        // 宽度：理想 FAV_PANEL_WIDTH_PX，按宿主/视口可用空间收缩，确保不超出侧边栏
        const avail = Math.max(0, maxRight - minLeft);
        const width = Math.min(FAV_PANEL_WIDTH_PX, avail);
        let left = Math.min(Math.max(rect.right - width, minLeft), maxRight - width);
        // 垂直：默认在触发器下方，剩余空间不足时翻转到触发器上方
        let top = rect.bottom + margin;
        let maxHeight = window.innerHeight - margin - top;
        if (maxHeight < 180) {
            const over = Math.min(FAV_PANEL_MAX_HEIGHT_PX, rect.top - margin * 2);
            top = Math.max(margin, rect.top - margin - over);
            maxHeight = rect.top - margin - top;
        }
        panel.style.width = `${width}px`;
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.maxHeight = `${Math.max(FAV_PANEL_MIN_HEIGHT_PX, Math.round(maxHeight))}px`;
    }

    // 渲染下拉面板内容：分组标题（点击折叠/展开）+ 组内收藏项（点击跳转）
    private renderFavPanel(panel: HTMLElement, onPick: () => void, onChanged: IOverlayClose = () => undefined) {
        panel.innerHTML = "";
        const favorites = this.getFavorites();
        const groupNames = this.getFavoriteGroupNames();

        // 既无收藏也无分组才提示空态；仅有空分组时仍展示分组（数量 0），与设置页保持一致
        if (favorites.length === 0 && groupNames.length === 0) {
            const empty = document.createElement("div");
            empty.className = "sw__fav-empty";
            empty.setAttribute("role", "status");
            empty.textContent = this.i18n.noFavorites;
            panel.appendChild(empty);
            return;
        }

        // 按分组归类（分组顺序 = 注册表新建顺序在前；注册表中的空分组也占位，数量显示 0）
        const groups = groupFavoritesByGroup(favorites, groupNames);

        // 有分组时未分组的置底显示为「未分组」；无任何分组时平铺不显示组头
        const groupedNames = Array.from(groups.keys()).filter((name) => name !== "");
        const ungrouped = groups.get("") || [];
        if (!groupedNames.length) {
            this.appendFavFlatList(panel, ungrouped, onPick, onChanged);
        } else {
            groupedNames.forEach((name) => this.appendFavGroup(panel, name, groups.get(name) || [], onPick, onChanged));
            if (ungrouped.length > 0) {
                this.appendFavGroup(panel, this.i18n.ungrouped, ungrouped, onPick, onChanged);
            }
        }

        // T-6804 标签智能分组：动态分区置于静态分组之后，按需拉取（面板打开时一次）
        const smartGroups = this.getSettings().favoriteSmartGroups || [];
        smartGroups.forEach((group) => this.appendFavSmartGroup(panel, group, onPick, onChanged));
    }

    // T-6804 智能分组分区：壳体先渲染（加载态），内核按需返回后填充条目。
    // 条目为只读投影：点击跳转，不提供静态收藏的移动/取消菜单。
    private appendFavSmartGroup(panel: HTMLElement, group: {name: string; tag: string}, onPick: () => void, onChanged: IOverlayClose = () => undefined) {
        const groupEl = document.createElement("div");
        groupEl.className = "sw__fav-group sw__fav-group--smart";

        const head = document.createElement("button");
        head.type = "button";
        head.className = "sw__fav-group-head";
        head.title = `${group.tag}`;
        head.innerHTML = `<svg class="sw__fav-arrow"><use xlink:href="#iconRight"></use></svg>
<span class="sw__fav-group-name"></span>
<span class="sw__fav-count">#${group.tag}</span>`;
        head.querySelector<HTMLElement>(".sw__fav-group-name")!.textContent = group.name;
        groupEl.appendChild(head);

        const list = document.createElement("div");
        list.className = "sw__fav-items";
        const status = document.createElement("div");
        status.className = "sw__history-empty sw__fav-smart-status";
        status.textContent = this.i18n.favSmartGroupLoading;
        list.appendChild(status);
        groupEl.appendChild(list);
        panel.appendChild(groupEl);

        const query = buildTagSmartGroupQuery(group, {nowMs: Date.now()});
        if (!query) {
            status.textContent = this.i18n.favSmartGroupLoading;
            return;
        }
        void this.fetchKernelJson("/api/query/sql", query).then((json) => {
            const entries = projectTagSmartGroupEntries(json?.data);
            status.remove();
            entries.forEach((entry) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = "sw__fav-item";
                item.innerHTML = `<svg><use xlink:href="#iconFile"></use></svg><span></span>`;
                item.querySelector("span")!.textContent = entry.title;
                item.title = entry.title;
                item.setAttribute("role", "menuitem");
                item.addEventListener("click", () => {
                    onPick();
                    if (this.isMobile) {
                        void this.mobileOpenDoc(entry.rootId);
                    } else {
                        void this.bridge.openTab({app: this.app, doc: {id: entry.rootId}});
                    }
                });
                list.appendChild(item);
            });
            if (!entries.length) {
                const emptyItem = document.createElement("div");
                emptyItem.className = "sw__fav-smart-status";
                emptyItem.textContent = this.i18n.favSmartGroupEmpty;
                list.appendChild(emptyItem);
            }
            const count = head.querySelector<HTMLElement>(".sw__fav-count");
            if (count) count.textContent = `${entries.length} · #${group.tag}`;
            onChanged();
        }).catch(() => {
            status.textContent = this.i18n.favSmartGroupEmpty;
        });
    }

    public getFavoriteSmartGroups(): Array<{name: string; tag: string; notebook?: string; updatedWithinDays?: number}> {
        return this.getSettings().favoriteSmartGroups || [];
    }

    public addFavoriteSmartGroup(name: string, tag: string, notebook = "", updatedWithinDays = 0): boolean {
        const current = this.getFavoriteSmartGroups();
        if (current.length >= 4) return false;
        const next = normalizeFavoriteSmartGroups([...current, {name, tag, notebook, updatedWithinDays}]);
        if (next.length === current.length) return false;
        this.updateSettings({favoriteSmartGroups: next});
        return true;
    }

    public removeFavoriteSmartGroup(name: string): void {
        const next = normalizeFavoriteSmartGroups(
            this.getFavoriteSmartGroups().filter((group) => group.name !== name),
        );
        this.updateSettings({favoriteSmartGroups: next});
    }

    public getDocumentSetEssentials(): string[] {
        return this.getSettings().documentSetEssentials || [];
    }

    public addDocumentSetEssentialsFromCurrentTabs(): number {
        const merged = normalizeEssentials([
            ...this.getSettings().documentSetEssentials,
            ...this.currentDocumentSetEntries().map((entry) => entry.rootId),
        ]);
        this.updateSettings({documentSetEssentials: merged});
        return merged.length;
    }

    public removeDocumentSetEssential(rootId: string): void {
        this.updateSettings({
            documentSetEssentials: (this.getSettings().documentSetEssentials || []).filter((id) => id !== rootId),
        });
    }

    // T-6841：设置页恢复路径同样调用（对齐 T-6810"每次恢复"语义），故公开
    public async openDocumentSetEssentials(): Promise<{opened: number; failed: number; skipped: number; results: Array<{rootId: string; status: "restored" | "failed" | "skipped"; error?: string}>}> {
        const essentials = this.getSettings().documentSetEssentials || [];
        const opened = new Set(this.currentDocumentSetEntries().map((entry) => entry.rootId));
        // T-6815：带回执打开——opened=本次成功、failed=尝试失败、skipped=已打开跳过。
        // T-6841：逐项明细随回执返回（rootId+status+失败原因），并入恢复报告导出。
        const outcome = {opened: 0, failed: 0, skipped: 0, results: [] as Array<{rootId: string; status: "restored" | "failed" | "skipped"; error?: string}>};
        for (const rootId of essentials) {
            if (opened.has(rootId)) {
                outcome.skipped += 1;
                outcome.results.push({rootId, status: "skipped"});
                continue;
            }
            try {
                const ok = this.isMobile ? await this.mobileOpenDoc(rootId)
                    // T-6826：常驻层同样不抢焦点（跟随恢复链语义）
                    : await openDocumentOnDesktop({rootId, app: this.app, openTab, logger, keepCursor: true});
                if (ok) {
                    outcome.opened += 1;
                    outcome.results.push({rootId, status: "restored"});
                } else {
                    outcome.failed += 1;
                    outcome.results.push({rootId, status: "failed", error: "open returned false"});
                }
            } catch (error) {
                outcome.failed += 1;
                outcome.results.push({rootId, status: "failed", error: error instanceof Error ? error.message : String(error)});
            }
        }
        return outcome;
    }

    // T-6810 设置页管理器：把当前打开的页签一键加入常驻，逐条移除或全部清空。
    // 自含内部重渲染，不依赖外层 render 闭包。
    public buildDocumentSetEssentialsManager(): HTMLElement {
        const section = document.createElement("div");
        section.className = "sw-document-set-essentials";
        const title = document.createElement("strong");
        title.textContent = this.i18n.documentSetEssentialsLabel;
        const tip = document.createElement("p");
        tip.className = "sw-settings__hint";
        tip.textContent = this.i18n.documentSetEssentialsTip;
        section.append(title, tip);
        const buildContent = () => {
            section.querySelectorAll(".sw-document-set-essentials__dynamic").forEach((el) => el.remove());
            const dynamic = document.createElement("div");
            dynamic.className = "sw-document-set-essentials__dynamic";
            const essentials = this.getDocumentSetEssentials();
            const add = document.createElement("button");
            add.type = "button";
            add.className = "b3-button b3-button--outline";
            add.textContent = this.i18n.documentSetEssentialsAdd;
            add.addEventListener("click", () => {
                this.addDocumentSetEssentialsFromCurrentTabs();
                buildContent();
            });
            dynamic.appendChild(add);
            if (essentials.length) {
                const clear = document.createElement("button");
                clear.type = "button";
                clear.className = "b3-button b3-button--text";
                clear.textContent = this.i18n.documentSetEssentialsClear;
                clear.addEventListener("click", () => {
                    this.updateSettings({documentSetEssentials: []});
                    buildContent();
                });
                dynamic.appendChild(clear);
            }
            if (!essentials.length) {
                const empty = document.createElement("p");
                empty.className = "sw-settings__hint";
                empty.textContent = this.i18n.documentSetEssentialsEmpty;
                dynamic.appendChild(empty);
            } else {
                const list = document.createElement("div");
                list.className = "sw-document-set-essentials__list";
                essentials.forEach((rootId, index) => {
                    const row = document.createElement("div");
                    row.className = "sw-document-set-essentials__item";
                    const label = document.createElement("span");
                    label.textContent = `#${index + 1} · ${rootId.slice(0, 14)}…`;
                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.className = "b3-button b3-button--text";
                    remove.textContent = this.i18n.documentSetEssentialsRemove;
                    remove.addEventListener("click", () => {
                        this.removeDocumentSetEssential(rootId);
                        buildContent();
                    });
                    row.append(label, remove);
                    list.appendChild(row);
                });
                dynamic.appendChild(list);
            }
            section.appendChild(dynamic);
        };
        buildContent();
        return section;
    }

    public async getFavoriteTagOptions(): Promise<Array<{name: string; count: number}>> {
        const json = await this.fetchKernelJson("/api/tag/getTag", {});
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.tags) ? json.data.tags : [];
        return rows
            .map((row: {name?: unknown; count?: unknown}) => ({
                name: typeof row?.name === "string" ? row.name : "",
                count: Number(row?.count) || 0,
            }))
            .filter((row: {name: string}) => row.name.length > 0)
            .slice(0, 200);
    }

    // T-6817 动态组：笔记本范围下拉的数据源（有界清单，来自内核 lsNotebooks）
    public async getFavoriteNotebookOptions(): Promise<Array<{id: string; name: string}>> {
        const notebooks = await this.loadNotebooks();
        return notebooks.slice(0, 100);
    }

    // 渲染单个收藏分组：可折叠组头（右键弹出一键开/关菜单）+ 组内项列表
    private appendFavGroup(panel: HTMLElement, name: string, items: IFavoriteItem[], onPick: () => void, onChanged: IOverlayClose = () => undefined) {
        const groupEl = document.createElement("div");
        groupEl.className = "sw__fav-group" + (this.favCollapsed.has(name) ? " sw__fav-collapsed" : "");

        const head = document.createElement("button");
        head.type = "button";
        head.className = "sw__fav-group-head";
        head.title = this.i18n.favGroupTip;
        // T-7193：读屏合同——aria-expanded 同步折叠状态，aria-controls 指向组体列表
        const isCollapsed = this.favCollapsed.has(name);
        head.setAttribute("aria-expanded", String(!isCollapsed));
        const listId = `sw-fav-group-${name.replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, "-")}`;
        head.setAttribute("aria-controls", listId);
        head.innerHTML = `<svg class="sw__fav-arrow"><use xlink:href="#iconRight"></use></svg>
<span class="sw__fav-group-name"></span>
<span class="sw__fav-count">${items.length}</span>`;
        head.querySelector<HTMLElement>(".sw__fav-group-name")!.textContent = name;
        head.addEventListener("click", () => {
            groupEl.classList.toggle("sw__fav-collapsed");
            const collapsed = groupEl.classList.contains("sw__fav-collapsed");
            head.setAttribute("aria-expanded", String(!collapsed));
            if (this.favCollapsed.has(name)) {
                this.favCollapsed.delete(name);
            } else {
                this.favCollapsed.add(name);
            }
            this.saveFavCollapsed();
        });
        // 右键弹出「一键开启/关闭组内页签」菜单，与 v0.14.0 changelog 描述对齐
        head.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openFavGroupMenu(items, event, onChanged);
        });
        groupEl.appendChild(head);

        const list = document.createElement("div");
        list.className = "sw__fav-items";
        list.id = listId;
        items.forEach((fav) => {
            list.appendChild(this.makeFavItem(panel, fav, onPick, onChanged));
        });
        groupEl.appendChild(list);
        panel.appendChild(groupEl);
    }

    // 无任何分组时的平铺列表（不显示组头）
    private appendFavFlatList(panel: HTMLElement, items: IFavoriteItem[], onPick: () => void, onChanged: IOverlayClose = () => undefined) {
        const list = document.createElement("div");
        list.className = "sw__fav-items sw__fav-items--flat";
        items.forEach((fav) => {
            list.appendChild(this.makeFavItem(panel, fav, onPick, onChanged));
        });
        panel.appendChild(list);
    }

    // 生成单个收藏项按钮：点击跳转；右键弹出操作菜单（移动至分组 / 取消收藏）
    private makeFavItem(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, onChanged: IOverlayClose = () => undefined): HTMLButtonElement {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "sw__fav-item";
        item.innerHTML = `<svg><use xlink:href="#iconFile"></use></svg><span></span>`;
        item.querySelector("span")!.textContent = fav.title;
        item.title = fav.title;
        item.addEventListener("click", () => {
            this.jumpToFavorite(fav, onPick);
        });
        item.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openFavItemMenu(panel, fav, onPick, event, onChanged);
        });
        return item;
    }

    // 刷新单个下拉组件的触发按钮徽标；面板展开中则收起（内容在下次打开时重建）
    private refreshFavDropdown(container: HTMLElement) {
        const count = this.getFavorites().length;
        const badge = container.querySelector<HTMLElement>(".sw__fav-badge");
        if (badge) {
            badge.textContent = String(count);
            badge.classList.toggle("fn__none", count === 0);
        }
        container.querySelector<HTMLElement>(".sw__fav-panel")?.classList.add("fn__none");
    }

    // 刷新所有收藏下拉组件（弹窗与侧边栏）的角标与面板
    private refreshFavSelects() {
        document.querySelectorAll<HTMLElement>(".sw__fav-dd").forEach((container) => {
            this.refreshFavDropdown(container);
        });
    }

    // 修改收藏项的分组（group 为空表示移出分组）
    private async setFavoriteGroup(key: string, group: string): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const list = this.getFavorites();
        const result = setFavoriteEntryGroup(list, key, group);
        if (!result.changed) return;
        list.splice(0, list.length, ...result.items);
        await this.saveFavorites(list);
        this.refreshFavSelects();
    }

    // 收藏页签到指定分组（已收藏则仅调整分组），用于菜单快速收藏到组
    private async addFavoriteToGroup(tab: Tab, group: string): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const list = this.getFavorites();
        const rootId = this.rootIdOf(tab);
        if (!rootId) {
            // 与 toggleFavorite 一致：未解析页签拒绝入组，避免产生无法跳转的脏条目
            showMessage(this.i18n.favNeedActivate);
            return;
        }
        await this.migrateFavoriteKey(list, tab, rootId);
        const item = list.find((fav) => fav.key === rootId);
        if (item) {
            item.group = group.trim();
        } else {
            list.unshift({key: rootId, title: this.titleOf(tab), rootId, group: group.trim()});
        }
        await this.saveFavorites(list);
        this.refreshFavSelects();
    }

    // 分组注册表（允许存在空分组：设置页新建后尚未收藏任何页签的分组）
    private getFavGroupRegistry(): string[] {
        const data = this.data[FAV_GROUPS_KEY];
        const result = sanitizeStringList(data, FAVORITE_GROUPS_MAX);
        if (result.changed) {
            this.data[FAV_GROUPS_KEY] = result.items;
            this.saveDataDebounced(FAV_GROUPS_KEY);
        }
        return result.items;
    }

    private async saveFavGroupRegistry(names: string[]): Promise<void> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        this.data[FAV_GROUPS_KEY] = sanitizeStringList(names, FAVORITE_GROUPS_MAX).items;
        this.saveDataDebounced(FAV_GROUPS_KEY);
    }

    // 全部分组名：注册表在前保持新建顺序，再并入收藏项上出现过的分组名，去重
    private getFavoriteGroupNames(): string[] {
        const merged: string[] = [];
        this.getFavGroupRegistry()
            .concat(this.getFavorites().map((item) => item.group || ""))
            .forEach((name) => {
                if (name && !merged.includes(name)) {
                    merged.push(name);
                }
            });
        return merged;
    }

    // 新建分组（重名直接忽略，返回是否创建成功）
    private createFavoriteGroup(name: string): boolean {
        const trimmed = name.trim();
        if (!trimmed || this.getFavoriteGroupNames().includes(trimmed)) {
            return false;
        }
        this.saveFavGroupRegistry(this.getFavGroupRegistry().concat(trimmed));
        return true;
    }

    // 删除分组：注册表移除，组内收藏项移出到未分组
    private deleteFavoriteGroup(name: string): Promise<void> | void {
        return this.runWithTier2(() => {
            this.saveFavGroupRegistry(this.getFavGroupRegistry().filter((item) => item !== name));
            const list = this.getFavorites();
            let dirty = false;
            list.forEach((item) => {
                if (item.group === name) {
                    item.group = "";
                    dirty = true;
                }
            });
            // 分组被删后清理其折叠状态
            if (this.favCollapsed.delete(name)) this.saveFavCollapsed();
            return this.finishFavChange(dirty, list);
        });
    }

    // 重命名分组：该组全部收藏项迁移到新名称，注册表同步改名（空分组也可重命名）
    private renameFavoriteGroup(from: string, to: string): Promise<void> | void {
        return this.runWithTier2(() => {
            const list = this.getFavorites();
            let dirty = false;
            list.forEach((item) => {
                if (item.group === from) {
                    item.group = to;
                    dirty = true;
                }
            });
            const registry = this.getFavGroupRegistry();
            if (registry.includes(from)) this.saveFavGroupRegistry(registry.map((item) => (item === from ? to : item)));
            // 分组重命名后同步迁移其折叠状态
            if (this.favCollapsed.delete(from)) {
                this.favCollapsed.add(to);
                this.saveFavCollapsed();
            }
            return this.finishFavChange(dirty, list);
        });
    }

    // 刷新卡片收藏状态标识（实心/空心星与提示文案）
    private refreshCardFavState(tab: Tab, card: HTMLElement) {
        const isFaved = this.getFavorites().some((item) => item.key === this.pinKeyOf(tab));
        card.classList.toggle("sw__faved", isFaved);
        const favoriteButton = card.querySelector<HTMLElement>(".sw__fav-btn");
        const label = isFaved ? this.i18n.unfavoriteTab : this.i18n.favoriteTab;
        favoriteButton?.setAttribute("aria-label", label);
        favoriteButton?.setAttribute("title", label);
    }

    // 星标点击菜单：未收藏时选择收藏方式（快速收藏 / 收藏到分组 / 新建分组收藏），
    // 已收藏时管理分组（切换分组 / 移出分组 / 取消收藏）
    private openFavMenu(tab: Tab, card: HTMLElement, event: MouseEvent) {
        const key = this.pinKeyOf(tab);
        const favorite = this.getFavorites().find((item) => item.key === key);
        const groupNames = this.getFavoriteGroupNames();
        const menu = new Menu("swFavMenu");

        // 未收藏 / 已收藏两套菜单项，分支差异很大故拆开各自构建
        if (!favorite) {
            this.buildFavMenuUnfavorited(menu, tab, card, groupNames);
        } else {
            this.buildFavMenuFavorited(menu, tab, card, key, favorite, groupNames);
        }
        menu.open({x: event.clientX, y: event.clientY});
    }

    // 未收藏菜单：先收藏（无分组），再列已有分组可直接归入，最后新建分组
    private buildFavMenuUnfavorited(menu: Menu, tab: Tab, card: HTMLElement, groupNames: string[]) {
        menu.addItem({
            label: this.i18n.favoriteTab,
            icon: "iconStar",
            click: async () => {
                await this.toggleFavorite(tab);
                this.refreshCardFavState(tab, card);
                this.refreshFavSelects();
                const favBtn = card.querySelector<HTMLElement>(".sw__fav-btn");
                if (favBtn) {
                    lvNotify.inline(favBtn, this.i18n.favoriteTab || "已收藏");
                }
            },
        });
        if (groupNames.length > 0) {
            menu.addSeparator();
            groupNames.forEach((name) => {
                menu.addItem({
                    label: this.escapeAttr(name),
                    icon: "iconFolder",
                    click: () => {
                        void this.addFavoriteToGroup(tab, name).catch((err) => {
                            logger.warn("addFavoriteToGroup fail", err);
                        });
                        this.refreshCardFavState(tab, card);
                    },
                });
            });
        }
        menu.addSeparator();
        menu.addItem({
            label: this.i18n.newGroupFav,
            icon: "iconAdd",
            click: () => this.openGroupDialog(tab, card),
        });
    }

    // 已收藏菜单：分组列表（当前分组打勾）+ 移出分组 + 新建分组 + 取消收藏
    private buildFavMenuFavorited(
        menu: Menu,
        tab: Tab,
        card: HTMLElement,
        key: string,
        favorite: IFavoriteItem,
        groupNames: string[],
    ) {
        if (groupNames.length > 0) {
            groupNames.forEach((name) => {
                menu.addItem({
                    label: this.escapeAttr(name),
                    icon: favorite.group === name ? "iconSelect" : "iconFolder",
                    click: () => {
                        void this.setFavoriteGroup(key, name).catch((err) => {
                            logger.warn("setFavoriteGroup fail", err);
                        });
                    },
                });
            });
            if (favorite.group) {
                menu.addItem({
                    label: this.i18n.removeFromGroup,
                    icon: "iconUnpin",
                    click: () => {
                        void this.setFavoriteGroup(key, "").catch((err) => {
                            logger.warn("setFavoriteGroup fail", err);
                        });
                    },
                });
            }
            menu.addSeparator();
        }
        menu.addItem({
            label: this.i18n.newGroupFav,
            icon: "iconAdd",
            click: () => this.openGroupDialog(tab, card),
        });
        menu.addSeparator();
        menu.addItem({
            label: this.i18n.unfavoriteTab,
            icon: "iconClose",
            click: async () => {
                await this.toggleFavorite(tab);
                this.refreshCardFavState(tab, card);
                this.refreshFavSelects();
                const favBtn = card.querySelector<HTMLElement>(".sw__fav-btn");
                if (favBtn) {
                    lvNotify.inline(favBtn, this.i18n.unfavoriteTab || "已取消收藏");
                }
            },
        });
    }

    // 收藏分组右键菜单：一键开启/关闭组内页签
    private openFavGroupMenu(items: IFavoriteItem[], event: MouseEvent, onChanged: IOverlayClose = () => undefined) {
        const menu = new Menu("swFavGroupMenu");
        menu.addItem({
            label: this.i18n.openGroupTabs,
            icon: "iconAdd",
            click: async () => {
                const count = await this.openGroupTabs(items);
                if (count > 0) {
                    onChanged();
                }
            },
        });
        menu.addItem({
            label: this.i18n.closeGroupTabs,
            icon: "iconClose",
            click: async () => {
                const count = await this.closeGroupTabs(items);
                if (count > 0) {
                    onChanged();
                }
            },
        });
        menu.open({x: event.clientX, y: event.clientY});
    }

    // 收藏下拉项右键菜单：移动到既有分组（子菜单，当前分组勾选）/ 取消收藏。
    // 操作后保持面板展开并就地重建，方便连续处理多个收藏项。
    private openFavItemMenu(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, event: MouseEvent, onChanged: IOverlayClose = () => undefined) {
        const menu = new Menu("swFavItemMenu");
        const moveSub = [{checked: !fav.group, label: this.escapeAttr(this.i18n.ungrouped),
            click: () => this.applyFavItemChange(() => this.setFavoriteGroup(fav.key, ""), panel, onPick, onChanged)}];
        this.getFavoriteGroupNames().forEach((name) => {
            moveSub.push({checked: fav.group === name, label: this.escapeAttr(name),
                click: () => this.applyFavItemChange(() => this.setFavoriteGroup(fav.key, name), panel, onPick, onChanged)});
        });
        menu.addItem({type: "submenu", label: this.i18n.moveToGroup, icon: "iconFolder", submenu: moveSub});
        // 新建分组并移动：弹窗输入分组名（新名称自动新建，留空移出分组）
        menu.addItem({
            label: this.i18n.newGroupFav,
            icon: "iconAdd",
            click: () => this.openFavoriteGroupDialog(panel, fav, onPick, onChanged),
        });
        menu.addSeparator();
        menu.addItem({
            label: this.i18n.unfavoriteTab,
            icon: "iconClose",
            click: () => this.applyFavItemChange(() => this.removeFavorite(fav.key), panel, onPick, onChanged),
        });
        menu.open({x: event.clientX, y: event.clientY});
    }

    // 执行收藏项变更：先落盘并同步所有下拉的徽标（refreshFavSelects 会收起展开中的面板），
    // 再让当前面板保持展开并就地重建，最后按新内容高度重新贴位
    private async applyFavItemChange(mutate: () => void | Promise<void>, panel: HTMLElement, onPick: () => void, onChanged: IOverlayClose = () => undefined): Promise<void> {
        await mutate();
        this.refreshFavSelects();
        panel.classList.remove("fn__none");
        this.renderFavPanel(panel, onPick, onChanged);
        const dd = panel.closest<HTMLElement>(".sw__fav-dd");
        const trigger = dd?.querySelector<HTMLElement>(".sw__fav-trigger");
        if (dd && trigger) {
            this.positionFavPanel(trigger, panel);
        }
    }

    // 弹窗设置收藏项的分组：输入分组名（留空移出分组），datalist 列出已有分组便于快速选择；
    // 未收藏的页签确认后自动收藏到该分组
    private openGroupDialog(tab: Tab, card?: HTMLElement) {
        const key = this.pinKeyOf(tab);
        const favorite = this.getFavorites().find((item) => item.key === key);
        const groupNames = this.getFavoriteGroupNames();
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            // Dialog title is text, not an HTML attribute. Escaping here would
            // visibly turn an ampersand or quote in a document title into
            // entities; the content template below remains escaped separately.
            title: `${this.i18n.setGroup} · ${this.titleOf(tab)}`,
            content: `<div class="b3-dialog__content">
    <input class="b3-text-field fn__block sw__group-input" placeholder="${this.i18n.groupName}" aria-label="${this.i18n.groupName}" list="sw__group-list-tab" value="${this.escapeAttr(favorite?.group || "")}" />
    <datalist id="sw__group-list-tab">${groupNames.map((name) => `<option value="${this.escapeAttr(name)}"></option>`).join("")}</datalist>
    <div class="fn__hr"></div>
    <div class="b3-label__text">${this.i18n.groupTip}</div>
</div>
<div class="b3-dialog__action">
    <button type="button" class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
    <div class="fn__space"></div>
    <button type="button" class="b3-button b3-button--text sw__group-confirm">${this.i18n.confirm}</button>
</div>`,
            width: "min(420px, 92vw)",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, `${this.i18n.setGroup} · ${this.titleOf(tab)}`, "", "iconFolder");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        const input = dialog.element.querySelector<HTMLInputElement>(".sw__group-input");
        if (!input) {
            dialog.destroy();
            return;
        }
        const confirm = () => {
            // 未收藏时一并收藏；已收藏时仅调整分组（留空移出分组）
            this.addFavoriteToGroup(tab, input.value);
            if (card) {
                this.refreshCardFavState(tab, card);
            }
            dialog.destroy();
        };
        input.addEventListener("keydown", (event) => {
            if (event.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter") {
                event.preventDefault();
                confirm();
            }
        });
        dialog.element.querySelector(".sw__group-confirm")?.addEventListener("click", confirm);
        dialog.element.querySelector(".b3-button--cancel")?.addEventListener("click", () => dialog.destroy());
        input.focus();
        input.select();
    }

    // 收藏下拉项：新建分组并移动。弹窗输入分组名（新名称自动新建，留空移出分组），
    // datalist 列出既有分组便于快速选择；确认后就地刷新下拉面板
    private openFavoriteGroupDialog(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, onChanged: IOverlayClose = () => undefined) {
        const groupNames = this.getFavoriteGroupNames();
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            title: `${this.i18n.setGroup} · ${fav.title}`,
            content: `<div class="b3-dialog__content">
    <input class="b3-text-field fn__block sw__group-input" placeholder="${this.i18n.groupName}" aria-label="${this.i18n.groupName}" list="sw__group-list-fav" value="${this.escapeAttr(fav.group || "")}" />
    <datalist id="sw__group-list-fav">${groupNames.map((name) => `<option value="${this.escapeAttr(name)}"></option>`).join("")}</datalist>
    <div class="fn__hr"></div>
    <div class="b3-label__text">${this.i18n.groupTip}</div>
</div>
<div class="b3-dialog__action">
    <button type="button" class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
    <div class="fn__space"></div>
    <button type="button" class="b3-button b3-button--text sw__group-confirm">${this.i18n.confirm}</button>
</div>`,
            width: "min(420px, 92vw)",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, `${this.i18n.setGroup} · ${fav.title}`, "", "iconFolder");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        const input = dialog.element.querySelector<HTMLInputElement>(".sw__group-input");
        if (!input) {
            dialog.destroy();
            return;
        }
        const confirm = () => {
            this.applyFavItemChange(() => this.setFavoriteGroup(fav.key, input.value), panel, onPick, onChanged);
            dialog.destroy();
        };
        input.addEventListener("keydown", (event) => {
            if (event.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter") {
                event.preventDefault();
                confirm();
            }
        });
        dialog.element.querySelector(".sw__group-confirm")?.addEventListener("click", confirm);
        dialog.element.querySelector(".b3-button--cancel")?.addEventListener("click", () => dialog.destroy());
        input.focus();
        input.select();
    }

    // 收藏条目的可跳转 rootId：优先取 rootId 字段，缺失时回退 key；两者都必须是
    // 块 ID 格式——历史脏条目的 key 是一次性 tab.id（UUID），openTab 无法解析只会静默失败
    // 跳转到收藏项：页签已开则切换过去；页签已关闭则按 rootId 重开。
    // 收藏项永久留存（直到用户主动删除）：无法定位文档的历史脏条目仅提示、不自动清理，
    // 用户打开对应页签后星标操作会自动将其迁移修复
    private async jumpToFavorite(favorite: IFavoriteItem, onClose: IOverlayClose) {
        // 手机端 getAllTabs() 恒为空，需用 MobileTabs 数据源
        const opened = this.currentTabs();
        const tab = opened.find((item) => this.pinKeyOf(item) === favorite.key);
        if (tab) {
            this.activateTab(tab, onClose);
            return;
        }
        // T-6806：跳转离开前记录当前现场（后退栈）
        this.captureJumpOrigin();
        const rootId = resolveFavoriteRootId(favorite);
        if (!rootId) {
            showMessage(this.i18n.favInvalidEntry);
            return;
        }
        onClose();
        if (this.isMobile) {
            // openTab 在手机端是空实现，走 MobileTabs.open
            const ok = await this.mobileOpenDoc(rootId);
            if (!ok) {
                showMessage(this.i18n.openDocFailed);
            }
        } else {
            const opened = await openDocumentOnDesktop({
                rootId,
                app: this.app,
                openTab,
                logger,
            });
            if (!opened) showMessage(this.i18n.openDocFailed);
        }
    }

    // 一键开启组内全部页签：打开未打开的收藏（rootId 校验与 jumpToFavorite 一致，
    // 无效历史条目跳过），返回实际打开数
    private async openGroupTabs(items: IFavoriteItem[]): Promise<number> {
        if (this.groupOperationBusy) {
            showMessage(this.i18n.groupTabsInProgress);
            return 0;
        }
        this.groupOperationBusy = true;
        try {
            return await this.openGroupTabsInternal(items);
        } finally {
            this.groupOperationBusy = false;
        }
    }

    private async openGroupTabsInternal(items: IFavoriteItem[]): Promise<number> {
        const opened = this.currentTabs();
        const openedKeys = new Set(opened.map((tab) => this.pinKeyOf(tab)));
        const plan = planGroupOpenFavorites(items, openedKeys, resolveFavoriteRootId);
        let failed = plan.invalid;
        const attempted: string[] = [];
        for (const {favorite: fav, rootId} of plan.targets) {
            if (this.isMobile) {
                // openTab 在手机端是空实现，串行等待 mobileOpenDoc 完成，避免并发丢调用；
                // 按返回结果计数（文档已删除等失败不计入，不虚报提示）
                if (!(await this.mobileOpenDoc(rootId))) {
                    failed++;
                    continue;
                }
            } else {
                try {
                    await this.bridge.openTab({
                        app: this.app,
                        doc: {id: rootId},
                    });
                } catch (e) {
                    logger.warn("desktop open tab fail", e);
                    failed++;
                    continue;
                }
                // 桌面端连续 openTab 时稍作等待，让思源完成页签创建与状态更新
                await this.sleep(TAB_SETTLE_MS);
            }
            attempted.push(rootId);
            openedKeys.add(rootId);
            openedKeys.add(fav.key);
        }
        const verified = await this.waitForTabStates(attempted, true);
        const count = verified.size;
        failed += attempted.length - count;
        if (count > 0) {
            const message = failed > 0
                ? this.i18n.groupTabsOpenedPartial.replace("{x}", String(count)).replace("{y}", String(failed))
                : this.i18n.groupTabsOpened.replace("{x}", String(count));
            showMessage(message, MESSAGE_DEFAULT_MS, failed > 0 ? "error" : "info");
        } else if (failed > 0) {
            showMessage(this.i18n.groupTabsPartial.replace("{x}", String(failed)), MESSAGE_DEFAULT_MS, "error");
        } else {
            showMessage(this.i18n.groupTabsNoChanges);
        }
        return count;
    }

    // 一键关闭组内已打开的页签：按 pinKey 匹配当前打开页签，返回实际关闭数
    private async closeGroupTabs(items: IFavoriteItem[]): Promise<number> {
        if (this.groupOperationBusy) {
            showMessage(this.i18n.groupTabsInProgress);
            return 0;
        }
        this.groupOperationBusy = true;
        try {
            return await this.closeGroupTabsInternal(items);
        } finally {
            this.groupOperationBusy = false;
        }
    }

    private async closeGroupTabsInternal(items: IFavoriteItem[]): Promise<number> {
        const keys = new Set(items.map((fav) => resolveFavoriteRootId(fav)).filter(Boolean));
        const opened = this.currentTabs();
        const targets = opened.filter((tab) => keys.has(this.pinKeyOf(tab)));
        let failed = 0;
        const attempted: string[] = [];
        for (const tab of targets) {
            // 仅统计真正关闭成功的页签，失败不计入提示数
            const rootId = this.rootIdOf(tab);
            if (rootId && await this.closeTabQuietly(tab)) {
                attempted.push(tab.id);
            } else {
                failed++;
            }
        }
        const verified = await this.waitForTabStates(attempted, false, true);
        const closed = verified.size;
        failed += attempted.length - closed;
        if (closed > 0) {
            const message = failed > 0
                ? this.i18n.groupTabsClosedPartial.replace("{x}", String(closed)).replace("{y}", String(failed))
                : this.i18n.groupTabsClosed.replace("{x}", String(closed));
            showMessage(message, MESSAGE_DEFAULT_MS, failed > 0 ? "error" : "info");
        } else if (failed > 0) {
            showMessage(this.i18n.groupTabsPartial.replace("{x}", String(failed)), MESSAGE_DEFAULT_MS, "error");
        } else {
            showMessage(this.i18n.groupTabsNoChanges);
        }
        return closed;
    }
}
