const {normalizeQuickActionText, resolveIconReference} = require("./util.js");

function makeQuickEl(doc, tag) { return doc.createElement(tag); }
function getAvailableSymbolIds(document) {
    return new Set(Array.from(document.querySelectorAll("symbol[id]")).map((symbol) => symbol.id));
}

function appendIcon(document, host, icon, fallback = "iconFile") {
    const iconHost = makeQuickEl(document, "span");
    iconHost.className = "sw-setting__picker-icon";
    const resolved = resolveIconReference(icon, getAvailableSymbolIds(document), fallback);
    if (resolved.type === "image") {
        const image = makeQuickEl(document, "img");
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.src = resolved.value;
        image.className = "sw-setting__picker-icon-image";
        iconHost.appendChild(image);
    } else if (resolved.type === "emoji") {
        iconHost.textContent = resolved.value;
        iconHost.classList.add("sw-setting__picker-icon--emoji");
    } else {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `#${resolved.value}`);
        use.setAttribute("xlink:href", `#${resolved.value}`);
        svg.appendChild(use);
        iconHost.appendChild(svg);
    }
    host.appendChild(iconHost);
}

/**
 * Mounts a picker inside the settings panel. Keeping it in the dialog's own
 * scroll tree avoids SiYuan Menu positioning/z-index differences on Android.
 */
function mountQuickActionPicker(options) {
    const {trigger, host, candidates, searchPlaceholder, emptyText, onSelect} = options;
    const normalizedCandidates = (Array.isArray(candidates) ? candidates : []).map((candidate) => ({
        ...candidate,
        label: normalizeQuickActionText(candidate?.label, 24) || normalizeQuickActionText(candidate?.id, 24),
        group: normalizeQuickActionText(candidate?.group, 32),
        secondary: normalizeQuickActionText(candidate?.secondary, 80),
        searchText: normalizeQuickActionText(candidate?.searchText, 160),
    }));
    const existing = host.querySelector(".sw-setting__quick-picker");
    if (existing) {
        existing.remove();
        trigger.setAttribute("aria-expanded", "false");
        return null;
    }

    const document = host.ownerDocument;
    const picker = makeQuickEl(document, "div");
    picker.className = "sw-setting__quick-picker";
    const search = makeQuickEl(document, "input");
    search.type = "search";
    search.className = "b3-text-field sw-setting__quick-picker-search";
    search.placeholder = searchPlaceholder || "";
    search.setAttribute("aria-label", searchPlaceholder || "Search");
    const results = makeQuickEl(document, "div");
    results.className = "sw-setting__quick-picker-results";
    picker.append(search, results);
    host.appendChild(picker);
    const closePicker = () => {
        trigger.setAttribute("aria-expanded", "false");
        picker.remove();
        if (trigger && typeof trigger.focus === "function") {
            try { trigger.focus({preventScroll: true}); } catch (_) { trigger.focus(); }
        }
    };

    const render = () => {
        const keyword = search.value.trim().toLocaleLowerCase();
        const visible = normalizedCandidates.filter((candidate) => !keyword
            || String(candidate.searchText || `${candidate.label} ${candidate.secondary || ""}`)
                .toLocaleLowerCase().includes(keyword));
        results.innerHTML = "";
        if (visible.length === 0) {
            const empty = makeQuickEl(document, "div");
            empty.className = "sw-setting__quick-picker-empty";
            empty.textContent = emptyText || "";
            results.appendChild(empty);
            return;
        }
        const groups = new Map();
        visible.forEach((candidate) => {
            const key = candidate.group || "";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(candidate);
        });
        groups.forEach((items, group) => {
            const section = makeQuickEl(document, "section");
            section.className = "sw-setting__quick-picker-group";
            const headingText = group || "\u00A0";
            if (group) {
                const heading = makeQuickEl(document, "div");
                heading.className = "sw-setting__quick-picker-heading";
                heading.textContent = group;
                heading.style.cursor = "pointer";
                heading.setAttribute("role", "button");
                heading.setAttribute("aria-expanded", "true");
                heading.addEventListener("click", () => {
                    const collapsed = grid.style.display === "none";
                    grid.style.display = collapsed ? "" : "none";
                    heading.setAttribute("aria-expanded", String(collapsed));
                });
                section.appendChild(heading);
            }
            const grid = makeQuickEl(document, "div");
            grid.className = "sw-setting__quick-picker-grid";
            items.forEach((candidate) => {
                const button = makeQuickEl(document, "button");
                button.type = "button";
                button.className = "sw-setting__quick-picker-item";
                button.dataset.candidateId = candidate.id;
                appendIcon(document, button, candidate.icon, candidate.fallbackIcon || "iconFile");
                const copy = makeQuickEl(document, "span");
                copy.className = "sw-setting__quick-picker-copy";
                const label = makeQuickEl(document, "span");
                label.className = "sw-setting__quick-picker-label";
                label.textContent = candidate.label;
                copy.appendChild(label);
                if (candidate.secondary) {
                    const secondary = makeQuickEl(document, "span");
                    secondary.className = "sw-setting__quick-picker-secondary";
                    secondary.textContent = candidate.secondary;
                    copy.appendChild(secondary);
                }
                button.appendChild(copy);
                button.addEventListener("click", () => {
                    closePicker();
                    onSelect(candidate);
                });
                grid.appendChild(button);
            });
            section.appendChild(grid);
            results.appendChild(section);
        });
    };

    search.addEventListener("input", render);
    search.addEventListener("focus", () => {
        if (search.value) search.select();
    });
    picker.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (document.activeElement === search && search.value) {
                event.preventDefault();
                search.value = "";
                render();
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            closePicker();
            return;
        }
        if (event.key === "ArrowDown" && document.activeElement === search) {
            const firstButton = results.querySelector("button.sw-setting__quick-picker-item:not(:disabled)");
            if (firstButton) {
                event.preventDefault();
                firstButton.focus({preventScroll: true});
                firstButton.scrollIntoView?.({block: "nearest"});
                return;
            }
        }
        if (event.key === "Enter" && document.activeElement === search) {
            const firstButton = results.querySelector("button.sw-setting__quick-picker-item:not(:disabled)");
            if (firstButton) {
                event.preventDefault();
                firstButton.click();
            }
        }
    });
    results.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const buttons = Array.from(results.querySelectorAll("button.sw-setting__quick-picker-item:not(:disabled)"));
            const idx = buttons.indexOf(document.activeElement);
            if (idx >= 0) {
                if (event.key === "ArrowUp" && idx === 0) {
                    event.preventDefault();
                    search.focus({preventScroll: true});
                    return;
                }
                event.preventDefault();
                const nextIdx = (idx + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
                buttons[nextIdx]?.focus({preventScroll: true});
                buttons[nextIdx]?.scrollIntoView?.({block: "nearest"});
            }
        }
        if (event.key === "Home" || event.key === "End") {
            const buttons = Array.from(results.querySelectorAll("button.sw-setting__quick-picker-item:not(:disabled)"));
            if (buttons.length > 0) {
                event.preventDefault();
                const target = event.key === "Home" ? buttons[0] : buttons[buttons.length - 1];
                target?.focus({preventScroll: true});
                target?.scrollIntoView?.({block: "nearest"});
            }
        }
    });
    render();
    search.focus({preventScroll: true});
    trigger.setAttribute("aria-expanded", "true");
    return picker;
}

module.exports = {mountQuickActionPicker};
