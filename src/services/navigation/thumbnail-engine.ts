import {
    CONTENT_WIDTH_PX,
    THUMB_API_MAX,
    THUMB_API_MAX_MOBILE,
    THUMB_CLONE_MAX,
} from "../../constants";
import { logger } from "../../logger";

import { trimLeadingBlankThumbNodes, hasVisibleThumbContent } from "../../util";

export interface IThumbnailEngineDeps {
    isMobile: () => boolean;
    scheduleAnimationFrame?: (cb: () => void) => void;
}

export class ThumbnailEngine {
    private readonly isMobile: () => boolean;
    private readonly scheduleRaf: (cb: () => void) => void;

    public pendingThumbScales: Array<{ thumb: HTMLElement; content: HTMLElement; tries?: number }> = [];
    public thumbScaleFramePending = false;
    private thumbApiActive = 0;
    private thumbApiQueue: Array<() => void> = [];
    private thumbApiControllers = new Map<HTMLElement, AbortController>();
    private sanitizedFragmentCache = new Map<string, DocumentFragment>();

    constructor(deps: IThumbnailEngineDeps) {
        this.isMobile = deps.isMobile;
        this.scheduleRaf = deps.scheduleAnimationFrame || ((cb) => {
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(cb);
            } else if (typeof setTimeout === "function") {
                setTimeout(cb, 16);
            } else {
                cb();
            }
        });
    }

    public sanitizeThumbHtml(html: string): DocumentFragment | null {
        if (typeof DOMParser !== "function") return null;
        const cached = this.sanitizedFragmentCache.get(html);
        if (cached) {
            return cached.cloneNode(true) as DocumentFragment;
        }
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const fragment = parsed.createDocumentFragment();
        const stripTags = new Set([
            "script", "style", "iframe", "object", "embed", "link", "meta", "base",
            "template", "form", "input", "button", "textarea", "select", "audio",
            "video", "source", "track",
        ]);
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
        if (this.sanitizedFragmentCache.size >= 48) {
            const firstKey = this.sanitizedFragmentCache.keys().next().value;
            if (firstKey !== undefined) this.sanitizedFragmentCache.delete(firstKey);
        }
        this.sanitizedFragmentCache.set(html, fragment.cloneNode(true) as DocumentFragment);
        return fragment;
    }

    public applyThumbContent(thumb: HTMLElement, source: HTMLElement, title: string): boolean {
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

        content.style.visibility = "hidden";
        this.pendingThumbScales.push({ thumb, content, tries: 0 });
        if (!this.thumbScaleFramePending) {
            this.thumbScaleFramePending = true;
            this.scheduleRaf(() => this.flushPendingThumbScales());
        }
        content.setAttribute("aria-label", title);
        return true;
    }

    public flushPendingThumbScales(): void {
        this.thumbScaleFramePending = false;
        const batch = this.pendingThumbScales.splice(0);
        const measured: Array<{ el: HTMLElement; width: number }> = [];
        const deferred: Array<{ thumb: HTMLElement; content: HTMLElement; tries: number }> = [];
        for (let i = 0; i < batch.length; i += 1) {
            const entry = batch[i];
            if (!entry.thumb.isConnected) {
                if ((entry.tries || 0) < 60) deferred.push({ thumb: entry.thumb, content: entry.content, tries: (entry.tries || 0) + 1 });
                continue;
            }
            measured.push({
                el: entry.content,
                width: entry.thumb.clientWidth || entry.thumb.getBoundingClientRect().width,
            });
        }
        for (let i = 0; i < measured.length; i += 1) {
            const { el, width } = measured[i];
            if (width > 0) {
                el.style.transform = `scale(${(width / CONTENT_WIDTH_PX).toFixed(3)})`;
            }
            el.style.visibility = "visible";
        }
        if (deferred.length > 0) {
            this.pendingThumbScales.unshift(...deferred);
            if (!this.thumbScaleFramePending) {
                this.thumbScaleFramePending = true;
                this.scheduleRaf(() => this.flushPendingThumbScales());
            }
        }
    }

    public rescaleThumbs(container: HTMLElement): void {
        const thumbs = container.querySelectorAll<HTMLElement>(".sw__thumb");
        const measured: Array<{ content: HTMLElement; width: number }> = [];
        for (let i = 0; i < thumbs.length; i += 1) {
            const thumb = thumbs[i];
            const content = thumb.querySelector<HTMLElement>(".sw__thumb-content");
            const width = thumb.clientWidth;
            if (content && width > 0) measured.push({ content, width });
        }
        for (let i = 0; i < measured.length; i += 1) {
            const { content, width } = measured[i];
            content.style.transform = `scale(${(width / CONTENT_WIDTH_PX).toFixed(3)})`;
            content.style.visibility = "visible";
        }
    }

    public cancelThumbFetches(): void {
        this.thumbApiControllers.forEach((controller) => {
            try { controller.abort(); } catch { /* ignore */ }
        });
        this.thumbApiControllers.clear();
    }

    public async acquireThumbApi(): Promise<void> {
        const max = this.isMobile() ? THUMB_API_MAX_MOBILE : THUMB_API_MAX;
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

    public releaseThumbApi(): void {
        this.thumbApiActive--;
        const next = this.thumbApiQueue.shift();
        if (next) {
            next();
        }
    }

    public cloneLimitedContent(source: HTMLElement, max: number): HTMLElement {
        const clone = source.cloneNode(false) as HTMLElement;
        const children = source.children;
        const count = Math.min(children.length, max);
        for (let i = 0; i < count; i += 1) {
            clone.appendChild(children[i].cloneNode(true));
        }
        return clone;
    }

    public getThumbSource(tab: any): HTMLElement | null {
        try {
            const model = (tab as unknown as { model?: { editor?: { wysiwyg?: { element?: HTMLElement } } } }).model;
            const wysiwyg = model?.editor?.wysiwyg?.element;
            if (wysiwyg && wysiwyg.childElementCount > 0) {
                const clone = wysiwyg.cloneNode(false) as HTMLElement;
                const limit = Math.min(wysiwyg.children.length, THUMB_CLONE_MAX);
                for (let i = 0; i < limit; i += 1) clone.appendChild(wysiwyg.children[i].cloneNode(true));
                return clone;
            }
            const panelWysiwyg = tab.panelElement?.querySelector?.(".protyle-wysiwyg") as HTMLElement | null;
            if (panelWysiwyg && panelWysiwyg.childElementCount > 0) {
                const clone = panelWysiwyg.cloneNode(false) as HTMLElement;
                const limit = Math.min(panelWysiwyg.children.length, THUMB_CLONE_MAX);
                for (let i = 0; i < limit; i += 1) clone.appendChild(panelWysiwyg.children[i].cloneNode(true));
                return clone;
            }
            if (tab.panelElement && tab.panelElement.childElementCount > 0) {
                const clone = tab.panelElement.cloneNode(false) as HTMLElement;
                const limit = Math.min(tab.panelElement.children.length, THUMB_CLONE_MAX);
                for (let i = 0; i < limit; i += 1) clone.appendChild(tab.panelElement.children[i].cloneNode(true));
                return clone;
            }
        } catch (e) {
            logger.warn("build thumbnail fail", e);
        }
        return null;
    }
}
