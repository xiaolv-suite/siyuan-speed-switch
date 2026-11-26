import {Dialog, getActiveTab, openTab} from "siyuan";
import {logger} from "../logger";
import {openDocSearchResult} from "../doc-search-ui";
import {createPlatformKbd, mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap, mountPlatformDialogMobileClose} from "../platform-dom";
import {ensureTodayJournalOutcome as ensureTodayJournalOutcomeAction, findTodayJournalOutcome as findTodayJournalOutcomeAction, attachXiaolvLifeLogIal} from "../journal-actions";
import {ensureXiaolvDiaryZone, buildXiaolvLifeLogAttrs} from "../libs/lv-notice-kit";
import {sanitizeJournalAppend, normalizeAgentNotebookId} from "../agent-capabilities";
import {MESSAGE_DEFAULT_MS, BLOCK_ID_RE} from "../constants";
import {type JournalActionOutcome, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface CaptureJournalRuntime extends Omit<ISpeedSwitchHost, "openQuickCapture" | "resolveActiveCaptureRoot" | "openJournal" | "ensureTodayJournal" | "findTodayJournal" | "ensureTodayJournalOutcome" | "findTodayJournalOutcome" | "promptJournalNotebook" | "buildJournalPromptHtml" | "createJournalSelect" | "populateJournalNotebookSelect" | "bindJournalPromptEvents" | "openTemplatePicker" | "resolveActiveHostEditor" | "insertHostTemplate"> {}
export class CaptureJournalRuntime {
    // T-6818 快速捕获流程：输入 → 目标（今日日记/当前文档）→ 目的地预览 →
    // 受控写入（白名单端点/既有桥）→ 回执。每步失败原因独立呈现。
    private openQuickCapture(preferredNotebook = "", initialText = "") {
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            title: this.i18n.quickCaptureTitle,
            content: '<div class="speed-switch sw-quick-capture"></div>',
            width: this.isMobile ? "min(420px, 92vw)" : "380px",
            // 快速记录内容包含目标、输入、预览和操作行；给底部动作保留完整
            // 呼吸空间，避免宿主 Dialog 在固定高度下裁切主按钮。
            height: this.isMobile ? "min(320px, 68vh)" : "288px",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.quickCaptureTitle || "快速记录", "", "iconAdd");
        const root = dialog.element.querySelector<HTMLElement>(".sw-quick-capture");
        // 快速记录没有根节点就没有输入或退出入口，按失败边界销毁空壳。
        if (!root) {
            dialog.destroy();
            return;
        }
        dialog.element.classList.add("sw-dialog-host");
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-quick-capture-dialog");
        type CaptureTarget = "journal" | "current";
        let target: CaptureTarget = "journal";

        // 退出动作行，保持与平台面板相同的 Esc 可发现性与无障碍支持
        const header = document.createElement("div");
        header.className = "sw-quick-capture__header";
        const headerTitle = document.createElement("strong");
        headerTitle.className = "sw-quick-capture__header-title";
        headerTitle.style.display = "none";
        headerTitle.textContent = this.i18n.quickCaptureTitle;
        const headerActions = document.createElement("div");
        headerActions.className = "sw-quick-capture__header-actions";
        const escapeHint = document.createElement("span");
        escapeHint.className = "sw-quick-capture__close-hint";
        escapeHint.setAttribute("aria-label", this.i18n.platformCloseHint || "Escape to close");
        escapeHint.appendChild(createPlatformKbd(document, "Esc"));
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "b3-button b3-button--text sw-quick-capture__close";
        closeButton.setAttribute("aria-label", this.i18n.close);
        closeButton.title = this.i18n.close;
        closeButton.innerHTML = '<svg><use xlink:href="#iconClose"></use></svg>';
        closeButton.addEventListener("click", () => dialog.destroy());
        headerActions.append(escapeHint, closeButton);
        header.append(headerTitle, headerActions);
        root.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            dialog.destroy();
        });

        const input = document.createElement("textarea");
        input.className = "b3-text-field fn__block sw-quick-capture__input";
        input.rows = 3;
        input.placeholder = this.i18n.quickCapturePlaceholder;
        input.value = initialText;
        input.setAttribute("aria-label", this.i18n.quickCaptureTitle);
        // T-6815/T-6818 目的地预览：写到哪里、写什么副作用，提交前可见
        const previewLine = document.createElement("p");
        previewLine.className = "sw-quick-capture__preview";
        previewLine.setAttribute("role", "status");
        previewLine.setAttribute("aria-live", "polite");

        const actions = document.createElement("div");
        actions.className = "sw-quick-capture__actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "b3-button b3-button--text";
        cancel.textContent = this.i18n.quickCaptureCancel;
        cancel.addEventListener("click", () => dialog.destroy());
        const save = document.createElement("button");
        save.type = "button";
        save.className = "b3-button b3-button--outline sw-quick-capture__save";
        save.textContent = this.i18n.quickCaptureSave;
        // T-6875（RZ-5）：键位提示芯片——只陈述真实绑定（保存=Ctrl/Cmd+Enter，Esc=宿主关闭）
        // T-6888 审查修复：提示只保留真实绑定芯片（Ctrl+Enter）——此前附带
        // 保存/取消文字与按钮文本重复且在窄弹窗内竖排溢出。
        const kbdHints = document.createElement("span");
        kbdHints.className = "sw-quick-capture__kbd-hints";
        kbdHints.append(createPlatformKbd(document, "Ctrl+Enter"));

        const targets = document.createElement("div");
        targets.className = "sw-quick-capture__targets";
        // Destination choices are a pressed-button group; they do not switch
        // tabpanels, so do not expose an incomplete tablist interaction model.
        targets.setAttribute("role", "group");
        targets.setAttribute("aria-label", this.i18n.quickCaptureTitle);
        const targetButtons: Array<{key: CaptureTarget; el: HTMLButtonElement}> = [];
        const makeTargetButton = (key: CaptureTarget, label: string) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "b3-button b3-button--small";
            button.textContent = label;
            button.addEventListener("click", () => setActiveTarget(key));
            targetButtons.push({key, el: button});
            targets.appendChild(button);
        };
        makeTargetButton("journal", this.i18n.quickCaptureTargetJournal);
        const captureRoot = this.resolveActiveCaptureRoot();
        if (!this.isMobile) makeTargetButton("current", this.i18n.quickCaptureTargetCurrent);
        const setActiveTarget = (next: CaptureTarget) => {
            target = next;
            targetButtons.forEach(({key, el}) => {
                el.classList.toggle("sw__target--active", key === target);
                // T-7042：同 chips 收口——单选按钮组用 aria-pressed，不用 tablist 专属 aria-selected
                el.setAttribute("aria-pressed", String(key === target));
            });
            updatePreview();
        };
        const updatePreview = () => {
            if (target === "journal") {
                save.disabled = false;
                const today = new Date();
                const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                previewLine.textContent = this.i18n.quickCapturePreviewJournal.replace("{x}", ymd);
                // 预览 enriched：笔记本名异步补齐（有界缓存清单）
                void this.loadNotebooks().then((notebooks: Array<{id: string; name: string}>): void => {
                    if (!previewLine.isConnected) return;
                    const notebookId = normalizeAgentNotebookId(preferredNotebook) || normalizeAgentNotebookId(this.getSettings().journalNotebook);
                    const found = notebooks.find((nb) => nb.id === notebookId);
                    if (found) previewLine.textContent = this.i18n.quickCapturePreviewJournal.replace("{x}", `${found.name} · ${ymd}`);
                }).catch((): undefined => undefined);
                return;
            }
            const capture = this.resolveActiveCaptureRoot();
            if (capture) {
                save.disabled = false;
                previewLine.textContent = this.i18n.quickCapturePreviewCurrent.replace("{x}", capture.title);
            } else {
                save.disabled = true;
                previewLine.textContent = this.i18n.quickCaptureNoTarget;
            }
        };

        let saving = false;
        let writeOutcomeUnknown = false;
        const submit = () => {
            if (saving) return;
            const content = sanitizeJournalAppend(input.value);
            if (!content) {
                showMessage(this.i18n.quickCaptureEmpty);
                return;
            }
            // 同步上锁防连击与并发写入 (B-11)
            saving = true;
            save.disabled = true;
            cancel.disabled = true;
            void (async () => {
                let completed = false;
                try {
                    if (target === "current") {
                        // 受控写入（当前文档）：追加到活动文档末尾（内核 appendBlock，白名单端点）
                        const capture = this.resolveActiveCaptureRoot();
                        if (!capture) {
                            showMessage(this.i18n.quickCaptureNoTarget, MESSAGE_DEFAULT_MS, "error");
                            return;
                        }
                        const appendResult = await this.fetchKernelJsonOutcome("/api/block/appendBlock", {
                            dataType: "markdown", data: content, parentID: capture.rootId,
                        });
                        if (!appendResult.ok) {
                            if (appendResult.outcome === "unknown") {
                                writeOutcomeUnknown = true;
                                previewLine.textContent = this.i18n.quickCaptureUnknown;
                                input.readOnly = true;
                                targetButtons.forEach(({el}) => { el.disabled = true; });
                                save.textContent = this.i18n.quickCapturePending || "结果待核实";
                                showMessage(this.i18n.quickCaptureUnknown, MESSAGE_DEFAULT_MS, "error");
                            } else {
                                showMessage(this.i18n.quickCaptureFailed, MESSAGE_DEFAULT_MS, "error");
                            }
                            return;
                        }
                        const appendJson = appendResult.value;
                        if (!appendJson || appendJson.code !== 0) {
                            showMessage(this.i18n.quickCaptureFailed, MESSAGE_DEFAULT_MS, "error");
                            return;
                        }
                        completed = true;
                        dialog.destroy();
                        showMessage(`${this.i18n.quickCaptureDone} · ${this.i18n.quickCapturePreviewCurrent.replace("{x}", capture.title)}`);
                        return;
                    }
                    let notebook = normalizeAgentNotebookId(preferredNotebook) || normalizeAgentNotebookId(this.getSettings().journalNotebook);
                    if (!notebook) {
                        notebook = await this.promptJournalNotebook();
                        if (!notebook) return;
                    }
                    const journalResult = await this.ensureTodayJournalOutcome(notebook);
                    if (journalResult.ok === false) {
                        const message = journalResult.outcome === "unknown"
                            ? this.i18n.journalResultUnknown
                            : journalResult.error.kind === "unauthorized" || journalResult.error.kind === "forbidden"
                                ? this.i18n.kernelPermissionDenied
                                : this.i18n.quickCaptureFailed;
                        showMessage(message, MESSAGE_DEFAULT_MS, "error");
                        return;
                    }
                    const docId = journalResult.id;
                    const zone = await ensureXiaolvDiaryZone(docId);
                    const lifeLogAttrs = buildXiaolvLifeLogAttrs({
                        type: "闪念速记",
                        source: "雷切",
                        module: "quick-capture",
                        body: content,
                    });
                    const appendResult = await this.fetchKernelJsonOutcome("/api/block/insertBlock", {
                        previousID: zone.anchorBlockId,
                        parentID: docId,
                        dataType: "markdown",
                        data: attachXiaolvLifeLogIal(content, lifeLogAttrs),
                    });
                    if (!appendResult.ok) {
                        if (appendResult.outcome === "unknown") {
                            writeOutcomeUnknown = true;
                            previewLine.textContent = this.i18n.quickCaptureUnknown;
                            input.readOnly = true;
                            targetButtons.forEach(({el}) => { el.disabled = true; });
                            save.textContent = this.i18n.quickCapturePending || "结果待核实";
                            showMessage(this.i18n.quickCaptureUnknown, MESSAGE_DEFAULT_MS, "error");
                        } else {
                            showMessage(this.i18n.quickCaptureFailed, MESSAGE_DEFAULT_MS, "error");
                        }
                        return;
                    }
                    const appendJson = appendResult.value;
                    if (!appendJson || appendJson.code !== 0) {
                        showMessage(this.i18n.quickCaptureFailed, MESSAGE_DEFAULT_MS, "error");
                        return;
                    }
                    completed = true;
                    dialog.destroy();
                    showMessage(this.i18n.quickCaptureDone);
                } catch (error) {
                    logger.warn("quick capture failed", error);
                    showMessage(this.i18n.quickCaptureFailed, MESSAGE_DEFAULT_MS, "error");
                } finally {
                    if (!completed) {
                        saving = false;
                        save.disabled = writeOutcomeUnknown;
                        cancel.disabled = false;
                        input.focus();
                    }
                }
            })();
        };
        save.addEventListener("click", submit);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                submit();
            }
        });
        // T-7842: 快速记录常用标签胶囊 (CAND-09)
        const quickTagsBar = document.createElement("div");
        quickTagsBar.className = "sw-quick-capture__tags";
        quickTagsBar.setAttribute("role", "toolbar");
        quickTagsBar.setAttribute("aria-label", "常用标签");
        const defaultTags = ["#闪念#", "#待办#", "#灵感#"];
        defaultTags.forEach((tag) => {
            const tagBtn = document.createElement("button");
            tagBtn.type = "button";
            tagBtn.className = "b3-button b3-button--text sw-quick-capture__tag-chip";
            tagBtn.textContent = tag;
            tagBtn.addEventListener("click", () => {
                const text = input.value;
                const start = input.selectionStart || text.length;
                const end = input.selectionEnd || text.length;
                const insert = (start > 0 && text[start - 1] !== " " && text[start - 1] !== "\n" ? " " : "")
                    + tag + " ";
                input.value = text.slice(0, start) + insert + text.slice(end);
                input.focus();
                const nextPos = start + insert.length;
                input.setSelectionRange(nextPos, nextPos);
            });
            quickTagsBar.appendChild(tagBtn);
        });

        actions.append(kbdHints, cancel, save);
        root.append(header, targets, input, quickTagsBar, previewLine, actions);
        setActiveTarget("journal");
        window.setTimeout(() => {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }, 30);
    }

    // T-6818：活动文档捕获目标（rootId + 可见标题）；无活动编辑器时为 null
    private resolveActiveCaptureRoot(): {rootId: string; title: string} | null {
        const editor = this.resolveActiveHostEditor();
        const rootId = String((editor?.protyle?.block as {rootID?: string; parentID?: string} | undefined)?.rootID || editor?.protyle?.block?.parentID || "");
        if (editor && rootId) {
            const title = document.querySelector(".layout__wnd--active .item--focus .protyle-title")?.textContent?.trim()
                || document.querySelector(".protyle-title")?.textContent?.trim()
                || rootId;
            return {rootId, title: title.slice(0, 120)};
        }
        const activeTab = this.getActiveTab ? this.getActiveTab() : undefined;
        const tabRootId = activeTab ? (this.rootIdOf(activeTab) || "") : "";
        if (tabRootId && BLOCK_ID_RE.test(tabRootId)) {
            const title = (activeTab ? this.titleOf(activeTab) : "") || tabRootId;
            return {rootId: tabRootId, title: title.slice(0, 120)};
        }
        return null;
    }

    private async openJournal(preferredNotebook = "") {
        let notebook = normalizeAgentNotebookId(preferredNotebook) || normalizeAgentNotebookId(this.getSettings().journalNotebook);
        if (!notebook) {
            notebook = await this.promptJournalNotebook();
            if (!notebook) {
                return; // 鐢ㄦ埛鍙栨秷閫夋嫨
            }
        }
        const result = this.getSettings().journalAutoCreate === false
            ? await this.findTodayJournalOutcome(notebook)
            : await this.ensureTodayJournalOutcome(notebook);
        if (result.ok === false) {
            const message = result.outcome === "unknown"
                ? this.i18n.journalResultUnknown
                : result.error.kind === "unauthorized" || result.error.kind === "forbidden"
                    ? this.i18n.kernelPermissionDenied
                    : this.i18n.journalFailed;
            showMessage(message, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const id = result.id;
        if (!id) {
            showMessage(this.i18n.journalFailed, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        if (this.isMobile) {
            // openTab 在手机端是空实现，走 MobileTabs.open
            this.mobileOpenDoc(id);
        } else {
            this.bridge.openTab({app: this.app, doc: {id}});
        }
    }

    // 调用内核 createDailyNote：已有当日日记时返回其 id（不重复创建）
    private async ensureTodayJournal(notebook: string): Promise<string | null> {
        const result = await this.ensureTodayJournalOutcome(notebook);
        return result.ok ? result.id : null;
    }

    private async findTodayJournal(notebook: string): Promise<string | null> {
        const result = await this.findTodayJournalOutcome(notebook);
        return result.ok ? result.id : null;
    }

    private async ensureTodayJournalOutcome(notebook: string): Promise<JournalActionOutcome> {
        return ensureTodayJournalOutcomeAction({
            notebook,
            logger,
            requestJson: (url, body, requestOptions) => this.fetchKernelJsonOutcome(url, body, requestOptions),
        }) as Promise<JournalActionOutcome>;
    }

    private async findTodayJournalOutcome(notebook: string): Promise<JournalActionOutcome> {
        return findTodayJournalOutcomeAction({
            notebook,
            logger,
            requestJson: (url, body, requestOptions) => this.fetchKernelJsonOutcome(url, body, requestOptions),
        }) as Promise<JournalActionOutcome>;
    }

    // 首次点击日记按钮：弹窗选择默认日记笔记本，选择后保存并返回
    private promptJournalNotebook(): Promise<string> {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value: string) => {
                if (settled) return;
                settled = true;
                resolve(value);
            };
            let releaseJournalDialog: () => void = () => undefined;
            const dialog = new Dialog({
                title: this.i18n.journalChoose,
                content: this.buildJournalPromptHtml(),
                width: "min(460px, 90vw)",
                destroyCallback: () => releaseJournalDialog(),
            });
            mountPlatformDialogTitleWrap(dialog.element, this.i18n.journalChoose || "选择日记本", "", "iconCalendar");
            mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
            releaseJournalDialog = this.suspendFABForDialog(() => finish(""));
            const sel = dialog.element.querySelector<HTMLSelectElement>(".sw-journal-prompt__sel > select")
                ?? this.createJournalSelect(dialog);
            sel.id = "sw-journal-prompt-select";
            sel.setAttribute("aria-label", this.i18n.journalChoose || "选择日记本");
            const confirmBtn = dialog.element.querySelector<HTMLButtonElement>(".sw-journal-prompt__confirm");
            if (confirmBtn) {
                confirmBtn.disabled = true;
            }
            this.loadNotebooks().then((notebooks) => {
                this.populateJournalNotebookSelect(sel, confirmBtn, notebooks);
            }).catch(() => {
                this.populateJournalNotebookSelect(sel, confirmBtn, []);
            });
            this.bindJournalPromptEvents(dialog, sel, confirmBtn, finish);
        });
    }

    // 笔记本选择弹窗 HTML：提示文本 + select 占位 + 取消/确认按钮
    private buildJournalPromptHtml(): string {
        return `<div class="b3-dialog__content sw-journal-prompt">
    <label class="b3-label__text sw-journal-prompt__tip" for="sw-journal-prompt-select">${this.i18n.journalChooseTip}</label>
    <div class="sw-journal-prompt__sel"></div>
</div>
<div class="b3-dialog__action">
    <button type="button" class="b3-button b3-button--cancel">${this.i18n.cancel}</button>
    <div class="fn__space"></div>
    <button type="button" class="b3-button b3-button--text sw-journal-prompt__confirm">${this.i18n.confirm}</button>
</div>`;
    }

    // select 不存在时（DOM 未找到占位 div）动态创建一个；正常情况下 HTML 里已有占位
    private createJournalSelect(dialog: Dialog): HTMLSelectElement {
        const sel = document.createElement("select");
        sel.className = "b3-select fn__flex-center fn__block";
        sel.id = "sw-journal-prompt-select";
        sel.setAttribute("aria-label", this.i18n.journalChoose || "选择日记本");
        sel.disabled = true;
        sel.appendChild(new Option(this.i18n.notebookLoading, ""));
        dialog.element.querySelector(".sw-journal-prompt__sel")?.appendChild(sel);
        return sel;
    }

    // 加载到笔记本列表后填充选项：无笔记本显示空态；否则默认选中第一项
    private populateJournalNotebookSelect(
        sel: HTMLSelectElement,
        confirmBtn: HTMLButtonElement | null,
        notebooks: Array<{id: string, name: string}>,
    ) {
        if (notebooks.length === 0) {
            sel.disabled = true;
            sel.innerHTML = "";
            sel.appendChild(new Option(this.i18n.journalNoNotebook, ""));
            return;
        }
        sel.disabled = false;
        sel.innerHTML = "";
        notebooks.forEach((nb) => {
            const opt = new Option(nb.name, nb.id);
            opt.title = nb.name;
            sel.appendChild(opt);
        });
        sel.value = notebooks[0].id;
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    // 确认：写入设置 + 关闭弹窗 + resolve(id)；取消：resolve("")（调用方按空值兜底）
    private bindJournalPromptEvents(
        dialog: Dialog,
        sel: HTMLSelectElement,
        confirmBtn: HTMLButtonElement | null,
        resolve: (id: string) => void,
    ) {
        confirmBtn?.addEventListener("click", () => {
            const picked = sel.value;
            if (!picked) {
                return;
            }
            this.updateSettings({journalNotebook: picked});
            resolve(picked);
            dialog.destroy();
        });
        dialog.element.querySelector(".b3-button--cancel")?.addEventListener("click", () => {
            dialog.destroy();
            resolve("");
        });
        dialog.element.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                dialog.destroy();
                resolve("");
            } else if (e.key === "Enter" && confirmBtn && !confirmBtn.disabled) {
                e.preventDefault();
                e.stopPropagation();
                confirmBtn.click();
            }
        });
    }

    /**
     * T-6792 插入模板：列出 <data>/templates/ 下的模板（内核 manage 端点），
     * 选中后 render 为 HTML 并经官方 protyle.insert 写入当前光标处。
     * 渲染目标 id 取活动编辑器根块；无活动编辑器时提示后放弃。
     */
    private async openTemplatePicker(): Promise<void> {
        const editor = this.resolveActiveHostEditor();
        if (!editor) {
            showMessage(this.i18n.templatePickerNoEditor, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        let listing: any = null;
        try {
            listing = await this.fetchKernelJson("/api/template/manage", {action: "list"});
        } catch (error) {
            logger.warn("template listing failed", error);
            showMessage(this.i18n.templatePickerEmpty, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const entries = Array.isArray(listing?.data)
            ? listing.data.filter((entry: unknown) => {
                const item = entry as {path?: unknown; isDir?: unknown};
                return Boolean(item) && typeof item.path === "string" && item.path.length > 0 && item.isDir !== true;
            })
            : [];
        if (!entries.length) {
            showMessage(this.i18n.templatePickerEmpty, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const releaseFab = this.suspendFABForDialog();
        const dialog = new Dialog({
            title: this.i18n.templatePickerTitle,
            content: '<div class="speed-switch sw-template-picker"></div>',
            width: this.isMobile ? "min(440px, 92vw)" : "400px",
            height: this.isMobile ? "min(420px, 68vh)" : "360px",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
            },
        });
        this.activeDialogs.add(dialog);
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.templatePickerTitle || "插入模板", "", "iconFile");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());
        const root = dialog.element.querySelector<HTMLElement>(".sw-template-picker");
        if (!root) {
            dialog.destroy();
            return;
        }
        root.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                dialog.destroy();
            }
        });
        const list = document.createElement("div");
        list.className = "sw-template-picker__list";
        entries.forEach((entry: {path: string}) => {
            const name = entry.path.split("/").pop() || entry.path;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "b3-list-item b3-list-item--narrow sw-template-picker__item";
            button.textContent = name;
            button.title = entry.path;
            button.addEventListener("click", () => {
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
                void this.insertHostTemplate(editor, entry.path).then((inserted) => {
                    if (inserted) {
                        dialog.destroy();
                    } else {
                        button.disabled = false;
                        button.removeAttribute("aria-busy");
                    }
                });
            });
            list.appendChild(button);
        });
        root.appendChild(list);
        list.querySelector<HTMLButtonElement>("button")?.focus({preventScroll: true});
    }

    private resolveActiveHostEditor(): {protyle: {block?: {parentID?: string; rootID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}} | null {
        const bridge = this as unknown as {getActiveEditor?: (wndActive?: boolean) => unknown};
        if (typeof bridge.getActiveEditor === "function") {
            const editor = bridge.getActiveEditor.call(this) as {protyle?: {block?: {parentID?: string; rootID?: string}; insert?: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}} | undefined;
            if (editor?.protyle?.insert) {
                return editor as {protyle: {block?: {parentID?: string; rootID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}};
            }
        }
        const activeTab = this.getActiveTab ? this.getActiveTab() : undefined;
        const tabEditor = (activeTab as unknown as {model?: {editor?: {protyle?: {block?: {parentID?: string; rootID?: string}; insert?: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}}}} | undefined)?.model?.editor;
        return tabEditor?.protyle?.insert
            ? (tabEditor as {protyle: {block?: {parentID?: string; rootID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}})
            : null;
    }

    private async insertHostTemplate(editor: {protyle: {block?: {parentID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}}, path: string): Promise<boolean> {
        const rendered = await this.fetchKernelJson("/api/template/render", {
            id: editor.protyle.block?.parentID || "",
            path,
            mode: "editorInsert",
        }, 15000);
        const content = rendered?.data?.content;
        if (!rendered || rendered.code !== 0 || typeof content !== "string" || !content.trim()) {
            logger.warn("template insert failed", rendered?.msg || "empty content");
            showMessage(this.i18n.templateInsertFailed, MESSAGE_DEFAULT_MS, "error");
            return false;
        }
        editor.protyle.insert(content, true, true);
        return true;
    }

    // T-6821 深链接/剪贴板入口：读剪贴板 → 思源块链接（siyuan://blocks/<id>）
    // 确认后打开；普通文本预填进快速捕获（目标选择照常）。消毒、来源标记、
    // 用户确认、不保存凭据；空/不可读剪贴板给出明确回执。
    async openClipboardEntry() {
        let text = "";
        try {
            text = String(await navigator.clipboard?.readText?.() || "");
        } catch (error) {
            logger.warn("clipboard read fail", error);
        }
        const clean = text.trim();
        if (!clean) {
            showMessage(this.i18n.clipboardEmpty, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const linkMatch = clean.match(/^siyuan:\/\/blocks\/(\d{14}-[0-9a-z]+)$/i);
        if (linkMatch) {
            // 来源标记：链接来自剪贴板，打开前向用户确认目的地
            if (confirm(this.i18n.clipboardOpenConfirm)) {
                void openDocSearchResult.call(this, linkMatch[1], null);
            }
            return;
        }
        this.openQuickCapture("", clean.slice(0, 500));
    }
}
