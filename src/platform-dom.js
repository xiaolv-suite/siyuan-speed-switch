"use strict";

// T-6871 平台 UI 原语 DOM 构造助手（RZ-1，ADR 0079）。
// 只产出 sw-platform-* class 的元素（样式见 _platform-shell.scss），不持有业务状态；
// document 由调用方注入（缺省取全局 document），便于 jsdom 单测与宿主装配模块复用。

const PLATFORM_STATUS_STATES = Object.freeze(["ready", "loading", "stale", "dirty", "blocked", "error"]);

function normalizePlatformStatusState(value) {
    return PLATFORM_STATUS_STATES.includes(value) ? value : "";
}

function createPlatformElement(doc, tag, className, text) {
    const element = (doc || document).createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
}

/**
 * 六态状态徽标（ready/loading/stale/dirty/blocked/error）。
 * 非法状态回落中性徽标——不猜测为 ready（诚实呈现受限/未知）。
 */
function createPlatformStatus(doc, state, label) {
    const status = createPlatformElement(doc, "span", "sw-platform-status");
    const normalized = normalizePlatformStatusState(state);
    if (normalized) status.dataset.state = normalized;
    if (label !== undefined && label !== null) status.textContent = String(label);
    return status;
}

/** 键位提示芯片（如 Tab / 1-9 / Enter）。 */
function createPlatformKbd(doc, text) {
    return createPlatformElement(doc, "span", "sw-platform-kbd", text === undefined || text === null ? "" : String(text));
}

/**
 * 分段控件：items = [{value, label}]，仅合法（非空字符串 value）项入列；
 * active 命中才高亮（非法 active 无高亮项，不猜默认值）。点击切换高亮并回调
 * onChange(value)；同值重复点击不重复回调。aria=radiogroup/radio/aria-checked。
 */
function createPlatformSegmented(doc, options = {}) {
    const seg = createPlatformElement(doc, "div", "sw-platform-seg");
    seg.setAttribute("role", "radiogroup");
    if (options.ariaLabel) seg.setAttribute("aria-label", String(options.ariaLabel));
    const items = Array.isArray(options.items) ? options.items : [];
    let active = typeof options.active === "string" ? options.active : "";
    const buttons = [];
    items.forEach((item) => {
        if (!item || typeof item.value !== "string" || !item.value) return;
        const button = createPlatformElement(doc, "button", "sw-platform-seg__item", item.label === undefined || item.label === null ? item.value : String(item.label));
        button.type = "button";
        button.dataset.value = item.value;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(item.value === active));
        if (item.value === active) button.classList.add("is-active");
        // T-7175：radiogroup 键盘合同——roving tabindex（单 Tab 停靠）+ 方向键循环选择。
        button.addEventListener("keydown", (event) => {
            const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
            const backward = event.key === "ArrowLeft" || event.key === "ArrowUp";
            if (!forward && !backward) return;
            event.preventDefault();
            const currentIndex = buttons.indexOf(event.currentTarget);
            if (currentIndex < 0 || buttons.length === 0) return;
            const next = buttons[(currentIndex + (forward ? 1 : -1) + buttons.length) % buttons.length];
            next.focus();
            next.click();
        });
        button.addEventListener("click", () => {
            if (active === item.value) return;
            active = item.value;
            buttons.forEach((candidate) => {
                const on = candidate.dataset.value === active;
                candidate.classList.toggle("is-active", on);
                candidate.setAttribute("aria-checked", String(on));
            });
            applyRovingTabindex();
            if (typeof options.onChange === "function") options.onChange(item.value);
        });
        buttons.push(button);
        seg.appendChild(button);
    });
    // T-7175：单 Tab 停靠——选中项（或无选中时首项）保留 Tab 序，其余 -1。
    const applyRovingTabindex = () => {
        const hasActive = buttons.some((candidate) => candidate.dataset.value === active);
        buttons.forEach((candidate, index) => {
            candidate.tabIndex = (candidate.dataset.value === active || (!hasActive && index === 0)) ? 0 : -1;
        });
    };
    applyRovingTabindex();
    return seg;
}

/**
 * 胶囊动作按钮：soft=true 为次级（主色软底），默认主色实底；
 * onClick 缺省时仍产出可用按钮（调用方自行绑定）。
 */
function createPlatformPillAction(doc, options = {}) {
    const button = createPlatformElement(doc, "button", "sw-platform-action sw-platform-action--pill", options.label === undefined || options.label === null ? "" : String(options.label));
    button.type = "button";
    if (options.soft) button.classList.add("sw-platform-action--soft");
    if (typeof options.onClick === "function") button.addEventListener("click", options.onClick);
    return button;
}

/**
 * 给思源原生 Dialog 标题栏补一枚轻量 Esc 提示。
 * Dialog 自带关闭按钮与 Escape 行为，这个助手只补可发现性，不接管销毁流程。
 * 重复调用保持幂等，便于不同宿主在 Dialog 初始化后统一挂载。
 */
function mountPlatformDialogCloseHint(dialogElement, label = "to close", doc) {
    const root = dialogElement && typeof dialogElement.querySelector === "function" ? dialogElement : null;
    if (!root) return null;
    const header = root.querySelector(".b3-dialog__header");
    const close = header && header.querySelector(".b3-dialog__close");
    if (!header || !close) return null;
    const existing = header.querySelector(".sw-platform-dialog__close-hint");
    if (existing) return existing;
    header.classList.add("sw-platform-dialog__header");
    close.classList.add("sw-platform-dialog__close-button");
    const hint = createPlatformElement(doc || root.ownerDocument || document, "span", "sw-platform-dialog__close-hint");
    const normalizedLabel = label === undefined || label === null || String(label).trim() === ""
        ? "to close"
        : String(label).trim();
    hint.setAttribute("aria-label", `Esc ${normalizedLabel}`);
    hint.appendChild(createPlatformKbd(doc || root.ownerDocument || document, "Esc"));
    const text = createPlatformElement(doc || root.ownerDocument || document, "span", "sw-platform-dialog__close-hint-label", normalizedLabel);
    hint.appendChild(text);
    header.insertBefore(hint, close);
    return hint;
}

/**
 * 为弹窗容器注入轻量 WAI-ARIA 焦点循环守卫（Focus Trap）。
 * 拦截 Tab 与 Shift+Tab，防止焦点溢出至底层背景页面。
 */
function trapDialogFocus(dialogElement) {
    const root = dialogElement && typeof dialogElement.querySelector === "function" ? dialogElement : null;
    if (!root) return () => {};
    if (root.dataset && root.dataset.swFocusTrapAttached === "true") return () => {};
    if (root.dataset) root.dataset.swFocusTrapAttached = "true";

    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // 记录打开弹窗前前台的聚焦元素，用于弹窗销毁后安全归还焦点
    const previousActive = root.ownerDocument?.activeElement;

    const onKeydown = (event) => {
        if (event.isComposing || event.defaultPrevented) return;
        if (event.key === "Escape") {
            const target = event.target;
            if (target && typeof target.closest === "function") {
                const innerDialog = target.closest(".sw-platform-dialog");
                if (innerDialog && innerDialog !== root && root.contains(innerDialog)) return;
            }
            const closeBtn = root.querySelector(".b3-dialog__close, .sw-platform-dialog__close-button");
            if (closeBtn && typeof closeBtn.click === "function") {
                event.preventDefault();
                event.stopPropagation();
                closeBtn.click();
                return;
            }
            return;
        }
        if (event.key !== "Tab") return;
        const target = event.target;
        if (target && typeof target.closest === "function") {
            const innerDialog = target.closest(".sw-platform-dialog");
            if (innerDialog && innerDialog !== root && root.contains(innerDialog)) return;
        }
        const focusables = Array.from(root.querySelectorAll(focusableSelector))
            .filter((el) => {
                if (typeof el.closest === "function") {
                    if (el.closest(".fn__none") || el.closest("[inert]")) return false;
                    const scopeDialog = el.closest(".sw-platform-dialog");
                    if (scopeDialog && scopeDialog !== root && root.contains(scopeDialog)) return false;
                }
                const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
                return style ? style.display !== "none" && style.visibility !== "hidden" : true;
            });
        if (focusables.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = root.ownerDocument?.activeElement;

        if (event.shiftKey) {
            if (active === first || !root.contains(active)) {
                event.preventDefault();
                try { last.focus({preventScroll: true}); } catch (_) { last.focus(); }
            }
        } else {
            if (active === last || !root.contains(active)) {
                event.preventDefault();
                try { first.focus({preventScroll: true}); } catch (_) { first.focus(); }
            }
        }
    };

    root.addEventListener("keydown", onKeydown);
    return () => {
        root.removeEventListener("keydown", onKeydown);
        if (root.dataset) delete root.dataset.swFocusTrapAttached;
        if (previousActive && typeof previousActive.focus === "function" && previousActive.isConnected) {
            try { previousActive.focus({preventScroll: true}); } catch (_) {}
        }
    };
}

function checkIsMobileFrontend(doc) {
    if (typeof window !== "undefined") {
        const w = window;
        if (w.siyuan?.config?.system?.container === "ios" || w.siyuan?.config?.system?.container === "android") return true;
        if (typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
        if (typeof w.innerWidth === "number" && w.innerWidth <= 768) return true;
    }
    const d = doc || (typeof document !== "undefined" ? document : null);
    const html = d ? d.documentElement : null;
    if (html && (html.classList.contains("body--mobile") || html.classList.contains("neo-mobile") || html.getAttribute("data-theme-mode") === "mobile")) return true;
    return false;
}

/**
 * 显式装配弹窗移动端关闭按钮（直连 dialog.destroy()），确保移动端 100% 具备可触控关闭出口。
 */
function mountPlatformDialogMobileClose(dialogElement, onClose, doc) {
    const root = dialogElement && typeof dialogElement.querySelector === "function" ? dialogElement : null;
    if (!root) return null;
    const header = root.querySelector(".b3-dialog__header");
    if (!header) return null;
    let btn = header.querySelector(".sw-dialog__mobile-close-btn");
    const d = doc || root.ownerDocument || document;
    if (!btn) {
        btn = createPlatformElement(d, "button", "b3-button b3-button--text sw-dialog__mobile-close-btn");
        btn.type = "button";
        btn.setAttribute("aria-label", "关闭");
        btn.setAttribute("title", "关闭");
        btn.innerHTML = '<svg width="18" height="18" aria-hidden="true"><use xlink:href="#iconClose"></use></svg>';
        header.appendChild(btn);
    }
    if (typeof onClose === "function") {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
    }
    return btn;
}

/**
 * 给思源原生 Dialog 标题栏装配统一的品牌标题栏规范（.lv-dialog-title-wrap）。
 * 包含 22×22 紫底白标 + 标题 + 版本胶囊，重复调用保持幂等。
 */
function mountPlatformDialogTitleWrap(dialogElement, titleText, badgeText, iconName = "iconLvSpeedSwitch", doc) {
    const root = dialogElement && typeof dialogElement.querySelector === "function" ? dialogElement : null;
    if (!root) return null;
    const header = root.querySelector(".b3-dialog__header");
    const titleEl = header && (header.querySelector(".b3-dialog__title") || (header.textContent && header.textContent.trim() ? header : null));
    if (!header || !titleEl) return null;
    const existing = header.querySelector(".lv-dialog-title-wrap");
    if (existing) return existing;
    const container = root.closest ? root.closest(".b3-dialog__container") || root : root;
    if (container && container.classList) container.classList.add("sw-platform-dialog");
    if (container && typeof container.setAttribute === "function") {
        if (!container.getAttribute("role")) container.setAttribute("role", "dialog");
        if (!container.getAttribute("aria-modal")) container.setAttribute("aria-modal", "true");
    }
    // T-7576: 自动装配无障碍焦点捕获循环
    trapDialogFocus(container);
    const d = doc || root.ownerDocument || document;
    const wrap = createPlatformElement(d, "div", "lv-dialog-title-wrap");
    const iconSpan = createPlatformElement(d, "span", "lv-dialog-title-icon");
    iconSpan.innerHTML = `<svg aria-hidden="true"><use xlink:href="#${iconName || "iconLvSpeedSwitch"}"></use></svg>`;
    const titleSpan = createPlatformElement(d, "span", "lv-dialog-title-text", titleText || "");
    wrap.append(iconSpan, titleSpan);
    if (badgeText) {
        const badgeSpan = createPlatformElement(d, "span", "lv-dialog-title-badge", badgeText);
        wrap.appendChild(badgeSpan);
    }
    if (titleEl === header) {
        Array.from(header.childNodes).forEach((node) => {
            if (node.nodeType === 3 || (node.classList && !node.classList.contains("b3-dialog__close") && !node.classList.contains("sw-platform-dialog__close-hint"))) {
                node.remove();
            }
        });
        header.insertBefore(wrap, header.firstChild || null);
    } else {
        titleEl.textContent = "";
        titleEl.appendChild(wrap);
    }
    const outerClose = root.querySelector && root.querySelector(".b3-dialog__container > .b3-dialog__close");
    if (outerClose && outerClose.style) {
        outerClose.style.setProperty("display", "none", "important");
    }
    // 为所有带标题栏的 Dialog 统一装配右上角 ✕ 关闭按钮（直连宿主关闭回调或 Esc 通道）
    if (!header.querySelector(".sw-dialog__mobile-close-btn")) {
        const mobileClose = createPlatformElement(d, "button", "b3-button b3-button--text sw-dialog__mobile-close-btn");
        mobileClose.type = "button";
        mobileClose.setAttribute("aria-label", "关闭");
        mobileClose.setAttribute("title", "关闭");
        mobileClose.innerHTML = '<svg width="18" height="18" aria-hidden="true"><use xlink:href="#iconClose"></use></svg>';
        mobileClose.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const nativeClose = root.querySelector(".b3-dialog__close:not(.sw-dialog__mobile-close-btn)");
            if (nativeClose && nativeClose !== mobileClose) {
                if (typeof nativeClose.click === "function") {
                    nativeClose.click();
                    return;
                }
                if (typeof nativeClose.dispatchEvent === "function") {
                    nativeClose.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                    return;
                }
            }
            const escEvent = new KeyboardEvent("keydown", {
                key: "Escape",
                code: "Escape",
                keyCode: 27,
                which: 27,
                bubbles: true,
                cancelable: true,
            });
            root.dispatchEvent(escEvent);
            if (root.ownerDocument?.defaultView) {
                root.ownerDocument.defaultView.dispatchEvent(escEvent);
            }
        });
        header.appendChild(mobileClose);
    }
    return wrap;
}

module.exports = {
    PLATFORM_STATUS_STATES,
    normalizePlatformStatusState,
    createPlatformStatus,
    createPlatformKbd,
    createPlatformSegmented,
    createPlatformPillAction,
    mountPlatformDialogCloseHint,
    mountPlatformDialogMobileClose,
    mountPlatformDialogTitleWrap,
    trapDialogFocus,
};
