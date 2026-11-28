import {Dialog} from "siyuan";
import {logger} from "../logger";
import {clampNum, normalizeSortBy} from "../util";
import {sanitizeQuickActions} from "../quick-actions";
import {buildSettingsAppearance, buildSettingsBehavior, buildSettingsPanels, buildSettingsMobile, buildSettingsFloatingBall, buildSettingsJournal, buildSettingsFavorites, buildSettingsQuickActions, buildSettingsDocumentSets, buildSettingsStorage} from "../settings-sections";
import {summarizeHomeStoreDependencies} from "../home-store-model";
import {collectSettingsSearchEntries, collectEntryGroups, searchSettingsIndex} from "../settings-search-model";
import {bindSettingControlSemantics} from "../settings-control-dom";
import {normalizeSurfaceId, normalizeSurfaceContext} from "../platform-surface-model";
import {createPlatformKbd, createPlatformSegmented, mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap, mountPlatformDialogMobileClose} from "../platform-dom";
import {normalizeSettings, resolvePanelSize} from "../settings-model";
import {DIALOG_WIDTH_MIN_PX, DIALOG_WIDTH_MAX_PX, DIALOG_HEIGHT_MIN_PX, DIALOG_HEIGHT_MAX_PX, THUMB_HEIGHT_MIN_PX, THUMB_HEIGHT_MAX_PX, MOBILE_THUMB_HEIGHT_MIN_PX, MOBILE_THUMB_HEIGHT_MAX_PX, COLUMNS_MIN, COLUMNS_MAX, MOBILE_COLUMNS_MIN, MOBILE_COLUMNS_MAX, SETTINGS_KEY, QUICK_ACTIONS_KEY, QUICK_ACTIONS_MAX, DEFAULT_HOTKEY, LEGACY_HOTKEY, PANEL_SCALE_MIN, PANEL_SCALE_MAX, PANEL_SIZE_MIN_PX, SETTINGS_PANEL_SCALE, PLUGIN_VERSION_BADGE} from "../constants";
import {getSiyuan} from "../types";
import {type PlatformSurface, type PlatformSurfaceContext, SORT_BY_LIST, DEFAULT_SETTINGS, DOCK_DISPLAY_LIST, SIDEBAR_LAYOUT_LIST, type ISwSettings, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface SettingsHostRuntime extends Omit<ISpeedSwitchHost, "notifySettingsSaveState" | "fixLegacyHotkey" | "getSettings" | "computeSettings" | "updateSettings" | "applySkin" | "applyDensity" | "clampNum" | "num" | "rangeNumber" | "select" | "switcher" | "settingGroupTitle" | "settingGroupCard" | "settingSegmented" | "settingItem" | "notebookSelect" | "openHomeWidgetGuide"> {}
export class SettingsHostRuntime {
    // T-7003：保存状态广播（设置弹窗监听刷新回执；document 缺失时静默跳过）。
    private notifySettingsSaveState() {
        if (typeof document === "object" && document) {
            document.dispatchEvent(new Event("sw-settings-save-state"));
        }
    }

    // T-7003：保存失败后的手动重试——用当前内存值重新排队落盘（走同一串行链）。
    retrySettingsSave() {
        if (this.isUnloading) return;
        void this.queueSave(SETTINGS_KEY, this.data[SETTINGS_KEY]);
    }

    // T-7003：分组恢复默认——keys 必须全部是已知默认设置字段（防止任意 key 注入），
    // 经 updateSettings 应用（自动入撤销栈、触发皮肤/密度等派生刷新）。
    resetSettingsToDefaults(keys: string[]): boolean {
        const defaults = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        for (const key of keys) {
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) return false;
            patch[key] = defaults[key];
        }
        if (Object.keys(patch).length === 0) return false;
        this.updateSettings(patch as Partial<ISwSettings>);
        this.settingsSceneReloader?.();
        return true;
    }

    // 旧版本默认快捷键 "⇧⌥S" 无法被思源热键匹配命中，且可能已持久化到快捷键配置中，
    // 加载时将其修正为可匹配的 "⌥⇧S"（组合键不变，仍是 Alt+Shift+S）
    private fixLegacyHotkey() {
        try {
            const siyuan = getSiyuan();
            const keymapItem = siyuan?.config?.keymap?.plugin?.[this.name]?.switchTabs;
            if (keymapItem && keymapItem.custom === LEGACY_HOTKEY) {
                keymapItem.custom = DEFAULT_HOTKEY;
            }
        } catch (e) {
            // 配置不可用时忽略，默认值本身已是正确顺序
        }
    }

    // 设置对象记忆化：规范化成本虽小但调用频次高（渲染/绑定路径每次都会读取），
    // 命中缓存时零开销返回；updateSettings 写入后统一失效
    private getSettings(): ISwSettings {
        if (!this.settingsCache) {
            this.settingsCache = this.computeSettings();
        }
        return this.settingsCache;
    }

    private computeSettings(): ISwSettings {
        // 磁盘读取的是 unknown，老版本/异常数据字段可能缺失，全部按字段逐一降级到默认值。
        // 用 Partial<ISwSettings> 把整个 saved 一次性收窄，后续字段访问就不再需要每行断言。
        const saved = this.data[SETTINGS_KEY];
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {...DEFAULT_SETTINGS};
        return normalizeSettings(saved, {
            defaults: DEFAULT_SETTINGS,
            clamp: (value: unknown, min: number, max: number, fallback: number) => this.clampNum(value, min, max, fallback),
            normalizeEnum: (value: unknown, allowed: readonly string[], fallback: string) => normalizeSortBy(value, allowed, fallback),
            ranges: {
                dialogWidth: [DIALOG_WIDTH_MIN_PX, DIALOG_WIDTH_MAX_PX],
                dialogHeight: [DIALOG_HEIGHT_MIN_PX, DIALOG_HEIGHT_MAX_PX],
                panelScale: [PANEL_SCALE_MIN, PANEL_SCALE_MAX],
                homeWidth: [480, 1920],
                homeHeight: [360, 1280],
                studioWidth: [480, 1920],
                studioHeight: [360, 1280],
                columns: [COLUMNS_MIN, COLUMNS_MAX],
                thumbHeight: [THUMB_HEIGHT_MIN_PX, THUMB_HEIGHT_MAX_PX],
                mobileColumns: [MOBILE_COLUMNS_MIN, MOBILE_COLUMNS_MAX],
                mobileThumbHeight: [MOBILE_THUMB_HEIGHT_MIN_PX, MOBILE_THUMB_HEIGHT_MAX_PX],
            },
            sortBy: SORT_BY_LIST,
            dockDisplay: DOCK_DISPLAY_LIST,
            sidebarLayout: SIDEBAR_LAYOUT_LIST,
            quickActions: () => sanitizeQuickActions(this.data[QUICK_ACTIONS_KEY], QUICK_ACTIONS_MAX).items,
        }) as ISwSettings;
    }

    private updateSettings(patch: Partial<ISwSettings>) {
        const previous = this.getSettings();
        const settings = {...previous, ...patch};
        this.data[SETTINGS_KEY] = settings;
        this.settingsCache = null; // 设置已变更，下一次读取重新规范化
        this.saveDataDebounced(SETTINGS_KEY);
        // T-7003：撤销栈——把「逆向补丁」（本次 patch 各 key 的变更前值）交给设置页
        // 钩子；lastSettingsTab 是导航记忆不是用户变更，不入栈；撤销应用本身经
        // settingsUndoSuppress 抑制。逆向值取自规范化后的当前设置，与任何保存同语义。
        const patchKeys = Object.keys(patch).filter((key) => key !== "lastSettingsTab");
        if (patchKeys.length > 0 && this.settingsUndoRecorder && !this.settingsUndoSuppress) {
            const previousRecord = previous as unknown as Record<string, unknown>;
            const inverse: Record<string, unknown> = {};
            for (const key of patchKeys) inverse[key] = previousRecord[key];
            this.settingsUndoRecorder(inverse);
        }
        if (patchKeys.length > 0 && typeof document === "object" && document) {
            // T-7003：设置变更广播——外部入口改设置时，打开中的设置弹窗据此带现场重建。
            document.dispatchEvent(new Event("sw-settings-updated"));
        }
        if (Object.prototype.hasOwnProperty.call(patch, "skin")) {
            this.applySkin();
        }
        if (Object.prototype.hasOwnProperty.call(patch, "density")) {
            this.applyDensity();
        }
        if (Object.keys(patch).some((key) => key !== "lastSettingsTab")) {
            this.refreshOpenSwitchers();
            if (this.sidebarElement?.isConnected) {
                this.refreshSidebar();
            }
        }
        if (Object.prototype.hasOwnProperty.call(patch, "floatingBall")) {
            this.updateFloatingBallVisibility();
            if (typeof document === "object") {
                document.querySelector<HTMLElement>(".sw-floating-ball-settings")
                    ?.dispatchEvent(new Event("sw-floating-ball-refresh"));
            }
        }
        if (Object.prototype.hasOwnProperty.call(patch, "savedSearches")) {
            this.refreshFloatingBallPanels();
            if (typeof document === "object") {
                document.querySelector<HTMLElement>(".sw-floating-ball-settings")
                    ?.dispatchEvent(new Event("sw-floating-ball-refresh"));
            }
        }
    }

    private applySkin(): void {
        if (typeof document === "undefined" || !document.body) return;
        const skin = this.getSettings().skin || "fusion";
        if (skin === "fusion") {
            delete document.body.dataset.swSkin;
        } else {
            document.body.dataset.swSkin = skin;
        }
    }

    // T-6823 密度档位：comfortable（默认，现状）| compact（紧凑行高/间距）。
    // 与皮肤同机制：body 只放标记，SCSS 按标记覆盖间距变量；卸载移除。
    private applyDensity(): void {
        if (typeof document === "undefined" || !document.body) return;
        if (this.getSettings().density === "compact") {
            document.body.dataset.swDensity = "compact";
        } else {
            delete document.body.dataset.swDensity;
        }
    }

    private clampNum(value: any, min: number, max: number, fallback: number): number {
        // 委派到 util.clampNum（pure，便于单元测试）；class 内保留方法签名以便现有调用点不变
        return clampNum(value, min, max, fallback);
    }

    // T-6999：面板窗口预览入口——设置页「面板」标签从这里打开对应面板查看当前
    // 尺寸效果。走 openPlatformSurface 统一管线（单例守卫、FAB 串行释放、会话记录）；
    // 设置弹窗保持打开叠在下层，关闭预览面板即回到设置现场。
    openPanelPreview(surface: "switcher" | "workbench" | "studio") {
        if (this.isUnloading) return;
        if (surface === "studio" && this.isMobile) return;
        this.openPlatformSurface(surface, "switcher");
    }

    // 数字输入：右侧带单位标签，change 时经 clampNum 校验后回调；label 用于读屏与移动端语义
    private num(value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, label?: string): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "sw-settings__num";
        const input = document.createElement("input");
        input.className = "b3-text-field fn__flex-center";
        input.type = "number";
        input.inputMode = "numeric";
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        if (label) {
            input.setAttribute("aria-label", label);
        }
        input.addEventListener("change", () => {
            const normalized = this.clampNum(input.value, min, max, value);
            input.value = String(normalized);
            onChange(normalized);
        });
        const unitEl = document.createElement("span");
        unitEl.className = "sw-settings__num-unit";
        unitEl.textContent = unit;
        wrap.appendChild(input);
        wrap.appendChild(unitEl);
        return wrap;
    }

    private rangeNumber(value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, label?: string): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "sw-settings__range-number";
        const range = document.createElement("input");
        range.type = "range";
        range.className = "sw-settings__range";
        range.min = String(min);
        range.max = String(max);
        range.step = String(step);
        range.value = String(value);
        if (label) range.setAttribute("aria-label", `${label} · ${this.i18n.settingsControlSlider || "Slider"}`);
        const numeric = document.createElement("input");
        numeric.className = "b3-text-field fn__flex-center sw-settings__range-value";
        numeric.type = "number";
        numeric.inputMode = "numeric";
        numeric.min = String(min);
        numeric.max = String(max);
        numeric.step = String(step);
        numeric.value = String(value);
        if (label) numeric.setAttribute("aria-label", `${label} · ${this.i18n.settingsControlNumber || "Number"}`);
        const unitEl = document.createElement("span");
        unitEl.className = "sw-settings__num-unit";
        unitEl.textContent = unit;
        const sync = (raw: unknown) => {
            const normalized = this.clampNum(raw, min, max, value);
            range.value = String(normalized);
            numeric.value = String(normalized);
            return normalized;
        };
        const apply = (raw: unknown) => {
            const normalized = sync(raw);
            onChange(normalized);
        };
        range.addEventListener("input", () => sync(range.value));
        range.addEventListener("change", () => apply(range.value));
        numeric.addEventListener("change", () => apply(numeric.value));
        wrap.append(range, numeric, unitEl);
        return wrap;
    }

    // 下拉选择控件
    private select(options: Array<{value: string, label: string}>, value: string, onChange: (v: string) => void): HTMLElement {
        const selectEl = document.createElement("select");
        selectEl.className = "b3-select fn__flex-center";
        options.forEach(({value: v, label}) => {
            const option = document.createElement("option");
            option.value = v;
            option.textContent = label;
            selectEl.appendChild(option);
        });
        selectEl.value = value;
        selectEl.addEventListener("change", () => onChange(selectEl.value));
        return selectEl;
    }

    // 行容器用 div：开关本身是 label（b3-switch 标准结构 input+span），label 不可嵌套
    private switcher(checked: boolean, onChange: (v: boolean) => void): HTMLElement {
        const label = document.createElement("label");
        label.className = "sw-switch";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = checked;
        input.addEventListener("change", () => onChange(input.checked));
        label.appendChild(input);
        label.appendChild(document.createElement("span"));
        return label;
    }

    // T-6872（RZ-2）：设置分组标题——组卡片的上一级说明（小号大写字距弱化）
    private settingGroupTitle(text: string): HTMLElement {
        const el = document.createElement("div");
        el.className = "sw-settings__group-title";
        el.textContent = text;
        return el;
    }

    // T-6872（RZ-2）：分组卡片容器——组内行共享一张卡（hairline 分隔 + hover 提亮）
    private settingGroupCard(...children: HTMLElement[]): HTMLElement {
        const card = document.createElement("div");
        card.className = "sw-settings__group-card";
        card.append(...children);
        return card;
    }

    // T-6872（RZ-2）：分段控件设置行——2~4 个互斥取值用分段而非下拉（取值可见、一次切换）
    private settingSegmented(title: string, description: string | undefined, items: Array<{value: string, label: string}>, current: string, onChange: (value: string) => void): HTMLElement {
        const control = createPlatformSegmented(document, {items, active: current, onChange, ariaLabel: title});
        return this.settingItem(title, description, control);
    }

    // T-7166：设置行标题/说明与控件的可访问名称关联——标题 id 由 settingItem 统一
    // 分发并注入 action 内的表单控件（select/input/label>input），双语标题即控件名称。
    private settingItem(title: string, description: string | undefined, action: HTMLElement, column = false): HTMLElement {
        const item = document.createElement("div");
        item.className = column ? "sw-settings__item sw-settings__item--column" : "sw-settings__item";
        const main = document.createElement("div");
        main.className = "sw-settings__item-main";
        const seq = ++this.settingTitleSeq;
        const titleId = `sw-set-title-${seq}`;
        const titleEl = document.createElement("div");
        titleEl.className = "sw-settings__item-title";
        titleEl.id = titleId;
        titleEl.textContent = title;
        main.appendChild(titleEl);
        let descriptionEl: HTMLElement | null = null;
        let descId: string | null = null;
        if (description) {
            descId = `sw-set-desc-${seq}`;
            const desc = document.createElement("div");
            desc.className = "sw-settings__item-desc";
            desc.id = descId;
            desc.textContent = description;
            main.appendChild(desc);
            descriptionEl = desc;
        }
        const actionEl = document.createElement("div");
        actionEl.className = "sw-settings__item-action";
        actionEl.appendChild(action);
        // 关联目标：控件本体（select/input）或 label 包裹的输入（switcher）
        const control = action.tagName === "SELECT" || action.tagName === "INPUT"
            ? action
            : action.querySelector<HTMLElement>("select, input");
        if (control) {
            control.setAttribute("aria-labelledby", titleId);
            if (descId) control.setAttribute("aria-describedby", descId);
        }
        item.appendChild(main);
        item.appendChild(actionEl);
        bindSettingControlSemantics(item, titleEl, descriptionEl, action, {
            slider: this.i18n.settingsControlSlider || "Slider",
            number: this.i18n.settingsControlNumber || "Number",
        });
        return item;
    }

    // 默认日记笔记本下拉（异步填充已打开笔记本，当前值命中时回填选中）
    private notebookSelect(current: string, onPick: (id: string) => void): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "sw-settings__journal-sel";
        const sel = document.createElement("select");
        sel.className = "b3-select fn__flex-center";
        sel.disabled = true; // 加载完成前禁用
        sel.appendChild(new Option(this.i18n.notebookLoading, ""));
        wrap.appendChild(sel);
        // T-7185：失败可区分——内核读取失败展示失败回执 + 重试，不再与真空笔记本同形。
        this.loadNotebooksDetailed().then(({notebooks, failed}) => {
            sel.innerHTML = "";
            if (failed) {
                sel.appendChild(new Option(this.i18n.notebookLoadFailed, ""));
                sel.disabled = true;
                const retry = document.createElement("button");
                retry.type = "button";
                retry.className = "b3-button b3-button--text sw-settings__journal-retry";
                retry.textContent = this.i18n.homeRetry;
                retry.setAttribute("aria-label", this.i18n.homeRetry);
                retry.addEventListener("click", () => {
                    retry.remove();
                    sel.disabled = true;
                    sel.innerHTML = "";
                    sel.appendChild(new Option(this.i18n.notebookLoading, ""));
                    this.loadNotebooks().then((retryNotebooks) => {
                        sel.innerHTML = "";
                        sel.appendChild(new Option(this.i18n.notebookPlaceholder, ""));
                        retryNotebooks.forEach((nb) => {
                            const opt = new Option(nb.name, nb.id);
                            opt.title = nb.name;
                            sel.appendChild(opt);
                        });
                        sel.value = retryNotebooks.some((nb) => nb.id === current) ? current : "";
                        sel.disabled = false;
                    });
                });
                wrap.appendChild(retry);
                return;
            }
            sel.appendChild(new Option(this.i18n.notebookPlaceholder, ""));
            notebooks.forEach((nb) => {
                const opt = new Option(nb.name, nb.id);
                opt.title = nb.name;
                sel.appendChild(opt);
            });
            sel.value = notebooks.some((nb) => nb.id === current) ? current : "";
            sel.disabled = false;
        });
        sel.addEventListener("change", () => onPick(sel.value));
        return wrap;
    }

    // 打开/创建当日日记：默认日记本未设置时先弹出下拉选择
    // 快速记录：Flomo 式弹窗，输入一句追加到今日日记末尾（未配置日记本时先让用户选择）
    // 商店实时预览：以默认尺寸渲染真实组件（数据与面板同源），关闭窗口即释放实例
    private openHomeWidgetGuide() {
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            title: this.i18n.homeStoreGuideTitle,
            content: '<div class="speed-switch sw-home-store-guide"></div>',
            width: this.isMobile ? "min(520px, 94vw)" : "min(720px, 76vw)",
            height: this.isMobile ? "min(640px, 82vh)" : "min(620px, 78vh)",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.homeStoreGuideTitle || "组件指南", "", "iconHelp");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());
        const root = dialog.element.querySelector<HTMLElement>(".sw-home-store-guide");
        // 宿主主题可能改写 Dialog 内容；没有根节点时销毁空壳，避免留下
        // 无法关闭的遮罩层。
        if (!root) {
            dialog.destroy();
            return;
        }
        const hint = document.createElement("p");
        hint.className = "sw-home-store-guide__hint";
        hint.textContent = this.i18n.homeStoreGuideHint;
        root.appendChild(hint);
        const link = document.createElement("a");
        link.className = "b3-button b3-button--outline sw-home-store-guide__link";
        link.href = "https://github.com/xiaolv-suite/siyuan-speed-switch/blob/main/docs/component-store-guide.md";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = this.i18n.homeStoreGuide;
        root.appendChild(link);
        const note = document.createElement("p");
        note.className = "sw-home-store-guide__note";
        note.textContent = "docs/component-store-guide.md";
        root.appendChild(note);

        const dependencyTitle = document.createElement("h3");
        dependencyTitle.className = "sw-home-store-guide__dependency-title";
        dependencyTitle.textContent = this.i18n.homeStoreDependencyTitle;
        root.appendChild(dependencyTitle);
        const dependencySummary = summarizeHomeStoreDependencies();
        const dependencySummaryText = document.createElement("p");
        dependencySummaryText.className = "sw-home-store-guide__dependency-summary";
        dependencySummaryText.textContent = this.i18n.homeStoreDependencySummary.replace("{total}", String(dependencySummary.total)).replace("{required}", String(dependencySummary.required)).replace("{optional}", String(dependencySummary.optional));
        root.appendChild(dependencySummaryText);
        const dependencyList = document.createElement("ul");
        dependencyList.className = "sw-home-store-guide__dependency-list";
        dependencyList.setAttribute("aria-label", this.i18n.homeStoreDependencyListLabel);
        dependencySummary.entries.forEach(({info}) => {
            const item = document.createElement("li");
            item.className = `sw-home-store-guide__dependency-item is-${info.required ? "required" : "optional"}`;
            const name = document.createElement("strong");
            name.textContent = info.name;
            item.appendChild(name);
            const badge = document.createElement("span");
            badge.className = "sw-home-store-guide__dependency-badge";
            badge.textContent = info.required ? this.i18n.homeStoreDependencyRequired : this.i18n.homeStoreDependencyOptional;
            item.appendChild(badge);
            const setup = document.createElement("span");
            setup.className = "sw-home-store-guide__dependency-setup";
            setup.textContent = info.setup;
            item.appendChild(setup);
            if (info.installUrl) {
                const install = document.createElement("a");
                install.href = info.installUrl;
                install.target = "_blank";
                install.rel = "noopener noreferrer";
                install.textContent = this.i18n.homeStoreDependencyInstall;
                install.setAttribute("aria-label", this.i18n.homeStoreDependencyInstallAria.replace("{name}", info.name));
                item.appendChild(install);
            }
            dependencyList.appendChild(item);
        });
        root.appendChild(dependencyList);
        const dependencyLink = document.createElement("a");
        dependencyLink.className = "b3-button b3-button--outline sw-home-store-guide__dependency-link";
        dependencyLink.href = "https://github.com/xiaolv-suite/siyuan-speed-switch/blob/main/docs/external-component-installation.md";
        dependencyLink.target = "_blank";
        dependencyLink.rel = "noopener noreferrer";
        dependencyLink.textContent = this.i18n.homeStoreDependencyLink;
        root.appendChild(dependencyLink);
    }

    // T-7236：共享快速开始说明。它使用本地 DOM，不依赖网络，也不改变当前
    // 表面的搜索/编辑现场；帮助入口始终可见，用户可以随时重新查看。
    public openPlatformGuide(surface: PlatformSurface = "switcher") {
        if (this.platformGuideDialog?.element.isConnected) {
            this.platformGuideDialog.element.querySelector<HTMLElement>(".sw-platform-guide__close")?.focus({preventScroll: true});
            return;
        }
        const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        let handleGuideEscape: ((event: KeyboardEvent) => void) | null = null;
        let unsubGuideKeydown: (() => void) | null = null;
        const dialog = new Dialog({
            title: this.i18n.platformGuideTitle || "快速开始",
            content: '<div class="sw-platform-guide"></div>',
            width: this.isMobile ? "min(520px, 94vw)" : "min(760px, 78vw)",
            height: this.isMobile ? "min(680px, 86vh)" : "min(620px, 78vh)",
            destroyCallback: () => {
                unsubGuideKeydown?.();
                unsubGuideKeydown = null;
                if (handleGuideEscape) {
                    window.removeEventListener("keydown", handleGuideEscape, true);
                    handleGuideEscape = null;
                }
                if (this.platformGuideDialog === dialog) this.platformGuideDialog = null;
                if (!this.isUnloading && returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
            },
        });
        this.platformGuideDialog = dialog;
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-platform-dialog", "sw-platform-dialog--guide");
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.platformGuideTitle || "快速开始", "", "iconHelp");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "退出");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());
        const root = dialog.element.querySelector<HTMLElement>(".sw-platform-guide");
        if (!root) {
            dialog.destroy();
            return;
        }
        handleGuideEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            dialog.destroy();
        };
        unsubGuideKeydown = this.disposer.trackListener(window, "keydown", handleGuideEscape as any, true);
        const close = document.createElement("button");
        close.type = "button";
        close.className = "b3-button b3-button--outline sw-platform-guide__close";
        close.textContent = this.i18n.platformGuideClose || this.i18n.close || "关闭";
        close.addEventListener("click", () => {
            unsubGuideKeydown?.();
            unsubGuideKeydown = null;
            dialog.destroy();
        });
        const intro = document.createElement("p");
        intro.className = "sw-platform-guide__intro";
        intro.textContent = this.i18n.platformGuideIntro;
        root.append(intro);
        const sections: Array<{surface?: PlatformSurface; title: string; steps: string[]}> = [
            {surface: "switcher", title: this.i18n.platformGuideSwitcherTitle || "第一面板 · 切换器", steps: [this.i18n.platformGuideSwitcherStep1, this.i18n.platformGuideSwitcherStep2, this.i18n.platformGuideSwitcherStep3]},
            {surface: "workbench", title: this.i18n.platformGuideWorkbenchTitle || "第二面板 · 工作台", steps: [this.i18n.platformGuideWorkbenchStep1, this.i18n.platformGuideWorkbenchStep2, this.i18n.platformGuideWorkbenchStep3]},
            {surface: "studio", title: this.i18n.platformGuideStudioTitle || "第三面板 · 片段实验室", steps: [this.i18n.platformGuideStudioStep1, this.i18n.platformGuideStudioStep2, this.i18n.platformGuideStudioStep3]},
            {title: this.i18n.platformGuideFloatingBallTitle || "悬浮球 · 全局入口", steps: [this.i18n.platformGuideFloatingBallStep1, this.i18n.platformGuideFloatingBallStep2, this.i18n.platformGuideFloatingBallStep3]},
        ];
        sections.forEach((section) => {
            const article = document.createElement("section");
            article.className = `sw-platform-guide__section${section.surface === surface ? " is-current" : ""}`;
            const heading = document.createElement("h3");
            heading.textContent = section.title;
            article.appendChild(heading);
            const list = document.createElement("ol");
            section.steps.forEach((step) => {
                const item = document.createElement("li");
                item.textContent = step;
                list.appendChild(item);
            });
            article.appendChild(list);
            root.appendChild(article);
        });

        // T-7839: 全表面统一快捷键 CheatSheet 速查看板 (CAND-11)
        const cheatsheet = document.createElement("section");
        cheatsheet.className = "sw-platform-guide__cheatsheet";
        const csHeading = document.createElement("h3");
        csHeading.textContent = "⌨️ " + (this.i18n.platformCheatSheetTitle || "快捷键速查");
        cheatsheet.appendChild(csHeading);
        const csGrid = document.createElement("div");
        csGrid.className = "sw-platform-guide__shortcuts-grid";
        const shortcutTables = [
            {title: "切换器", items: [["1~9", "直达"], ["Tab", "画板"], ["Alt+↵", "下分屏"], ["Ctrl+↵", "右分屏"], ["Alt+C", "链接"], ["Alt+D", "收藏"], ["/", "搜索"], ["?", "帮助"], ["Esc", "退出"]]},
            {title: "工作台", items: [["Ctrl+B", "编辑"], ["F/C/M", "尺寸"], ["Ctrl+Z/Y", "撤销"]]},
            {title: "片段实验室", items: [["Ctrl+S", "保存"], ["Ctrl+Shift+D", "诊断"], ["F2", "微调"], ["Alt+↑/↓", "调序"]]},
            {title: "悬浮球", items: [["单击/双击", "轮盘/闪念"], ["快滑", "指令"], ["1~9", "直达"]]},
        ];
        shortcutTables.forEach((table) => {
            const card = document.createElement("div");
            card.className = "sw-platform-guide__shortcut-card";
            const cardTitle = document.createElement("strong");
            cardTitle.className = "sw-platform-guide__shortcut-title";
            cardTitle.textContent = table.title;
            card.appendChild(cardTitle);
            const dl = document.createElement("dl");
            dl.className = "sw-platform-guide__shortcut-list";
            table.items.forEach(([k, desc]) => {
                const dt = document.createElement("dt");
                dt.className = "sw-platform-guide__key";
                dt.appendChild(createPlatformKbd(document, k));
                const dd = document.createElement("dd");
                dd.className = "sw-platform-guide__desc";
                dd.textContent = desc;
                dl.append(dt, dd);
            });
            card.appendChild(dl);
            csGrid.appendChild(card);
        });
        cheatsheet.appendChild(csGrid);
        root.appendChild(cheatsheet);

        const footer = document.createElement("p");
        footer.className = "sw-platform-guide__footer";
        const shortcuts = this.getPlatformShortcutBindings();
        footer.textContent = (this.i18n.platformGuideSettings)
            .replace("{switcher}", shortcuts.switcher)
            .replace("{workbench}", shortcuts.workbench);
        root.append(footer, close);
        close.focus({preventScroll: true});
        requestAnimationFrame(() => {
            if (close.isConnected) close.focus({preventScroll: true});
        });
    }

    // 插件设置页（设置 → 插件 → 小驴雷切 → 设置图标）
    // 布局：左侧标签栏（外观/行为/面板/收藏/手机端）+ 右侧分组面板，点击标签切换
    // T-7012：returnTo 是打开设置时的平台表面；设置关闭后恢复该表面
    // （不固定回切换器）。无面板来源的入口（顶栏/悬浮球/侧栏）不传，行为不变。
    openSetting(initialPanel?: string, returnTo?: PlatformSurface | null, returnContext?: PlatformSurfaceContext | null) {
        if (typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err) => {
                logger.warn("openSetting tier2 load fail", err);
            });
        }
        const restoreSurface = normalizeSurfaceId(returnTo || "", "");
        const restoreContext = normalizeSurfaceContext(returnContext);
        const panelKeys = ["appearance", "behavior", "panels", "favorites", "quickActions", "floatingBall", "documentSets", "journal", "mobile", "storage"] as const;
        const panelLabels: Record<string, string> = {
            appearance: this.i18n.secAppearance,
            behavior: this.i18n.secBehavior,
            panels: this.i18n.secPanels,
            favorites: this.i18n.secFavorites,
            quickActions: this.i18n.secQuickActions,
            floatingBall: this.i18n.secFloatingBall,
            documentSets: this.i18n.secDocumentSets,
            journal: this.i18n.secJournal,
            mobile: this.i18n.secMobile,
            storage: this.i18n.secStorage,
        };

        // T-6479：设置弹窗的 resize 监听释放改挂宿主 destroyCallback（不再覆写 dialog.destroy）。
        let releaseSettingsDialog: () => void = () => undefined;
        let releaseSettingsFab: () => void = () => undefined;
        // T-7003：设置页回执/撤销/外部重建的监听器释放（openSetting 后段装配）
        let releaseSettingsListeners: () => void = () => undefined;
        // 输入法视口守卫释放（移动端软键盘避让）
        let releaseKeyboardViewport: (() => void) | undefined;
        const dialog = new Dialog({
            title: this.i18n.settings,
            content: '<div class="sw-settings"></div>',
            destroyCallback: () => {
                releaseSettingsDialog();
                releaseSettingsFab();
                releaseSettingsListeners();
                releaseKeyboardViewport?.();
                releaseKeyboardViewport = undefined;
                this.activeIconPickerCleanup?.();
                this.activeIconPickerCleanup = null;
                if (this.settingsDialog === dialog) this.settingsDialog = null;
                // T-7003：弹窗销毁即摘除撤销/重建钩子，其他入口回归零开销
                this.settingsUndoRecorder = null;
                this.settingsSceneReloader = null;
                // T-7012：设置互返——从平台表面打开时，关闭后恢复该表面；
                // 面板重开走 openPlatformSurface 的单例守卫与 FAB 串行释放。
                if (restoreSurface && !this.isUnloading) {
                    this.openPlatformSurface(restoreSurface, "switcher", {
                        entry: "back",
                        ...(restoreContext?.objectKind ? {objectKind: restoreContext.objectKind} : {}),
                        ...(restoreContext?.objectId ? {objectId: restoreContext.objectId} : {}),
                        ...(restoreContext?.query ? {query: restoreContext.query} : {}),
                        ...(restoreContext?.focusSource ? {focusSource: restoreContext.focusSource} : {}),
                    });
                }
            },
            // 桌面端独立采用 70% 视口自适应（不与第一面板的 panelScale 联动）；手机端按视口收缩，避免溢出屏幕
            width: this.isMobile ? "min(720px, 88vw)" : `${resolvePanelSize({...this.getSettings(), panelSizeMode: "adaptive", panelScale: SETTINGS_PANEL_SCALE}, {width: window.innerWidth, height: window.innerHeight, minWidth: PANEL_SIZE_MIN_PX, minHeight: PANEL_SIZE_MIN_PX}).width}px`,
            height: this.isMobile ? "min(560px, 85vh)" : `${resolvePanelSize({...this.getSettings(), panelSizeMode: "adaptive", panelScale: SETTINGS_PANEL_SCALE}, {width: window.innerWidth, height: window.innerHeight, minWidth: PANEL_SIZE_MIN_PX, minHeight: PANEL_SIZE_MIN_PX}).height}px`,
        });
        releaseSettingsFab = this.suspendFABForDialog();
        this.settingsDialog = dialog;

        const root = dialog.element.querySelector<HTMLElement>(".sw-settings");
        if (!root) {
            dialog.destroy();
            return;
        }
        dialog.element.classList.add("sw-dialog-host");
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-settings-dialog");
        // 移动端软键盘视口守卫：键盘弹起同步 --lv-vv-h 并标记 lv-keyboard-open（CSS 收缩容器高度）
        if (this.isMobile && typeof window !== "undefined" && window.visualViewport) {
            const vv = window.visualViewport;
            let baseHeight = Math.max(window.innerHeight || 0, Math.round(vv.height || 0));
            const syncKeyboardViewport = () => {
                if (!dialog.element?.isConnected) return;
                const currentInner = window.innerHeight || 0;
                const currentH = Math.round(vv.height || currentInner);
                if (currentH > baseHeight) baseHeight = currentH;
                dialog.element.style.setProperty("--lv-vv-h", `${currentH}px`);
                const keyboardOpen = Math.max(baseHeight, currentInner) - currentH > 110;
                dialog.element.classList.toggle("lv-keyboard-open", keyboardOpen);
            };
            syncKeyboardViewport();
            vv.addEventListener("resize", syncKeyboardViewport);
            vv.addEventListener("scroll", syncKeyboardViewport, { passive: true });
            window.addEventListener("resize", syncKeyboardViewport, { passive: true });
            releaseKeyboardViewport = () => {
                vv.removeEventListener("resize", syncKeyboardViewport);
                vv.removeEventListener("scroll", syncKeyboardViewport);
                window.removeEventListener("resize", syncKeyboardViewport);
            };
        }
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.settings || "设置", PLUGIN_VERSION_BADGE, "iconSettings");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());

        const tabs = document.createElement("div");
        tabs.className = "sw-settings__tabs";
        tabs.setAttribute("role", "tablist");
        tabs.setAttribute("aria-label", this.i18n.settings);
        const horizontalTabs = typeof window === "object" && typeof window.matchMedia === "function"
            && window.matchMedia("(max-width: 680px)").matches;
        tabs.setAttribute("aria-orientation", horizontalTabs ? "horizontal" : "vertical");
        const updateTabsOrientation = () => {
            const isHorizontal = typeof window === "object" && typeof window.matchMedia === "function"
                && window.matchMedia("(max-width: 680px)").matches;
            tabs.setAttribute("aria-orientation", isHorizontal ? "horizontal" : "vertical");
        };
        const onSettingsResize = () => updateTabsOrientation();
        if (typeof window === "object" && typeof window.addEventListener === "function") {
            window.addEventListener("resize", onSettingsResize);
        }
        let settingsDestroyed = false;
        releaseSettingsDialog = () => {
            if (settingsDestroyed) return;
            settingsDestroyed = true;
            if (typeof window === "object" && typeof window.removeEventListener === "function") {
                window.removeEventListener("resize", onSettingsResize);
            }
        };
        const panels = document.createElement("div");
        panels.className = "sw-settings__panels";

        const ensureTabVisible = (key: string, behavior: ScrollBehavior = "auto") => {
            const activeTab = tabs.querySelector<HTMLElement>(`.sw-settings__tab[data-panel="${key}"]`);
            if (!activeTab || tabs.scrollWidth <= tabs.clientWidth) return;
            const itemLeft = activeTab.offsetLeft;
            const itemRight = itemLeft + activeTab.offsetWidth;
            const edge = Math.max(12, Math.min(28, Math.floor(tabs.clientWidth * 0.12)));
            let nextLeft = tabs.scrollLeft;
            if (itemLeft < tabs.scrollLeft + edge) nextLeft = itemLeft - edge;
            else if (itemRight > tabs.scrollLeft + tabs.clientWidth - edge) nextLeft = itemRight - tabs.clientWidth + edge;
            nextLeft = Math.max(0, Math.min(nextLeft, tabs.scrollWidth - tabs.clientWidth));
            const reduceMotion = typeof window === "object" && typeof window.matchMedia === "function"
                && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const scrollBehavior: ScrollBehavior = reduceMotion ? "auto" : behavior;
            if (typeof tabs.scrollTo === "function") {
                try {
                    tabs.scrollTo({left: nextLeft, behavior: scrollBehavior});
                    return;
                } catch (_) {
                    // Older WebViews may reject the options object.
                }
            }
            tabs.scrollLeft = nextLeft;
        };

        // 切换分组：仅激活对应标签与面板，同步 aria-selected 供读屏感知；
        // persist=true 时记录最近选中的标签页（仅用户主动点击时写盘，避免打开设置就产生一次无效写入）
        const activate = (key: string, persist = false) => {
            if (key === "floatingBall") {
                panels.querySelector(".sw-floating-ball-settings")?.dispatchEvent(new Event("sw-floating-ball-refresh"));
            }
            tabs.querySelectorAll<HTMLElement>(".sw-settings__tab").forEach((tab) => {
                const active = tab.dataset.panel === key;
                tab.classList.toggle("is-active", active);
                tab.setAttribute("aria-selected", active ? "true" : "false");
                tab.tabIndex = active ? 0 : -1;
            });
            panels.querySelectorAll<HTMLElement>(".sw-settings__panel").forEach((p) => {
                const active = p.dataset.panel === key;
                p.classList.toggle("is-active", active);
                p.hidden = !active;
                p.setAttribute("aria-hidden", active ? "false" : "true");
            });
            if (persist) {
                this.updateSettings({lastSettingsTab: key});
            }
            this.scheduleAnimationFrame(() => ensureTabVisible(key, persist ? "smooth" : "auto"));
        };

        const activateByOffset = (currentKey: string, offset: number) => {
            const currentIndex = panelKeys.indexOf(currentKey as typeof panelKeys[number]);
            if (currentIndex < 0) return;
            const nextKey = panelKeys[(currentIndex + offset + panelKeys.length) % panelKeys.length];
            activate(nextKey, true);
            tabs.querySelector<HTMLButtonElement>(`.sw-settings__tab[data-panel="${nextKey}"]`)?.focus();
        };

        const builders: Record<string, () => HTMLElement> = {
            appearance: () => buildSettingsAppearance.call(this, this.getSettings()),
            behavior: () => buildSettingsBehavior.call(this, this.getSettings()),
            panels: () => buildSettingsPanels.call(this, this.getSettings()),
            favorites: () => buildSettingsFavorites.call(this, ),
            quickActions: () => buildSettingsQuickActions.call(this, ),
            floatingBall: () => buildSettingsFloatingBall.call(this, this.getSettings()),
            documentSets: () => buildSettingsDocumentSets.call(this, ),
            journal: () => buildSettingsJournal.call(this, this.getSettings()),
            mobile: () => buildSettingsMobile.call(this, this.getSettings()),
            storage: () => buildSettingsStorage.call(this),
        };

        // 构建标签栏与分组面板
        panelKeys.forEach((key) => {
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "sw-settings__tab";
            tab.setAttribute("role", "tab");
            tab.dataset.panel = key;
            tab.id = `sw-settings-tab-${key}`;
            tab.setAttribute("aria-controls", `sw-settings-panel-${key}`);
            tab.tabIndex = -1;
            tab.textContent = panelLabels[key];
            tab.addEventListener("click", () => activate(key, true));
            tab.addEventListener("keydown", (event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    activateByOffset(key, 1);
                } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    activateByOffset(key, -1);
                } else if (event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    const targetKey = event.key === "Home" ? panelKeys[0] : panelKeys[panelKeys.length - 1];
                    activate(targetKey, true);
                    tabs.querySelector<HTMLButtonElement>(`.sw-settings__tab[data-panel="${targetKey}"]`)?.focus();
                }
            });
            tabs.appendChild(tab);

            const panelEl = document.createElement("div");
            panelEl.className = "sw-settings__panel";
            panelEl.setAttribute("role", "tabpanel");
            panelEl.dataset.panel = key;
            panelEl.id = `sw-settings-panel-${key}`;
            panelEl.setAttribute("aria-labelledby", `sw-settings-tab-${key}`);
            panelEl.appendChild(builders[key]());
            panels.appendChild(panelEl);
        });

        root.appendChild(tabs);
        root.appendChild(panels);

        // T-6951：设置全局搜索——面板全量预构建后对生产 DOM 扫描一次建索引
        //（只收标题/描述/面板归属，不收 token 与用户值）；定位 = 切组 + 滚入视口 +
        // 聚焦真实控件 + 短暂强调。空查询回正常分组浏览。
        // T-7002：combobox 语义补全（aria-expanded/controls/activedescendant）、
        // 清空按钮、分组 chips 过滤与 `/`·Ctrl+K 直达（见下方接线）。
        const searchWrap = document.createElement("div");
        searchWrap.className = "sw-settings__search";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "sw-settings__search-input";
        searchInput.placeholder = this.i18n.settingsSearch;
        searchInput.setAttribute("aria-label", this.i18n.settingsSearch);
        searchInput.setAttribute("role", "combobox");
        searchInput.setAttribute("aria-autocomplete", "list");
        searchInput.setAttribute("aria-expanded", "false");
        searchInput.setAttribute("aria-controls", "sw-settings-search-results");
        const searchClear = document.createElement("button");
        searchClear.type = "button";
        searchClear.className = "sw-settings__search-clear";
        searchClear.textContent = "×";
        searchClear.setAttribute("aria-label", this.i18n.settingsSearchClear);
        searchClear.title = this.i18n.settingsSearchClear;
        searchClear.hidden = true;
        const searchChips = document.createElement("div");
        searchChips.className = "sw-settings__search-chips";
        searchChips.setAttribute("role", "group");
        searchChips.setAttribute("aria-label", this.i18n.settingsSearchFilter);
        searchChips.hidden = true;
        const searchResults = document.createElement("div");
        searchResults.className = "sw-settings__search-results";
        searchResults.id = "sw-settings-search-results";
        searchResults.setAttribute("role", "listbox");
        searchResults.setAttribute("aria-label", this.i18n.settingsSearch);
        searchResults.hidden = true;
        searchWrap.append(searchInput, searchClear, searchChips, searchResults);
        // 常驻面板滚动列顶部（sticky），tabs 栏保持原布局
        panels.insertBefore(searchWrap, panels.firstChild);

        const searchEntries = collectSettingsSearchEntries(panels, panelLabels);
        let searchMatches: typeof searchEntries = [];
        // T-7002：结果分组过滤 chips 的当前选中组（空串=全部）；查询变化即重置。
        let searchGroupFilter = "";
        let searchSelected = -1;
        const findSettingsScroller = (start: HTMLElement | null): HTMLElement | null => {
            let el = start?.parentElement || null;
            while (el && el !== document.body) {
                const style = window.getComputedStyle(el);
                if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4) return el;
                el = el.parentElement;
            }
            return null;
        };
        const locateSettingEntry = (entry: typeof searchEntries[number]) => {
            clearSettingsSearchView();
            searchInput.value = "";
            activate(entry.key);
            this.scheduleAnimationFrame(() => {
                if (!entry.element?.isConnected || !root.isConnected) return;
                const scroller = findSettingsScroller(entry.element);
                if (scroller) {
                    const itemRect = entry.element.getBoundingClientRect();
                    const scrollerRect = scroller.getBoundingClientRect();
                    const target = scroller.scrollTop + (itemRect.top - scrollerRect.top)
                        - Math.max(24, scrollerRect.height * 0.2);
                    scroller.scrollTop = Math.max(0, target);
                }
                entry.element.classList.add("sw-settings__item--locate");
                const control = entry.element.querySelector(
                    "button, input, select, textarea, [tabindex]:not([tabindex='-1'])") as HTMLElement | null;
                try {
                    control?.focus({preventScroll: true});
                } catch (_) {
                    control?.focus();
                }
                window.setTimeout(() => entry.element?.classList.remove("sw-settings__item--locate"), 1800);
            });
        };
        const updateSettingsSearchSelection = () => {
            const options = searchResults.querySelectorAll<HTMLElement>(".sw-settings__search-option");
            options.forEach((option, index) => {
                const active = index === searchSelected;
                option.classList.toggle("is-active", active);
                option.setAttribute("aria-selected", active ? "true" : "false");
            });
            // T-7002：combobox 的 activedescendant 必须跟随键盘选择（读屏播报当前项）。
            const activeEl = options[searchSelected];
            if (activeEl?.id) searchInput.setAttribute("aria-activedescendant", activeEl.id);
            else searchInput.removeAttribute("aria-activedescendant");
            if (activeEl) {
                const top = activeEl.offsetTop;
                if (top < searchResults.scrollTop) searchResults.scrollTop = top;
                else if (top + activeEl.offsetHeight > searchResults.scrollTop + searchResults.clientHeight) {
                    searchResults.scrollTop = top + activeEl.offsetHeight - searchResults.clientHeight;
                }
            }
        };
        const renderSettingsSearchResults = () => {
            const query = searchInput.value;
            const {results, total} = searchSettingsIndex(searchEntries, query);
            searchMatches = results;
            searchGroupFilter = "";
            searchSelected = results.length > 0 ? 0 : -1;
            searchResults.textContent = "";
            searchChips.textContent = "";
            searchClear.hidden = !query;
            searchInput.setAttribute("aria-expanded", query.trim() ? "true" : "false");
            if (!query.trim()) {
                searchChips.hidden = true;
                searchResults.hidden = true;
                searchInput.removeAttribute("aria-activedescendant");
                return;
            }
            searchResults.hidden = false;
            // T-7002：分组 chips——只在结果非空时出现，全部 + 结果内去重组（有界 6）。
            const groups = collectEntryGroups(results, 6);
            if (groups.length > 1) {
                const makeChip = (label: string, value: string) => {
                    const chip = document.createElement("button");
                    chip.type = "button";
                    chip.className = "sw-settings__search-chip" + (value === searchGroupFilter ? " is-active" : "");
                    chip.textContent = label;
                    chip.dataset.group = value;
                    chip.setAttribute("aria-pressed", String(value === searchGroupFilter));
                    chip.addEventListener("click", () => {
                        searchGroupFilter = searchGroupFilter === value ? "" : value;
                        renderSettingsSearchResultOptions();
                    });
                    return chip;
                };
                searchChips.append(makeChip(this.i18n.settingsSearchFilterAll, ""));
                groups.forEach((group) => searchChips.append(makeChip(group, group)));
                searchChips.hidden = false;
            } else {
                searchChips.hidden = true;
            }
            renderSettingsSearchResultOptions();
            if (results.length === 0) {
                const empty = document.createElement("div");
                empty.className = "sw-settings__search-note";
                empty.textContent = this.i18n.settingsSearchNoResults;
                searchResults.appendChild(empty);
            } else if (total > results.length) {
                const more = document.createElement("div");
                more.className = "sw-settings__search-note";
                more.textContent = this.i18n.settingsSearchMore.replace("{x}", String(total - results.length));
                searchResults.appendChild(more);
            }
        };
        // T-7002：选项装配独立成函数——分组 chips 切换只重画 listbox，不重跑索引。
        // option id 稳定（索引序），供 combobox 的 aria-activedescendant 引用；
        // 「路径结果」= 面板归属 + 分组标题两枚路径徽标 + 标题 + 描述。
        const renderSettingsSearchResultOptions = () => {
            const visible = searchGroupFilter
                ? searchMatches.filter((entry) => entry.group === searchGroupFilter)
                : searchMatches;
            searchResults.textContent = "";
            searchSelected = visible.length > 0 ? 0 : -1;
            visible.forEach((entry, index) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "sw-settings__search-option" + (index === searchSelected ? " is-active" : "");
                option.id = `sw-settings-search-option-${index}`;
                option.setAttribute("role", "option");
                option.setAttribute("aria-selected", index === searchSelected ? "true" : "false");
                const label = document.createElement("span");
                label.className = "sw-settings__search-option-label";
                label.textContent = entry.label;
                option.append(label);
                if (entry.group) {
                    const group = document.createElement("span");
                    group.className = "sw-settings__search-option-group";
                    group.textContent = entry.group;
                    option.append(group);
                }
                const title = document.createElement("span");
                title.className = "sw-settings__search-option-title";
                title.textContent = entry.title;
                const desc = document.createElement("span");
                desc.className = "sw-settings__search-option-desc";
                desc.textContent = entry.description;
                option.append(title, desc);
                option.addEventListener("click", () => locateSettingEntry(entry));
                searchResults.appendChild(option);
            });
            updateSettingsSearchSelection();
        };
        const clearSettingsSearchView = () => {
            searchMatches = [];
            searchGroupFilter = "";
            searchSelected = -1;
            searchResults.textContent = "";
            searchResults.hidden = true;
            searchChips.textContent = "";
            searchChips.hidden = true;
            searchClear.hidden = true;
            searchInput.setAttribute("aria-expanded", "false");
            searchInput.removeAttribute("aria-activedescendant");
        };
        let settingsSearchComposing = false;
        let settingsSearchCommittedValue: string | null = null;
        searchInput.addEventListener("focus", () => {
            if (searchInput.value) searchInput.select();
        });
        searchInput.addEventListener("compositionstart", () => { settingsSearchComposing = true; });
        searchInput.addEventListener("compositionend", () => {
            settingsSearchComposing = false;
            settingsSearchCommittedValue = searchInput.value;
            renderSettingsSearchResults();
        });
        searchInput.addEventListener("input", (event) => {
            if (settingsSearchComposing || (event as InputEvent).isComposing) return;
            if (settingsSearchCommittedValue === searchInput.value) {
                settingsSearchCommittedValue = null;
                return;
            }
            settingsSearchCommittedValue = null;
            renderSettingsSearchResults();
        });
        // T-7002：清空按钮——清查询、收起结果、回焦搜索框（清空是显式动作，可键盘触达）。
        searchClear.addEventListener("click", () => {
            searchInput.value = "";
            renderSettingsSearchResults();
            searchInput.focus({preventScroll: true});
        });
        // 键盘导航/Enter 只在「当前可视结果集」（分组过滤后）上循环，不越过 chips。
        const visibleSearchMatches = () => searchGroupFilter
            ? searchMatches.filter((entry) => entry.group === searchGroupFilter)
            : searchMatches;
        searchInput.addEventListener("keydown", (event) => {
            if (settingsSearchComposing || event.isComposing || event.keyCode === 229) {
                event.stopPropagation();
                return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const visible = visibleSearchMatches();
                if (visible.length === 0) return;
                const delta = event.key === "ArrowDown" ? 1 : -1;
                searchSelected = (searchSelected + delta + visible.length) % visible.length;
                updateSettingsSearchSelection();
            } else if (event.key === "Enter") {
                event.preventDefault();
                const visible = visibleSearchMatches();
                const entry = visible[searchSelected >= 0 ? searchSelected : 0];
                if (entry) locateSettingEntry(entry);
                else if (searchInput.value) {
                    searchInput.value = "";
                    renderSettingsSearchResults();
                }
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (searchInput.value) {
                    searchInput.value = "";
                    renderSettingsSearchResults();
                } else {
                    dialog.destroy();
                }
            }
        });

        // 打开时直接跳转到上次所在的标签页（默认外观）；activate 内部会记录切换，下次进入保持
        const lastTab = initialPanel || this.getSettings().lastSettingsTab;
        const panelKeysArr: string[] = [...panelKeys];
        const initial = panelKeysArr.includes(lastTab) ? lastTab : panelKeys[0];
        activate(initial);
        // ==================== T-7003：保存回执 + 撤销 + 分组恢复默认 + 外部变更重建 ====================
        // 状态栏（搜索框上方）：落盘结果三态（待写入/已保存/保存失败+重试）与撤销入口。
        // 回执语义诚实：防抖期间显示「待写入」而非已保存；失败保留本地值并提供重试。
        const statusbar = document.createElement("div");
        statusbar.className = "sw-settings__statusbar";
        const saveState = document.createElement("span");
        saveState.className = "sw-settings__save-state";
        saveState.setAttribute("role", "status");
        saveState.setAttribute("aria-live", "polite");
        const saveRetry = document.createElement("button");
        saveRetry.type = "button";
        saveRetry.className = "b3-button b3-button--text sw-settings__save-retry";
        saveRetry.textContent = this.i18n.settingsSaveRetry;
        saveRetry.setAttribute("aria-label", `${this.i18n.settingsSaveRetry} · ${this.i18n.settingsSaveFailed}`);
        saveRetry.hidden = true;
        saveRetry.addEventListener("click", () => this.retrySettingsSave());
        const undoButton = document.createElement("button");
        undoButton.type = "button";
        undoButton.className = "b3-button b3-button--text sw-settings__undo";
        undoButton.textContent = this.i18n.settingsUndo;
        undoButton.setAttribute("aria-label", this.i18n.settingsUndo);
        undoButton.title = this.i18n.settingsUndo;
        undoButton.disabled = true;
        statusbar.append(saveState, saveRetry, undoButton);
        panels.insertBefore(statusbar, searchWrap);
        const syncSaveState = () => {
            const outcome = this.lastSaveOutcome[SETTINGS_KEY] || "idle";
            statusbar.hidden = outcome === "idle";
            statusbar.dataset.state = outcome;
            saveState.textContent = outcome === "pending" ? this.i18n.settingsSavePending
                : outcome === "failed" ? this.i18n.settingsSaveFailed
                    : outcome === "ok" ? this.i18n.settingsSaveOk : "";
            saveState.dataset.state = outcome;
            saveRetry.hidden = outcome !== "failed";
        };
        document.addEventListener("sw-settings-save-state", syncSaveState);
        syncSaveState();
        // 带现场恢复的面板重渲染：替换当前激活面板内容后复位滚动，焦点按同位索引找回
        // （设置项在重建前后顺序稳定）；找不到同位元素诚实放弃，不猜焦点。
        const rebuildActivePanelPreservingScene = () => {
            const activeTab = tabs.querySelector<HTMLElement>(".sw-settings__tab.is-active");
            const key = activeTab?.dataset.panel || "";
            const panelEl = panels.querySelector<HTMLElement>(`.sw-settings__panel[data-panel="${key}"]`);
            if (!key || !panelEl) return;
            const scrollCapture = {panels: panels.scrollTop, panel: panelEl.scrollTop};
            const activeBefore = document.activeElement instanceof HTMLElement && panelEl.contains(document.activeElement)
                ? document.activeElement : null;
            const focusables = Array.from(panelEl.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])"));
            const focusIndex = activeBefore ? focusables.indexOf(activeBefore) : -1;
            panelEl.replaceChildren(builders[key]());
            panels.scrollTop = scrollCapture.panels;
            panelEl.scrollTop = scrollCapture.panel;
            if (focusIndex >= 0) {
                const nextFocusables = Array.from(panelEl.querySelectorAll<HTMLElement>("button, input, select, textarea, [tabindex]:not([tabindex='-1'])"));
                nextFocusables[focusIndex]?.focus({preventScroll: true});
            }
        };
        this.settingsSceneReloader = rebuildActivePanelPreservingScene;
        // 撤销栈（会话级，最多 20 步）：updateSettings 把逆向补丁交给 recorder 入栈；
        // 撤销应用经 settingsUndoSuppress 抑制再入栈，撤销后带现场重建。
        const undoStack: Array<Record<string, unknown>> = [];
        this.settingsUndoRecorder = (inverse) => {
            if (this.settingsUndoSuppress) return;
            undoStack.push(inverse);
            if (undoStack.length > 20) undoStack.shift();
            undoButton.disabled = false;
            undoButton.setAttribute("aria-label", `${this.i18n.settingsUndo} (${undoStack.length})`);
        };
        undoButton.addEventListener("click", () => {
            const inverse = undoStack.pop();
            if (!inverse) return;
            this.settingsUndoSuppress = true;
            try {
                this.updateSettings(inverse as Partial<ISwSettings>);
            } finally {
                this.settingsUndoSuppress = false;
            }
            undoButton.disabled = undoStack.length === 0;
            if (undoStack.length === 0) undoButton.setAttribute("aria-label", this.i18n.settingsUndo);
            showMessage(this.i18n.settingsUndoDone, 3000, "info");
            rebuildActivePanelPreservingScene();
        });
        // 外部变更重建：设置弹窗未持有焦点（变更来自切换器/工作台/悬浮球等入口）时，
        // 带现场重建当前面板保持显示真实；本页正在交互（焦点在弹窗内）时跳过——
        // 逐控件编辑自含视觉状态，重建反而打断输入。防抖合并同批多次变更。
        let externalRefreshTimer = 0;
        const onSettingsUpdatedExternal = () => {
            const active = document.activeElement;
            if (active instanceof HTMLElement && root.contains(active)) return;
            if (externalRefreshTimer) return;
            externalRefreshTimer = window.setTimeout(() => {
                externalRefreshTimer = 0;
                if (!root.isConnected || this.isUnloading) return;
                rebuildActivePanelPreservingScene();
            }, 50);
        };
        document.addEventListener("sw-settings-updated", onSettingsUpdatedExternal);
        releaseSettingsListeners = () => {
            document.removeEventListener("sw-settings-save-state", syncSaveState);
            document.removeEventListener("sw-settings-updated", onSettingsUpdatedExternal);
            if (externalRefreshTimer) {
                window.clearTimeout(externalRefreshTimer);
                externalRefreshTimer = 0;
            }
        };
        // T-7002：桌面端设置页首焦点落在搜索框（页面第一个可交互元素、跨组查找入口）；
        // 移动端不自动聚焦——避免打开设置即弹出软键盘。
        if (!this.isMobile) {
            this.scheduleAnimationFrame(() => {
                if (root.isConnected && searchInput.isConnected) searchInput.focus({preventScroll: true});
            });
        }
        // T-7002：`/` 与 Ctrl/Cmd+K 直达搜索——只在设置页根容器内监听（不注册全局
        // 命令、不抢宿主快捷键）；焦点已在输入框/其他可编辑控件内时不接管。
        root.addEventListener("keydown", (event) => {
            if (settingsSearchComposing || event.isComposing || event.keyCode === 229) {
                event.stopPropagation();
                return;
            }
            const target = event.target as HTMLElement | null;
            const editable = target instanceof HTMLElement
                && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
            const jump = event.key === "/" && !editable
                || (event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K");
            if (!jump) return;
            event.preventDefault();
            searchInput.focus({preventScroll: true});
            searchInput.select();
        });
        // Only move the horizontal tab strip. scrollIntoView also scrolls
        // Dialog ancestors in Android WebView and can shift the entire settings
        // page off screen when opening the quick-action panel directly.
        this.scheduleAnimationFrame(() => {
            if (!root.isConnected) return;
            root.scrollLeft = 0;
            panels.scrollLeft = 0;
            ensureTabVisible(initial);
        });
    }
}
