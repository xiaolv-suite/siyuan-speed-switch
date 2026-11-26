import {PLATFORM_SURFACE_IDS, buildSurfaceContextCaption} from "../platform-surface-model";
import {createPlatformKbd, createPlatformStatus} from "../platform-dom";
import type {
    PlatformSurface,
    PlatformSurfaceLabels,
    PlatformSurfaceChromeOptions,
} from "./plugin-types";

export const PLATFORM_SURFACES: readonly PlatformSurface[] = PLATFORM_SURFACE_IDS as readonly PlatformSurface[];

function normalizePlatformText(value: unknown, fallback: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    return normalized || fallback;
}

export function resolvePlatformSurfaceLabels(i18n: Record<string, string> = {}): PlatformSurfaceLabels {
    return {
        platformName: normalizePlatformText(i18n.platformName, "小驴雷切"),
        platformSubtitle: normalizePlatformText(i18n.platformSubtitle, "工作上下文平台"),
        contextLabel: normalizePlatformText(i18n.platformContext, "工作上下文"),
        surfaces: {
            switcher: normalizePlatformText(i18n.platformSwitcher, normalizePlatformText(i18n.switchTabs, "切换器")),
            workbench: normalizePlatformText(i18n.platformWorkbench, normalizePlatformText(i18n.secondPanel, "工作台")),
            studio: normalizePlatformText(i18n.platformStudio, normalizePlatformText(i18n.snippetStudioTitle, "片段实验室")),
        },
        hints: {
            switcher: normalizePlatformText(i18n.platformSwitcherHint, "查找、预览和打开内容"),
            workbench: normalizePlatformText(i18n.platformWorkbenchHint, "编排信息组件和工作现场"),
            studio: normalizePlatformText(i18n.platformStudioHint, "安全编辑、预览和管理代码片段"),
        },
    };
}

function removePlatformChrome(root: HTMLElement): void {
    Array.from(root.children).forEach((child) => {
        if (child.classList.contains("sw-platform-chrome")) child.remove();
    });
}

export function mountPlatformChrome(root: HTMLElement, options: PlatformSurfaceChromeOptions): HTMLElement {
    removePlatformChrome(root);
    const doc = root.ownerDocument || document;
    const available = new Set(options.available || PLATFORM_SURFACES);
    const chrome = doc.createElement("div");
    chrome.className = "sw-platform-chrome sw-platform-shell";
    chrome.dataset.platformSurface = options.surface;

    const header = doc.createElement("header");
    header.className = "sw-platform-header";
    header.setAttribute("aria-label", options.labels.platformName);
    const brand = doc.createElement("div");
    brand.className = "sw-platform-header__brand";
    const brandMark = doc.createElement("span");
    brandMark.className = "sw-platform-header__brand-mark";
    brandMark.setAttribute("aria-hidden", "true");
    brandMark.textContent = "驴";
    const brandCopy = doc.createElement("span");
    brandCopy.className = "sw-platform-header__brand-copy";
    const brandName = doc.createElement("strong");
    brandName.className = "sw-platform-header__brand-name";
    brandName.textContent = options.labels.platformName;
    const brandSubtitle = doc.createElement("span");
    brandSubtitle.className = "sw-platform-header__brand-subtitle";
    brandSubtitle.textContent = options.labels.platformSubtitle;
    brandCopy.append(brandName, brandSubtitle);
    brand.append(brandMark, brandCopy);

    const nav = doc.createElement("nav");
    nav.className = "sw-platform-surface-nav";
    nav.setAttribute("aria-label", options.labels.contextLabel);
    PLATFORM_SURFACES.forEach((surface) => {
        if (!available.has(surface)) return;
        const navigable = surface !== options.surface && typeof options.onNavigate === "function";
        if (surface !== options.surface && !navigable) return;
        const control = doc.createElement("button");
        control.type = "button";
        control.className = "sw-platform-surface-nav__item";
        control.dataset.surface = surface;
        if (!navigable) {
            control.setAttribute("aria-disabled", "true");
        }
        const surfaceIcon = doc.createElement("svg");
        surfaceIcon.className = "sw-platform-surface-nav__icon";
        surfaceIcon.setAttribute("aria-hidden", "true");
        surfaceIcon.innerHTML = `<use xlink:href="#${surface === "switcher" ? "iconLayout" : surface === "workbench" ? "iconLayoutHome" : "iconCode"}"></use>`;
        const surfaceLabel = doc.createElement("span");
        surfaceLabel.className = "sw-platform-surface-nav__label";
        surfaceLabel.textContent = options.labels.surfaces[surface];
        const surfaceHint = options.labels.hints[surface];
        const copy = doc.createElement("span");
        copy.className = "sw-platform-surface-nav__copy";
        copy.appendChild(surfaceLabel);
        if (surfaceHint) {
            const hint = doc.createElement("span");
            hint.className = "sw-platform-surface-nav__hint";
            hint.textContent = surfaceHint;
            copy.appendChild(hint);
        }
        control.append(surfaceIcon, copy);
        control.setAttribute("aria-label", surfaceHint
            ? `${options.labels.surfaces[surface]}：${surfaceHint}`
            : options.labels.surfaces[surface]);
        control.setAttribute("title", surfaceHint
            ? `${options.labels.surfaces[surface]}：${surfaceHint}`
            : options.labels.surfaces[surface]);
        if (surface === options.surface) {
            control.classList.add("is-active");
            control.setAttribute("aria-current", "page");
            control.setAttribute("aria-label", `${options.labels.surfaces[surface]}（当前）`);
        }
        if (navigable) {
            control.type = "button";
            control.addEventListener("click", () => options.onNavigate?.(surface));
        }
        nav.appendChild(control);
    });
    const actions = doc.createElement("div");
    actions.className = "sw-platform-header__actions";
    if (options.status?.label) {
        actions.appendChild(createPlatformStatus(doc, options.status.state || "ready", options.status.label));
    }
    if (options.onSettings) {
        const settings = doc.createElement("button");
        settings.type = "button";
        settings.className = "b3-button b3-button--text sw-platform-header__icon-action sw-platform-header__settings";
        settings.setAttribute("aria-label", options.settingsLabel || "Settings");
        settings.title = options.settingsLabel || "Settings";
        settings.innerHTML = '<svg><use xlink:href="#iconSettings"></use></svg>';
        settings.addEventListener("click", () => options.onSettings?.());
        actions.appendChild(settings);
    }
    if (options.onHelp) {
        const help = doc.createElement("button");
        help.type = "button";
        help.className = "b3-button b3-button--text sw-platform-header__icon-action sw-platform-header__help";
        const helpLabel = options.helpLabel || "Quick start";
        help.setAttribute("aria-label", helpLabel);
        help.title = helpLabel;
        help.innerHTML = '<svg><use xlink:href="#iconHelp"></use></svg>';
        const helpText = doc.createElement("span");
        helpText.className = "sw-platform-header__help-label";
        helpText.textContent = helpLabel;
        help.appendChild(helpText);
        help.addEventListener("click", () => options.onHelp?.());
        actions.appendChild(help);
    }
    if (options.onClose) {
        const closeGroup = doc.createElement("span");
        closeGroup.className = "sw-platform-header__close-group";
        const closeHint = doc.createElement("span");
        closeHint.className = "sw-platform-header__close-hint";
        closeHint.setAttribute("aria-label", options.closeHint || "Escape to close");
        closeHint.appendChild(createPlatformKbd(doc, "Esc"));
        const closeHintLabel = doc.createElement("span");
        closeHintLabel.className = "sw-platform-header__close-hint-label";
        closeHintLabel.textContent = options.closeHint || "to close";
        closeHint.appendChild(closeHintLabel);
        closeGroup.appendChild(closeHint);
        const close = doc.createElement("button");
        close.type = "button";
        close.className = "b3-button b3-button--text sw-platform-header__close";
        close.setAttribute("aria-label", options.closeLabel || "Close");
        close.title = options.closeLabel || "Close";
        close.innerHTML = '<svg><use xlink:href="#iconClose"></use></svg>';
        close.addEventListener("click", () => options.onClose?.());
        close.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                options.onClose?.();
            }
        });
        closeGroup.appendChild(close);
        actions.appendChild(closeGroup);
    }
    header.append(brand, nav, actions);

    const context = doc.createElement("div");
    context.className = "sw-platform-context";
    context.setAttribute("role", "group");
    context.setAttribute("aria-label", options.labels.contextLabel);
    const trail = doc.createElement("span");
    trail.className = "sw-platform-context__trail";
    trail.textContent = options.labels.contextLabel;
    const separator = doc.createElement("span");
    separator.className = "sw-platform-context__separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "›";
    const object = doc.createElement("strong");
    object.className = "sw-platform-context__object";
    const caption = buildSurfaceContextCaption({surface: options.surface, context: options.context, labels: options.labels});
    object.textContent = caption.object;
    const hint = doc.createElement("span");
    hint.className = "sw-platform-context__hint";
    hint.textContent = caption.hint;
    if (caption.hasQuery) hint.title = caption.hint;
    context.append(trail, separator, object, hint);
    if (options.kbdHints && options.kbdHints.length > 0) {
        const kbdHints = doc.createElement("span");
        kbdHints.className = "sw-platform-context__kbd-hints";
        options.kbdHints.forEach((text) => {
            const trimmed = typeof text === "string" ? text.trim() : "";
            if (trimmed) kbdHints.appendChild(createPlatformKbd(doc, trimmed));
        });
        if (kbdHints.childElementCount > 0) context.appendChild(kbdHints);
    }
    chrome.append(header, context);
    root.prepend(chrome);
    root.closest(".b3-dialog__container")?.classList.add("sw-platform-dialog--chromed");
    return chrome;
}
