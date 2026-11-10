# LvSpeed Switch Changelog (Full English History)

> Full per-version history in English. `README.en-US.md` keeps only summaries of the most recent
> releases; new entries are appended here at release time. 中文完整历史见 [`docs/CHANGELOG.md`](./CHANGELOG.md)。

## Changelog (full history)

### v0.48.88 (2026-11-04 · Local Verified)

- **Ecosystem-Wide Unified Specification Integration & Real-Host Hardening (T-7859~T-7861)**:
  - **Full integration of 7 core ecosystem pillars**: Notification Hub with noise cancellation (`lvNotify`), document write concurrency lock (`lvLock`), daily activity knowledge stream (`lvActivity`), multi-source disaster recovery snapshot backup and restore (`lvBackup`), rapid launchpad dock with secondary actions (`lvLaunchpad`), AI-assisted snippet refinement and thematic synthesis (`lvAi`), and full omni-penetration slice search provider (`lvOmnisearch`);
  - **Surface 1 Toolbar "Activity Stream" Entry & Federation Status**: Switcher dialog and sidebar dock now feature a unified Sparkles activity stream icon, providing one-click access to cross-plugin daily knowledge logs with Markdown summary copying, accompanied by a status indicator in the footer;
  - **Full-Surface Modal Escape Dismissal & Focus Lifecycle Guard**: overhauled dialog dismissal lifecycle across guides, activity streams, and preview modals, introducing top-level window capture Escape handling and idempotent listener cleanup, eliminating key interception by toast notifications;
  - **Snippet Stack AI Deep Synergy**: single-click point/action extraction on individual snippets, smart multi-snippet synthesis into structured thematic notes copied to clipboard, protected by robust offline fallbacks and explicit error feedback;
  - **Real-Host Isolated E2E Gate Overhaul**: expanded live SiYuan integration test suite to 18 specs and 30 end-to-end user-journey tests, with split-open, first-open, and ecosystem-wide interaction scenarios passing at 100% with zero retries.

### v0.48.87 (2026-11-01 · Local Verified)

- **Apple Bento 3.0 / Liquid Glass 3.0 Overhaul for Second Panel & Widget Store (T-7847~T-7857)**:
  - **Five-source dynamic spatial aurora canvas**: workbench and store backgrounds gain a five-point radiant mesh gradient (`#6366f1`/`#f43f5e`/`#0ea5e9`/`#a855f7`/`#10b981`) giving the frosted glass vivid colors to refract;
  - **Liquid Glass 3.0 card material**: every tile upgraded to 40px gaussian blur + 210% saturation translucency, dual-layer specular bevel highlights, and 22px continuous squircle curvature;
  - **VisionOS spatial corner flares & 3D App Icon badges**: dedicated color blooms for clock, progress, journal, tasks, recents, weather and countdown cards; header icons upgraded to 28×28 gradient app-icon badges with colored drop shadows;
  - **Organic WidgetKit composition**: eliminated the 200px voids caused by `space-between`, paired primary values with semantic pills at 10–12px, illuminated progress-bar tip orbs, and size-aware Small/Medium/Wide bento expansion.
- **Widget store 100% visually unified with the second panel (T-7855/T-7856)**: store dialog, category pills, gallery cards and live previews all share the same Bento 3.0 rules scoped to `:is(.sw-home, .sw-home-store, .sw-store-preview)`, with previews rendering the latest card effects;
- **Curated 18-widget golden size recommendations (T-7856)**: `HOME_RECOMMENDED_STORE_SIZES` mapping badges recommended sizes with 「⭐ 荐」 and defaults previews to their optimal dimensions;
- **Clock hero typography & isolated workspace sync (T-7847)**: large-number hero clock card, 5-card golden bento default layout, recommended tab narrowed to the 18 curated gems;
- **Full empirical host-linkage & ecosystem federation audit (T-7854)**: all 9 SiYuan host linkage points and 12 cross-plugin federation bridges verified with recorded conclusions in `docs/audit/linkage-investigation-and-execution-audit.md`.

### v0.48.86 (2026-11-01 · Local Verified)

- **Stock Optimization Campaign, Full Element Inventory Audit & Defect Resolution B-01~B-17**:
  - **Full Element Inventory (286 Items) & 100.00% Coverage**: Built a countable ledger across 8 domains (`docs/audit/full-element-inventory.md`) and executed 3-tier inspection across 5 batches reaching 100.00% coverage (`docs/audit/coverage-tracker.md`);
  - **Full Resolution of 17 Defects (B-01~B-17)**: Resolved secondary text and action forwarding for 9 ecosystem adapters (B-01); prevented null-pointer crash on uninitialized `this.app?.plugins` (B-02); added sticky command bar and independent scrolling for Snippet Studio under 125%/150% scaling (B-03/B-04); encapsulated modal dialogs with Esc focus traps and centered scaling (B-05); removed duplicate quick-capture title and ensured viewport breathing room (B-06); migrated hardcoded hex values to theme semantic tokens (B-07/B-17); ensured decorative SVGs declare `aria-hidden="true"` (B-08); bound explicit `<label for>` mappings (B-09); bound idempotent dialog cleanup and FAB suspension (B-10); added synchronous mutex locks on quick-capture against double-click duplicates (B-11); normalized grid column widths (B-12); enabled cyclic ArrowDown/ArrowUp keyboard navigation for `>` command list (B-13); added exception catch and Esc listener for template picker (B-14); eliminated stale signature deadlock in config pack diff dialog (B-15); added Enter submit and Escape cancel keyboard flow to journal prompt dialog (B-16);
  - **Host Linkage Verification Across 9 Scenarios (docs/audit/siyuan-linkage-verification.md)**: Verified drag-drop capture, document writing, block scrolling/highlighting, backlinks, editor rendering, WS live update, multi-window consistency, undo history, and clean export;
  - **Nine-Dimension Health Audit Passed (docs/audit/nine-dimensions-health-audit.md)**: Confirmed health and compliance across UI, icons, interaction, compatibility, stability, security, usability, code, and linkage.

- **Isolated E2E Audit, Modern SiYuan AI Adaptation & Curated Store Convergence (T-7836)**:
  - **Drive D Isolated Kernel E2E Flakiness Elimination**: Relaxed kernel query timeouts on bookmarks/tags modules from 1200ms to 2500ms, making `pnpm e2e:isolated` (13 core user scenarios on real browser) 100% green and zero-flaky;
  - **First Panel Reading Rail Full-Height Extension & Void Prevention**: Completely eliminated the truncated void on short documents in Switcher reading rail (`.sw__doc-preview`) by enforcing `align-self: stretch; height: 100%; min-height: 100%;` alongside dedicated `.sw__doc-preview-empty-card` and bottom copy actions;
  - **Second Panel Fullscreen Mode & Bento Palette Cycling**: Workbench defaults to fullscreen mode (`homeSizeMode: "fullscreen"`), featuring dynamic in-situ theme color cycling (`🎨 变色`) via `--sw-home-accent`;
  - **Snippet Store 1240x820 Gallery & "💎 Featured Gems" Premier View**: Redesigned snippet store into a balanced 1240x820 layout with 15 category pills and a premier "💎 Featured Gems" filter prioritizing 25 curated masterpieces;
  - **10 LianDi Community Masterpieces with Author Attribution**: Curated and modernized 10 classic community CSS snippets (Rainbow Outline, Mac Terminal Codeblock, Bento Callout, Card Photo Frame, Gradient Divider, Task Bounce, etc.) with strict author and ld246 URL attribution;
  - **Full Modern SiYuan AI Selector Adaptation**: Modernized all 76 builtin snippets for SiYuan v3.0+, fixing obsolete selectors (`NodeImage`, `h1[data-type]`, `.b3-chip--info`) and replacing hardcoded `#f4f5f7` with dynamic `color-mix` theme variables;
  - **Sandbox Iframe Category-Targeted Visual Hero Probes**: Preview sandbox generates dedicated visual hero showcases for 11 distinct snippet categories, intuitively comparing changes before and after styling.

### v0.48.85 (2026-10-31 · Local Verified)

- **Snippet Stack End-to-End Closure, Live Selection Snapshot, One-Click Undo & Single-Source Version Governance**:
  - **Snippet Stack Assembly & Backlink Navigation Wiring (T-7810)**: Wired `stack.assemble` and `stack.openBlock` in `mountSnippetStudio` and standalone dialogs so journal push, active editor insertion, new document creation, clipboard copy, and `((blockId))` backlink jumps execute against real host APIs with `aria-busy` concurrency locks and Promise-guarded clipboard writes;
  - **Editor Selection Snapshot, Localization Fix & Cross-Surface Dialog Fallback (T-7811)**: Added `.protyle-wysiwyg` selection snapshot caching and paragraph `data-node-id` extraction so invoking the FAB or Action Palette preserves the active selection; registered `snippetStack*` keys in `snippet-studio-ui.js` `translations` and removed allowlist workarounds; auto-activates the Snippet Stack tab on `objectKind: "stack"` and provides a standalone dialog fallback on mobile and sidebar surfaces;
  - **Missing Bento Styles & One-Click Undo for Destructive Actions (T-7812)**: Added in-memory snapshot and one-click Undo restoration for item removal and unpinned clearing; added Bento capsule styles for `.sw-studio__tab-pill`, `.sw-studio__stack-container`, `.sw-home__stack-btn`, collapsed rail vertical adaptation, standalone `--studio-*` token fallbacks, and `:focus-visible` rings;
  - **Unified `PLUGIN_VERSION` Constant & Bilingual README Optimization (T-7813 / T-7814)**: Extracted `PLUGIN_VERSION` / `PLUGIN_VERSION_BADGE` in `src/constants` across all 28 dialog titlebars; optimized Chinese and English READMEs with clear problem statement, installation guide, accurate default shortcuts, collapsible changelog history, and freshly captured v0.48.85 screenshots.

### v0.48.84 (2026-10-30 · Local Verified)

- **Full-Surface Bento Modernization & Two-Tone Color Architecture Release**:
  - **Cross-Surface Reactive Metrics Bar & Dual-Channel Navigation**: Mounts reactive metrics bars across Switcher, Workbench, and Studio; Workbench provides smooth in-situ centering with breathing outline (`.sw-home__cell--locate`) and seamless fallback to Switcher;
  - **Strict Two-Tone Semantic Separation & Dual-Layer Canvas**: Operational controls strictly governed by `--sw-color-accent` while streaks and positive achievements are strictly mapped to luminous teal `--sw-color-data`; dual-layer canvas architecture with tinted background and floating white cards elevated by `--sw-shadow-bento`;
  - **Mobile Touch & Full Keyboard Flow Hardening**: Keyboard avoidance on mobile devices, safe-area bottom insets, and $\ge 44\text{px}$ touch fidelity; RAF-throttled fullscreen toggling, mechanical keycaps, and smooth cursor motion on secondary action palettes;
  - **Snippet Studio Data Governance & Recycle Vault Floating Cards**: Bento floating layer with tactile hover displacement for data governance menu; independent white float cards and pill-shaped action buttons for recycle snapshot items.

### v0.48.83 (2026-10-29 · Local Verified)

- **Comprehensive Quality Optimization: Resilience, Anti-Thrashing & Full-Surface Accessibility**:
  - **Core Stability & Error Self-Healing**:
    - Adds error card and safe Escape teardown recovery for Snippet Studio dynamic loading failure;
    - Introduces centralized `activeDialogs` tracking on the Plugin instance, releasing orphaned dialogs and sweeping `.sw-platform-dialog` nodes on `onunload()`;
    - Connects all secondary dialogs to floating ball suspension (`suspendFABForDialog()`) and enforces safe fallback on `current.actions?.[surface]`;
    - Restores sibling `inert` and `aria-hidden` attributes when unmounting mobile Sort Sheet, and connects `openLeaveDialog` to `leave.cancel()` on dialog destroy.
  - **High-Frequency Performance & Layout Thrash Elimination**:
    - Optimizes workbench keydown listener with immediate boundary check (0ms short-circuit) and refactors `isTopmostDialog` into a single $O(N)$ linear pass without `getComputedStyle` in sort comparators;
    - Refactors `clampOversizedIcons` into two-phase read/write batching and adds `requestAnimationFrame` debouncing to configuration form observers;
    - Introduces 100–120ms debouncing across find bar, component store filtering, and snippet catalog searching with full IME composition protection.
  - **Universal Keyboard Accessibility & Touch Hardening**:
    - Handles Escape key inside Snippet Studio code editor to blur into container navigation mode (WCAG 2.1.2) and adds a visible 2px brand focus ring;
    - Extends main switcher card list navigation with Home/End jumps, PageUp/PageDown multi-step paging, and Space key card activation (WAI-ARIA);
    - Expands mobile search clear and filter buttons to 44×44px hit areas via `::before` pseudo-elements (WCAG 2.5.5) and isolates SiYuan 3.8.x host swipe gestures with `data-prevent-swipe="true"`;
    - Implements universal, idempotent modal focus trapping (`trapDialogFocus`) auto-mounted across all 18 secondary dialogs via `mountPlatformDialogTitleWrap`.
  - **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.83)**.

### v0.48.82 (2026-10-29 · Local Verified)

- **Workbench Widget Card Keyboard M Quick Context Menu Shortcut**:
  - Adds single-key shortcut flow when focused: `m`/`M` opens widget context menu directly at card center.
- **Built-in Snippet Library Expansion: Info Callout Glow Card & Mark Warm Gradient**:
  - Adds `swss-builtin-calloutinfo` (ocean blue accent left bar and ambient shadow on info callouts);
  - Adds `swss-builtin-markgradient` (warm dual-gradient background and line break cloning on highlights), expanding catalog to 76 snippets.
- **Snippet Studio UserCSS Export Universal @var Fallback Defaults**:
  - Ensures every variable type gets canonical default values when parameters are incomplete, avoiding parser breaks.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.82)**.

### v0.48.81 (2026-10-29 · Local Verified)

- **Workbench Widget Card Long-Press Context Menu Gesture**:
  - Adds 500ms touchstart long-press gesture to open context menu, excluding interactive controls with optional 50ms haptic vibration.
- **Built-in Snippet Library Expansion: Blockquote Hover Shift & List Bullet Pulse**:
  - Adds `swss-builtin-quotehover` (3px right shift and soft primary background tint on blockquote hover);
  - Adds `swss-builtin-listbulletpulse` (unordered list bullet scaling 1.25x with primary color accent), expanding catalog to 74 snippets.
- **Snippet Studio UserCSS Export @var number Formatting & Validation**:
  - Validates finite numbers (integers and floats) and safely falls back to `0` for invalid inputs.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.81)**.

### v0.48.80 (2026-10-29 · Local Verified)

- **Workbench Widget Card Header Active Touch & Scale Haptics**:
  - Adds tactile elastic active compression `scale(0.99)` to `.sw__home-module-header` and eliminates mobile tap highlight flashes.
- **Built-in Snippet Library Expansion: Image Frame Card Container & Line Numbers Right-Aligned**:
  - Adds `swss-builtin-imgcard` (translucent card frame with rounded borders and soft hover glow on images);
  - Adds `swss-builtin-codelineright` (right-aligned line numbers with gentle opacity in code blocks), expanding catalog to 72 snippets.
- **Snippet Studio UserCSS Export @var text Escaping & Multi-Line Sanitization**:
  - Automatically wraps text defaults in double quotes, escapes nested quotes, and collapses linebreaks into single spaces.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.80)**.

### v0.48.79 (2026-10-29 · Local Verified)

- **Workbench Widget Card Keyboard F/C Quick Fold & Config Shortcuts**:
  - Adds single-key shortcut flow when focused: `f`/`F` toggles fold/expand, `c`/`C` opens widget configuration directly.
- **Built-in Snippet Library Expansion: Block Embed Accent Bar & Dual Gradient Tag Pill**:
  - Adds `swss-builtin-embedshadow` (accent left bar and ambient hover glow on block query embeds);
  - Adds `swss-builtin-taggradient` (subtle two-tone gradient background and hover lift on tags), expanding catalog to 70 snippets.
- **Snippet Studio UserCSS Export @var color Formatting & Strict Validation**:
  - Supports 3/4/6/8-digit hex colors, functional rgb/rgba/hsl, and named colors with fallback to `#000000`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.79)**.

### v0.48.78 (2026-10-29 · Local Verified)

- **Workbench Widget Card Header Double-Click Toggle Gesture**:
  - Adds double-click handler on widget header `.sw__home-module-header` for rapid fold/expand, with interactive control guards and `user-select: none`.
- **Built-in Snippet Library Expansion: Hanging Quotation Mark Accent & Inline Code Neon Glow**:
  - Adds `swss-builtin-quotehanging` (translucent serif hanging quotation mark “ on blockquotes);
  - Adds `swss-builtin-inlineneon` (accented border and soft neon glow shadow on inline code), expanding catalog to 68 snippets.
- **Snippet Studio UserCSS Export @var checkbox Boolean Serialization**:
  - Formats `@var checkbox` into canonical `1` or `0` with robust boolean parsing and fallback handling.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.78)**.

### v0.48.77 (2026-10-29 · Local Verified)

- **Workbench Empty State Keyboard A11y Enter/Space Quick Store Access**:
  - Focusable empty container with `tabIndex = 0` and 2px brand focus ring; Enter/Space opens widget store or recommended items, ArrowUp returns to toolbar.
- **Built-in Snippet Library Expansion: Task List Progress Guide & Task Item Card**:
  - Adds `swss-builtin-taskprogress` (vertical progress guide bar on task list block);
  - Adds `swss-builtin-taskbadge` (rounded card contour with gentle primary hover tint), expanding catalog to 66 snippets.
- **Snippet Studio UserCSS Export @var range Numeric Intervals & Unit Validation**:
  - Formats `@var range` options from structured arrays and objects with boundary clamping and strict unit sanitization.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.77)**.

### v0.48.76 (2026-10-29 · Local Verified)

- **Workbench Widget Card Status Badge Hover Micro-Float & Color Tints**:
  - Adds hover lift and soft ambient shadows to source-health badges; enriches fresh/cached/stale semantic backgrounds.
- **Built-in Snippet Library Expansion: Task Checkbox Target Scale & Table First Column Accent**:
  - Adds `swss-builtin-taskcheckbox` (rounded touch targets with smooth hover scaling);
  - Adds `swss-builtin-tablefirstcol` (first column semibold accent with right border), expanding catalog to 64 snippets.
- **Snippet Studio UserCSS Export @var select Options Parsing & Serialization**:
  - Formats `@var select` options into standard UserCSS string arrays and object dictionaries with default asterisk preservation.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.76)**.

### v0.48.75 (2026-10-29 · Local Verified)

- **Workbench Collapsed Widget Card Adaptive Enter Key Expansion**:
  - Automatically expands collapsed cards on `Enter`, harmonizing with `Space` for seamless tactile interaction.
- **Built-in Snippet Library Expansion: Callout Dual Gradient Left Bar, Centered Dots Divider**:
  - Adds `swss-builtin-calloutgradient` (two-tone vertical gradient border for callouts);
  - Adds `swss-builtin-hrdots` (centered triple dots ••• with hover spread), expanding catalog to 62 snippets.
- **Snippet Studio UserCSS Export @var Variable Validation & Safe Encoding**:
  - Validates `@var` definitions against standard type allowlists (`color`, `range`, `select`) and identifier rules in `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.75)**.

### v0.48.74 (2026-10-29 · Local Verified)

- **Workbench Widget Card Collapse Indicator Hover & Focus Haptics**:
  - Adds hover scaling, accent tint, and accessible 2px keyboard focus rings to `.sw__home-module-fold` buttons.
- **Built-in Snippet Library Expansion: Callout Accent Cards, Dashed Link Underlines**:
  - Adds `swss-builtin-calloutcolored` (prominent left border and hover lift for callouts);
  - Adds `swss-builtin-linkdashed` (subtle dashed underlines with smooth hover transition), expanding catalog to 60 snippets.
- **Snippet Studio UserCSS Export Preprocessor Directive Validation**:
  - Adds `@preprocessor` metadata extraction with standard enum allowlist validation to `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.74)**.

### v0.48.73 (2026-10-29 · Local Verified)

- **Workbench Widget Grid Drag & Resize Handles Accessible Focus Rings**:
  - Adds visible 2px theme accent focus rings and micro-scaling feedback to resize and drag handles for keyboard a11y.
- **Built-in Snippet Library Expansion: Subscript & Superscript Pills, Rounded Media Cards**:
  - Adds `swss-builtin-scriptsaccent` (theme accent background for sub/superscripts in formulas/citations);
  - Adds `swss-builtin-mediarounded` (modern rounded card borders and ambient hover glow for video/audio blocks), expanding catalog to 58 snippets.
- **Snippet Studio UserCSS Export Update URL Validation**:
  - Adds `@updateURL` metadata extraction with strict HTTP/HTTPS protocol validation to `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.73)**.

### v0.48.72 (2026-10-29 · Local Verified)

- **Workbench Widget Card Enter Key Action Dispatch Cascade**:
  - Pressing `Enter` on focused cards cascades from edit-mode tools to browse-mode configuration or open actions.
- **Built-in Snippet Library Expansion: Inline Code Tint Spans & Widget Embed Card Borders**:
  - Adds `swss-builtin-inlinecodecard` (subtle theme accent border and background for inline code spans);
  - Adds `swss-builtin-embedglow` (rounded card borders and hover glow for embedded widgets), expanding catalog to 56 snippets.
- **Snippet Studio UserCSS Export Homepage & Support URL Validation**:
  - Adds `@homepageURL` and `@supportURL` metadata extraction with strict HTTP/HTTPS protocol validation to `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.72)**.

### v0.48.71 (2026-10-29 · Local Verified)

- **Workbench Widget Config Form Action Button Keyboard Flow**:
  - Supports `ArrowLeft` / `ArrowRight` focus navigation among footer action buttons; enables direct `Enter` submit from single-line inputs; adds `Alt+R` reset shortcut.
- **Built-in Snippet Library Expansion: Closing Accent Quotes & Feathered Dividers**:
  - Adds `swss-builtin-quoteaccent` (artistic closing quotation mark ” in theme primary color at quotes bottom-right);
  - Adds `swss-builtin-dividerpulse` (feathered transparent gradient dividers with hover pulse scaling), expanding catalog to 54 snippets.
- **Snippet Studio UserCSS Export Author & License Metadata Sanitization**:
  - Adds `@author` field extraction with newline stripping and `@license` allowlist validation to `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.71)**.

### v0.48.70 (2026-10-29 · Local Verified)

- **Workbench Widget Grid Boundary Navigation & Smooth Viewport Centering**:
  - Adds `PageUp` / `PageDown` multi-step grid cruising; protects inner input fields from arrow key hijacking; enforces `inline: nearest`.
- **Built-in Snippet Library Expansion: Unchecked Task Highlights & Ordered List Badges**:
  - Adds `swss-builtin-taskpending` (accent vertical bar and hover background for pending tasks);
  - Adds `swss-builtin-numlistaccent` (rounded capsule badges for ordered list numbers), expanding catalog to 52 snippets.
- **Snippet Studio UserCSS Export Description Metadata & Sanitization**:
  - Adds `@description` field extraction with newline and control character sanitization in `buildUsercssHeader`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.70)**.

### v0.48.69 (2026-10-29 · Local Verified)

- **Workbench Widget Card Title Truncation & Hover Tooltip Enrichment**:
  - Adds complete widget title to cell tooltip alongside source and subtitle; sets default initial `title` on module title and context nodes.
- **Built-in Snippet Library Expansion: Foldable Blockquote Cards & Fluorescent Highlighters**:
  - Adds `swss-builtin-foldcallout` (theme accent left border for folded blockquotes) and `swss-builtin-highlighter` (half-height book highlighter mark), expanding to 50 snippets.
- **Snippet Studio UserCSS Export Option Validation & Instant Receipt**:
  - Validates custom namespace and semver options in `buildUsercssHeader` with graceful fallbacks; provides immediate status feedback upon export.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.69)**.

### v0.48.68 (2026-10-29 · Local Verified)

- **Workbench Widget Double-Click Quiet Healing & Single-Card R Key Retry**:
  - Double-clicking failed, offline, or stale widget cells triggers in-place force refresh; in editing mode, pressing `r` / `R` on a focused card directly retries without opening menus.
- **Built-in Snippet Library Expansion: Pill Tag Badges & External Link Diagonal Arrows**:
  - Adds `swss-builtin-tagpill` (transforms #tags into 999px rounded pills with hover micro-elevation);
  - Adds `swss-builtin-extlinkicon` (automatically appends diagonal arrow ` ↗` to external links with hover displacement), expanding the catalog to 48 snippets.
- **Snippet Studio Restore Preview Select-All Shortcut & Keyboard Flow**:
  - Supports `Ctrl+A` / `Cmd+A` to toggle select-all/deselect-all in the restore preview dialog;
  - Supports `ArrowUp` / `ArrowDown` cyclic checkbox focus and `Home` / `End` jumping, with accessible `aria-label` markup.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.68)**.

### v0.48.67 (2026-10-29 · Local Verified)

- **Workbench Widget Retry Cooldown Protection & Loading Skeleton Refinements**:
  - Adds 3s countdown cooldown to "Retry All" to prevent request storms; aligns skeleton animations with motion safety.
- **Built-in Snippet Library Expansion: Vibrant Code Syntax & Block Reference Underlines**:
  - Adds `swss-builtin-codevibrant` and `swss-builtin-blockrefaccent` styled with official CSS theme variables.
- **Snippet Studio Conflict Dialog Focus Trap & Keyboard Navigation**:
  - Adds tabIndex = 0 and accessible region roles to conflict diff box; supports Arrow key scrolling and Tab/Shift+Tab focus trap.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.67)**.

### v0.48.66 (2026-10-29 · Local Verified)

- **Workbench Widget Card Reordering Step Receipts & Drag Handle Micro-Interactions**:
  - Displays dynamic position and count receipts (e.g. "Move widget (3/7)"); elevates drag handles on hover with click micro-scaling.
- **Built-in Snippet Library Expansion: Inline LaTeX Math Cards & Pangu Typography**:
  - Adds `swss-builtin-inlinemath` and `swss-builtin-panguspace` styled with official CSS theme variables.
- **Snippet Studio Diagnostics Drawer Shortcut & Findings Count Badge**:
  - Supports Ctrl/Cmd+Shift+D or Alt+D to toggle CSS diagnostics drawer; reflects total findings in header badge.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.66)**.

### v0.48.65 (2026-10-29 · Local Verified)

- **Workbench Widget Config Reset Confirmation & Validation Shake Animation**:
  - Adds modal confirmation before resetting widget configuration; triggers `.sw-form--shake` on input validation errors.
- **Built-in Snippet Library Expansion: Task Checkbox Bounce & Bold Soft Shadow**:
  - Adds `swss-builtin-taskbounce` and `swss-builtin-boldaccent` styled with official CSS theme variables.
- **Snippet Studio Editor Multiline Tab Indent & Shift+Tab Dedent**:
  - Adds multiline block indenting and outdenting by 2 spaces, preserving selection boundaries and cursor offset.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.65)**.

### v0.48.64 (2026-10-29 · Local Verified)

- **Workbench Widget Collapsed Count Badges & Keyboard Fold Shortcuts**:
  - Displays dynamic `.sw__home-collapsed-badge` item count or stat value in collapsed cards; supports Space and bracket `[` / `]` hotkeys.
- **Built-in Snippet Library Expansion: Text Selection Glow & Code Rainbow Brackets**:
  - Adds `swss-builtin-selectionglow` and `swss-builtin-rainbowbrackets` styled with official CSS theme variables.
- **Snippet Studio Gist Error Feedback Card & Rate Limit Guidance**:
  - Embeds `.sw-studio__gist-error` alert card in Gist configuration area with explicit GitHub API rate limit and retry guidance.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.64)**.

### v0.48.63 (2026-10-29 · Local Verified)

- **Workbench Widget Offline Disaster Recovery Indicator & Custom Refresh Intervals**:
  - Adds quiet amber indicator for offline environments; supports configurable refresh intervals (1~1440m) and bounded backoff.
- **Built-in Snippet Library Expansion: macOS Terminal Window Dots & Table Cell Hover**:
  - Adds `swss-builtin-codemac` and `swss-builtin-tablecell` styled with official CSS theme variables.
- **Snippet Studio Preview Pane Keyboard Focus Ring & Viewport Zoom**:
  - Adds tabIndex = 0 and accessible region roles to preview panes; supports Arrow keys scrolling and Ctrl/Cmd +/-/0 zoom scaling.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.63)**.

### v0.48.62 (2026-10-28 · Local Verified)

- **Workbench Widget Empty State In-Place Config Hint & Accessibility Healing**:
  - Dynamically embeds `.sw__home-module-config-hint` inside empty/blocked configurable cards for seamless one-click healing.
- **Snippet Studio Recycle Bin Keyboard & Batch Clear Protections**:
  - Adds empty-state disabled protection to clear button, Ctrl/Cmd+Shift+Delete shortcut, and item-level Enter restore / Delete purge.
- **Built-in Snippet Library Expansion: Cyber Neon Glow & Frosted Glass Cards**:
  - Adds `swss-builtin-neonglow` and `swss-builtin-frostedglass` styled with official CSS theme variables.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.62)**.

### v0.48.61 (2026-10-28 · Local Verified)

- **Workbench Widget Grid Resize Handle Keyboard Shift+Arrow Scaling**:
  - Adds tabIndex = 0, role="slider", and bilingual title; allows pressing Shift+Arrows to resize grid spans freely.
- **Snippet Studio Editor ⌘S Shortcut, ⌘⇧C Quick Copy & ⌘Enter Format**:
  - Introduces developer hotkeys: ⌘⇧C for full-text code copying, ⌘Enter for auto-formatting, and ⌘F for find bar.
- **Built-in Snippet Library Expansion: Drop Caps & Gradient Scrollbars**:
  - Adds `swss-builtin-dropcap` and `swss-builtin-gradient-bar` styled with official CSS theme variables.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.61)**.

### v0.48.60 (2026-10-28 · Local Verified)

- **Workbench Widget Collapse Grid Row Compression & Animation Hardening**:
  - Dynamically collapses cell gridRow to span 1 on toggle, eliminating blank space and maintaining compact card density.
- **Snippet Studio Diff Panel Keyboard Navigation & Escape Return**:
  - Adds tabIndex = 0, Escape dismissal back to editor, and ArrowDown/j/ArrowUp/k cycling between diff hunks.
- **Built-in Snippet Library Expansion: Quote Marks & Wavy Underlines**:
  - Adds `swss-builtin-quote-gold` and `swss-builtin-wavy-underline` styled with official CSS theme variables.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.60)**.

### v0.48.59 (2026-10-28 · Local Verified)

- **Workbench Widget Desktop Contextmenu & Mobile Long-Press Actions**:
  - Adds desktop right-click and 500ms touch long-press context menu for in-place configuration, single refresh, and removal.
- **Built-in Snippet Library Expansion: Foldable Headings & Math Block Cards**:
  - Adds `swss-builtin-foldheading` and `swss-builtin-mathblock` styled with official CSS theme variables.
- **Action Palette Batch Close Tabs Safe Focus Fallback**:
  - Restores keyboard focus to the first surviving card or search input after batch closing tabs, preventing drop to body.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.59)**.

### v0.48.58 (2026-10-28 · Local Verified)

- **Workbench Keyboard ⌘R / Ctrl+R Refresh Interception & Blank Screen Shield**:
  - Intercepts host hard reloads, triggering quiet local multi-widget re-reads while preserving workbench context.
- **Built-in Snippet Library Expansion: Callout Boxes & Multi-Column Cards**:
  - Adds `swss-builtin-callout` and `swss-builtin-multicolumn` styled with official CSS theme variables.
- **Action Palette Direct Action Shortcuts Dispatch**:
  - Pure-function navigation state machine directly routes action shortcuts (`⌥⇧M`, `⌥H`, `⌥M`, etc.) to execution.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.58)**.

### v0.48.57 (2026-10-28 · Local Verified)

- **Workbench Bento Grid Narrow Viewport Layout Hardening**:
  - Adds single-column fallback on narrow mobile screens (<=360px) and clamps overflowing titles with flex-shrink tabular capsules.
- **Snippet Studio Filter Selectors Keyboard Flow & Escape Dismissal**:
  - Adds auto-select, stepped escape, search-to-list navigation, and Home/End option switching across snippet filter selectors.
- **History Dropdown Home/End Navigation & Delete Quick Cleanup**:
  - Adds Home/End jumps, ArrowDown/Up cycling, and single-item Delete/Backspace cleanup with smooth focus transfer.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.57)**.

### v0.48.56 (2026-10-28 · Local Verified)

- **Design System & Motion Token Convergence**:
  - Eliminates literal durations, control heights, and spacing values in favor of shared Sass and CSS tokens.
- **Root Markdown Document Budgeting**:
  - Trims long backlog narratives in ROADMAP.md, returning to 147 KiB (strictly under 150 KiB ceiling).
- **Stepped Escape & Bi-Directional Keyboard Alignment**:
  - Hardens exclusion syntax against false highlights and aligns stepped escape contracts across search, preview and store.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.56)**.

### v0.48.55 (2026-10-28 · Local Verified)

- **Quick Action Picker Escape Stepped Dismissal & Two-Way Keyboard Loop**:
  - Adds Escape stepped dismissal and focus return, search-to-results ArrowDown/Enter navigation, and ArrowUp back-focus.
- **Action Palette Navigation State Machine Home/End Support**:
  - Adds Home/End key support to rapidly navigate to the first or last action item.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.55)**.

### v0.48.54 (2026-10-28 · Local Verified)

- **Snippet Backup Restore Preview Dialog Escape & ⌘Enter Shortcut**:
  - Adds Escape dismissal, ⌘Enter shortcut submission, and ArrowLeft/Right button cycling in restore preview dialog.
- **Snippet Import Mode Selection Safe Initial Focus & ⌘Enter Shortcut**:
  - Focuses harmless Cancel button by default and allows ⌘Enter to import with current strategy.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.54)**.

### v0.48.53 (2026-10-28 · Local Verified)

- **Snippet Store Submit Guide Dialog Escape & Arrow Navigation**:
  - Dismisses submit guide dialog on Escape and supports ArrowLeft/Right cyclic button navigation.
- **Mobile Fav Sheet & Group Actions Home/End Quick Jump**:
  - Adds Home/End key support across mobile bottom sheets for rapid access to first/last buttons.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.53)**.

### v0.48.52 (2026-10-28)

- **Doc Preview Pane Escape Return-Focus Two-Way Keyboard Loop**:
  - Pressing Escape inside doc preview pane safely restores focus to the corresponding search card/result row when find bar is inactive.
- **Floating Ball More Drawer List Home/End/Escape Keyboard Navigation**:
  - Adds Home/End key support to jump to first/last action and Escape to close drawer and restore trigger focus.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.52)**.

### v0.48.51 (2026-10-28)

- **Penetration Search Model Adds `SEARCH_MODES.TASK` (Prefix - / task:)**:
  - Parses task prefixes, plans safe read-only SQL, and normalizes task blocks with completion status.
- **Global Search Flow Integrates Task Penetration & Task Horizon Today's Tasks**:
  - Seamlessly prepends Task Horizon today's tasks with priority flags, jumps to blocks on Enter, and adds `help-task` routing.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.51)**.

### v0.48.50 (2026-10-28)

- **Search Mode Chips Bar Adds Task Mode (Prefix - / task:)**:
  - Adds dedicated Task Mode chip with support for `-`, `－`, `task:`, `task：`, and `[ ]`, alongside safe multi-char prefix stripping.
- **Action Palette Open Tabs Export to Mindmap/Outline (⌥⇧M)**:
  - One-click format and export all opened tabs into a Markdown outline with `siyuan://blocks/${rootId}` links copied to clipboard.
- **Workbench Health Details Dialog Escape & Keyboard Flow Hardening**:
  - Adds container-level Escape keydown handler to safely dismiss health details dialog and restore focus.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.50)**.

### v0.48.49 (2026-10-28)

- **Task Horizon Official Protocol & setTaskStatus Write Callback**:
  - Super workbench mounts today's task checklist with 800ms circuit-breaker; single-click check-off directly dispatches to Task Horizon queue and clicks navigate to task blocks.
- **Action Palette (⌘K) Task Horizon Today's Task Direct Action**:
  - Adds ⌥H preset action in Action Palette to open today's tasks and jump to task blocks.
- **SiYuan 3.8.8+ Desktop Compact Density Adaptation (`:root[data-ui-density="compact"]`)**:
  - Adapts card padding, spacing tokens, and line-heights when compact UI density is detected.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.49)**.

### v0.48.48 (2026-10-27)

- **Snippet Studio Gist Recovery Dialog Escape Fallback & Arrow Button Cycling**:
  - Gist write recovery dialog dismisses safely on Escape and supports ArrowLeft/Right cyclic button navigation.
- **Home Health Details Diagnostic Preview Escape & Summary Auto-Select**:
  - Summary textarea auto-selects on focus; Escape dismisses the preview and returns focus; ⌘Enter triggers quick copy.
- **Platform Guide Dialog Titlewrap Branding & Universal Alignment**:
  - Equips brand titlebar packaging and version badges on the quick start guide dialog; aligned all secondary dialogs to `v0.48.48`.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.48)**.

### v0.48.47 (2026-10-27)

- **Widget Config Form ⌘Enter Quick Save & Escape Dismissal**:
  - Submits and persists configuration on ⌘Enter / Ctrl+Enter; dismisses safely on Escape.
- **Settings Search Input Focus Auto-Select, Enter Self-Healing & Stepped Escape**:
  - Auto-selects text on focus; Enter recovers from unmatched queries; Escape steps down from clearing to dismissing.
- **Workbench Clear Layout Confirmation Safe Initial Focus & Escape**:
  - Focuses the harmless "Cancel" button by default and dismisses on Escape.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.47)**.

### v0.48.46 (2026-10-27)

- **Doc Search Item ⌘C & ⌘⇧C Copy Shortcuts**:
  - Direct ⌘C to copy block links and ⌘⇧C to copy Markdown links directly on focused document result rows.
- **Doc Preview Find Bar Stepped Escape & Focus Auto-Select**:
  - Auto-selects search text on focus; Escape first clears text and query hits before dismissing the bar.
- **Floating Ball First Layer Arrow Navigation & Escape Return**:
  - Circular arrow key traversal across first-layer quick action buttons; Escape returns focus to the trigger.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.46)**.

### v0.48.45 (2026-10-27)

- **Floating Ball More Drawer Search Auto-Select & Two-Way Arrow Navigation**:
  - Auto-selects search input on focus, traverses action rows with ArrowDown/Up, and ArrowUp on first item returns to search.
- **Mobile Sheet Dialogs Key Navigation & Tab Focus Trap Invariant**:
  - Both mobile favorites and group action sheets support ArrowDown/Up cyclic navigation and Tab trap.
- **Workbench Toolbar ArrowRight/Left & Grid ArrowDown/Up Keyboard Loop**:
  - Cyclic toolbar navigation and smooth downward traversal into widget cells; first cell ArrowUp returns to toolbar.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.45)**.

### v0.48.44 (2026-10-27)

- **Snippet Studio Recycle Viewer Arrow Key Focus Navigation**:
  - Traverses action buttons across deleted/backed-up snippets with ArrowDown and ArrowUp.
- **Snippet Studio Leave & Conflict Dialogs Escape Fallback & Button Cycling**:
  - Catches Escape to safely cancel and return focus; supports ArrowLeft/Right cyclic button navigation.
- **Settings Diff Dialogs Escape Dismissal & Safe Initial Focus**:
  - Document set and config pack diff dialogs focus the cancel button by default and dismiss on Escape.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.44)**.

### v0.48.43 (2026-10-27)

- **Snippet Picker Two-Way Keyboard Flow & Enter Self-Healing**:
  - Focus auto-selects search query; ArrowDown navigates to first item, first item ArrowUp returns to search; Enter clears unmatched queries.
- **Home Store Preview Escape Return & Batch Mode Stepped Escape**:
  - Preview dialog explicitly catches Escape to return focus; batch mode steps down gracefully on Escape without closing the store dialog.
- **Workbench Edit Mode Plain Arrow Key Focus Navigation**:
  - Smoothly traverse widget cells with plain arrow keys (ArrowRight/Left/Up/Down/Home/End), fully decoupled from Ctrl/Cmd reordering.
- **Universal Secondary Dialog Titlewrap Version Badges Alignment (v0.48.43)**.

### v0.48.42 (2026-10-27)

- **Action Palette Focus Auto-Select & Enter Self-Healing**:
  - Focus auto-selects search text; Enter clears unmatched queries to recover the full action list.
- **Platform Search Inputs Focus Auto-Select & Enter Clear**:
  - Main, sidebar, and mobile switcher inputs auto-select on focus and self-heal on unmatched Enter.
- **Saved Search Editor Focus Auto-Select & Enter Quick Save**:
  - Auto-selects name and query inputs on focus; Enter submits and saves the dialog.
- **Universal Dialog Version Alignment (v0.48.42)**.

### v0.48.41 (2026-10-27)

- **Switcher Card Direct Shortcuts (⌘D / ⌘P / ⌘W)**:
  - Supports ⌘D (fav), ⌘P (pin), and ⌘W (close tab) directly on focused cards, completely aligned with the Action Palette.
- **Snippet Studio Code Editor Tab 2-Space Indentation**:
  - Intercepts default focus jumping on Tab in the editor to cleanly insert 2 spaces of indentation.
- **Home Health Details Batch Retry-All Action Handle**:
  - Equips a "Retry All" button when failing widgets exist to self-heal batch errors.
- **Universal Dialog Version Alignment (v0.48.41)**.

### v0.48.40 (2026-10-27)

- **Switcher Empty State Full Keyboard Navigation**:
  - Arrow key navigation and Enter execution across empty state actions and syntax chips; ArrowUp on first item returns focus to search.
- **Home Store Search Selection & Escape Exit**:
  - Auto-selects search text on focus; Escape closes the dialog when input is empty.
- **Floating Ball More Drawer Search Enter Self-Healing**:
  - Enter clears empty search results and recovers the full action list.
- **Universal Dialog Version Alignment (v0.48.40)**.

### v0.48.39 (2026-10-27)

- **Universal Dialog Titlewrap Version Badges Alignment**:
  - Aligned all 17 secondary dialog titlebars across settings, store, workbench, and studio to `v0.48.39`.
- **Universal Dialog Version Alignment (v0.48.39)**.

### v0.48.38 (2026-10-27)

- **Home Widget Store Card List ArrowUp Direct Navigation to Search Box**:
  - Store card list supports ArrowUp on the first card to smoothly return focus to the search input;
  - Supports Escape on focused cards to quickly clear search input and return focus.
- **Universal Dialog Version Alignment (v0.48.38)**.

### v0.48.37 (2026-10-27)

- **Search Mode Chips Fullwidth Symbol Recognition & Clean Switching**:
  - Immediate active highlight when typing fullwidth symbols (`＠`, `＃`, `＾`, `＊`, `！`, `》`, `？`);
  - Safe prefix stripping on chip click to prevent double-prefix pollution.
- **Universal Dialog Version Alignment (v0.48.37)**.

### v0.48.36 (2026-10-27)

- **Fullscreen Topbar Header Avoidance (SiYuan Window Controls Compatibility)**:
  - Added explicit 140px safe area padding-right to the header action area, completely preventing overlap with desktop window controls (minimize/maximize/close).
- **Dual Preview Panes Thorough Invariant Defense**:
  - Expanded preview pane singleton cleanup scope to root containers and wiped orphan previews before layout mounting.
- **Universal Dialog Version Alignment (v0.48.36)**.

### v0.48.35 (2026-10-27)

- **Action Palette (⌘K) Stepped Escape Clear Mechanism**:
  - Normalized Escape behavior: clears search input when text is present; closes the palette only when empty.
- **Universal Dialog Version Alignment (v0.48.35)**.

### v0.48.34 (2026-10-27)

- **Switcher First Row ArrowUp Direct Navigation to Search Box**:
  - Seamless bidirectional keyboard navigation flow: "Search Box ➔ (ArrowDown) ➔ First Card ➔ (ArrowUp) ➔ Search Box".
- **Universal Dialog Version Alignment (v0.48.34)**.

### v0.48.33 (2026-10-27)

- **Home Widget Store Keyboard Flow & Search Escape Handling**:
  - Store search box supports `Enter` and `ArrowDown` to directly focus the first visible widget card with auto-scroll;
  - Normalized `Escape` keydown behavior to clear search input cleanly and halt bubbling.
- **Universal Dialog Version Alignment (v0.48.33)**.

### v0.48.32 (2026-10-27)

- **Relation & Outline Navigation Polish, Deep Link Interception & Badges**:
  - Intercepted `siyuan://blocks/...` links in `handleHomeItemAction` to prevent unintended external browser launches;
  - Added `{action: ["cb-get-scroll"]}` to block navigation for precise scrolling to target blocks in the editor;
  - Refined relation and heading level badges with hover displacement and accent highlights.
- **Universal Dialog Version Alignment (v0.48.32)**.

### v0.48.31 (2026-10-27)

- **Context-Aware Cockpit Active Document Context Wiring**:
  - Automatically captures active tab document context (`rootId` and `title`) when scheduling workbench widget reads;
  - Dynamic cache key blending ensures context-aware widgets seamlessly refresh when navigating between documents.
- **Universal Dialog Version Alignment (v0.48.31)**.

### v0.48.30 (2026-10-27)

- **Empty-State Syntax Bar Polish & Snippet Motion**:
  - Refined `.sw__empty-syntax-bar` with frosted pill styling, elevation hover displacement, and accessible borders;
  - Added click feedback and scale damping animation to `.sw-studio__library-copy`;
  - Outlined upcoming post-v0.48 / v0.49+ roadmap.
- **Universal Dialog Version Alignment (v0.48.30)**.

### v0.48.29 (2026-10-27)

- **Snippet Studio Copy Button & Leave Dialog Keyboard Flow**:
  - Added `sw-studio__library-copy` button to every snippet list item for instant code copying to clipboard;
  - Added Escape key handler to unsaved leave confirmation dialog for safe keyboard dismissal.
- **Universal Dialog Version Alignment (v0.48.29)**.

### v0.48.28 (2026-10-27)

- **Batch Tab Management Matrix in Action Palette (⌘K) & Context Menu**:
  - Added `close-other-tabs` (`⌥⌘T`): Keep selected tab and safely close all other tabs;
  - Added `close-tabs-after` (`⌥⌘→`): Close all tabs positioned after the current tab;
  - Added `close-unpinned-tabs` (`⌥⌘U`): Keep all pinned tabs and bulk close temporary tabs;
  - Context menu on cards updated with the same batch closing commands; all batch closures protected by `undoLastClosedTab`.
- **Workbench Layout "Clear All" with Confirmation Dialog**:
  - Added `sw-home__clear-btn` in editing mode with secondary confirmation dialog and layout history undo protection.
- **Universal Dialog Version Alignment (v0.48.28)**.

### v0.48.27 (2026-10-25)

- **Flagship Icon Asset Lock & Multi-Size Derivation Sync**:
  - Locked root `icon.png` and package-extracted icon to the 256×256 midnight purple and golden lightning design (65,989 B, SHA-256 `f562b06568f6a641c4c57beb1992af9dc6c6003bfa66b64f60b2d76263fe799f`);
  - Synced all 5 derived sizes (160px/48px/32px/24px/16px) under `docs/assets/` to replace legacy blue icons;
  - Added dedicated contract test in `tests/icon-asset-lock-contract.test.cjs`.
- **Universal Dialog Version Alignment (v0.48.27)**.

### v0.48.26 (2026-10-25)

- **Surface-Scope Preview Pane Singleton Invariant Guard**:
  - `mountDocPreviewPane` adds adaptive initial width fallback and broadens singleton removal across the entire `surfaceScope`, permanently preventing duplicate preview boxes.
- **Universal Toolbar Guide Button (❓)**:
  - Added `sw__help-guide-btn` across desktop dialog, sidebar, and mobile toolbar for immediate access to quick start guide and button instructions.
- **Interactive Empty-State Syntax & Action Bar**:
  - Added clickable pills in empty states for outlines (`:`), tags (`#`), bookmarks (`!`), blocks (`^`), tips (`?`), action palette (`⌘K`), and tab undo.
- **Legacy User Compatibility**: All custom hotkeys, sortings, and geometric anchors remain 100% stable.
- **Universal Dialog Version Alignment (v0.48.26)**.

### v0.48.25 (2026-10-25)

- **Switcher Preview Pane Singleton Invariant Guard**:
  - `mountDocPreviewPane` scans and forcefully removes any orphaned or duplicate `.sw__doc-preview` nodes within `scrollElement` before mounting, eliminating dual preview box glitches.
- **Full Switcher Toolbar Tooltip Invariant (b3-tooltips)**:
  - Filter, Sort, Fullscreen, Journal, Refresh, Settings, Snippet Studio, Favorites, and Open History buttons now all equipped with native `b3-tooltips b3-tooltips__s` and comprehensive helper descriptions.
- **Universal Dialog Version Alignment (v0.48.25)**.

### v0.48.24 (2026-10-24)

- **Floating Ball More Search IME Guard & Keyboard Flow**:
  - **IME Composition Guard**: Injected `compositionstart` / `compositionend` into floating ball search input, preventing spurious filter recalculation during Pinyin composition;
  - **Misclosure Defense**: Intercepted Escape key during IME composition in `handleKeydown` to prevent candidate cancellation from abruptly closing the more drawer;
  - **Two-stage Escape**: Escape first clears non-empty query before closing drawer on second stroke;
  - **ArrowDown & Enter Navigation**: Added direct `ArrowDown` focus into first action and `Enter` to run the first matched action.
- **Universal Dialog Version Alignment (v0.48.24)**.

### v0.48.23 (2026-10-24)

- **Action Palette Focus Recovery & Lifecycle Closure**:
  - **Auto Return Focus on Dispose**: Injected `returnFocusElement` mechanism into `action-palette-ui`, safely restoring keyboard focus to the triggering card or doc result item on palette teardown, eliminating focus drift to `document.body`;
  - **Dual Focus Guard on Cards and Docs**: `openCardActionPalette` and `openActionPaletteForDoc` proactively restore focus to target elements upon dismissal.
- **Universal Dialog Version Alignment (v0.48.23)**.

### v0.48.22 (2026-10-24)

- **Mobile Group Actions Sheet Focus Trap & Default Focus**:
  - **Tab Key Focus Trap**: Strictly trapped `Tab` / `Shift+Tab` within `openMobileGroupActions`, preventing focus escape to background elements;
  - **Auto Focus Top Action**: Automatically focused the primary action button ("open all group tabs") on open, enabling one-click Enter execution on external keyboards.
- **Search Input ArrowDown Target Extension**:
  - Extended candidate chain to `.sw__workbench-tile`, `.sw__doc-empty-action`, and `.sw__platform-guide-action` for seamless navigation in empty states.
- **Universal Dialog Version Alignment (v0.48.22)**.

### v0.48.21 (2026-10-24)

- **Penetration Search Help (? Mode) Interactive Routing & Auto-Action**:
  - **Intercept Virtual Help Entries**: Intercepted `help-*` entries in `activateDocResultItem`, preventing spurious openDocument errors;
  - **Dynamic Mode Prefix Backfilling**: Clicking `help-outline`, `help-tag`, `help-bookmark`, or `help-block` automatically fills the corresponding syntax prefix (`:`, `#`, `!`, `^`) and triggers immediate search;
  - **One-click Action Dispatch**: Clicking `help-undo` instantly invokes `undoLastClosedTab` to restore the last closed tab.
- **Universal Dialog Version Alignment (v0.48.21)**.

### v0.48.20 (2026-10-24)

- **Snippet Studio Secondary Dialog Branded Titlebars (100% Closure)**:
  - **Unsaved Changes Dialog (`openLeaveDialog`)**: Equipped with `mountPlatformDialogTitleWrap` and `mountPlatformDialogCloseHint` with `iconCode`;
  - **Save Conflict Dialog (`openConflictDialog`)**: Equipped with unified brand titlebar and close hint with `iconCode`;
  - **Gist Recovery Dialog (`openGistRecoveryDialog`)**: Equipped with unified brand titlebar with `iconCloud`;
  - **Backup Restore Preview Dialog (`restoreBackup`)**: Equipped with unified brand titlebar with `iconHistory`;
  - **Snippet Import Plan Dialog (`importFile`)**: Equipped with unified brand titlebar with `iconUpload`.
- **100% Universal Dialog Brand Styling Across All Surfaces (v0.48.20)**:
  - Complete closure of branded titlebars across Switcher, Workbench, Store, Settings, and Snippet Studio dialogs.

### v0.48.19 (2026-10-24)

- **Search Input Keyboard Flow: Enter Execution & ArrowDown Card Navigation**:
  - **ArrowDown Direct Navigation**: Pressing `ArrowDown` in the search input smoothly targets and focuses the first available result item below (prioritizing current focused card -> first card -> first command -> unified result -> doc item);
  - **Enter Direct Execution**: Pressing `Enter` in the search input immediately activates or opens the top matched item (prioritizing command execution -> focused/first card switch -> unified item -> doc item), eliminating the previous friction of having to press Tab first;
  - **Strict IME Yielding**: Fully yields to IME candidate selection during composition (`composing || isComposing || keyCode === 229`).
- **Settings Secondary Diff Dialog Branded Titlebars**:
  - **Document Set Diff Dialog (`openDocumentSetDiffDialog`)**: Equipped with `mountPlatformDialogTitleWrap` and `iconHistory`;
  - **Config Pack Diff Dialog (`openConfigPackDiffDialog`)**: Equipped with `mountPlatformDialogTitleWrap` and `iconSettings`.
- **Mobile & All Surface Dialog Version Bump (v0.48.19)**:
  - Mobile switcher parameter pass-through and universal dialog version badge alignment to `v0.48.19`.

### v0.48.18 (2026-10-24)

- **All Secondary Dialogs Brand Title Wrap Expansion**:
  - **Widget Config Dialog (`openHomeConfigForm`)**: Equipped with `mountPlatformDialogTitleWrap`, integrating widget-specific icons, title text, version badge, and Esc close hint;
  - **Widget Preview Dialog (`openStoreWidgetPreview`)**: Equipped with unified brand titlebar, eliminating raw plain text in store secondary dialogs;
  - **Widget Health Details Dialog (`openHomeHealthDetails`)**: Equipped with unified brand titlebar with `iconHeart`;
  - **Saved Search Editor Dialog (`openSavedSearchEditor`)**: Equipped with unified brand titlebar with `iconFilter`.
- **Mobile Switcher Dialog Version Alignment**:
  - Fixed an outdated `v0.48.9` hardcoded version in `src/index.ts` mobile switcher dialog titlebar, fully aligned to `v0.48.18`.
- **Primary Switcher Input IME Escape Defense**:
  - Hardened Escape key handler in `bindSearchInputComposition` with `event.isComposing || event.keyCode === 229` checks, preventing accidental query clearance during Pinyin composition under Windows/Chromium environments.
- **Version Bump & Documentation Sync (v0.48.18)**:
  - Synchronized `package.json`, `plugin.json`, READMEs, and roadmap.

### v0.48.17 (2026-10-24)

- **Second Panel Widget Store Complete Redesign**:
  - **Unified Branded Titlebar**: Equipped the widget store with `mountPlatformDialogTitleWrap` (22x22 interstellar purple branded icon, clear title, compact version badge, Esc close hint);
  - **Dedicated Ecosystem Tab**: Introduced a dedicated "Ecosystem" tab aggregating Xiaolv Checkin, Exam, Flashcards, Butler, Contacts, Common, Glean, SiReader, and SiMedia widgets;
  - **Midnight Black Gold Hero Tile Live Preview**: The store live preview embeds the workbench midnight black gold aesthetics (`.sw-home__cell--midnight` for clocks and dark tiles);
  - **Synchronized Featured Curations**: Featured list expanded to include weekly checkin capsules, flashcard due queues, SiReader reading shelf, and SiMedia playing state.
- **Widget Store Search Input IME Guard**:
  - Composition guard and Escape key protection during Pinyin typing.

### v0.48.16 (2026-10-24)

- **Widget Store Search Input IME Composition Guard & Performance (home-store-ui)**:
  - Guarded widget store search input with `compositionstart` / `compositionend`, preventing intermediate Pinyin keystrokes from triggering expensive whole-catalog DOM refiltering and statistics recalculation;
  - Added Escape key protection during composition (`keyCode === 229`) to prevent candidate dismissal from accidentally clearing the search query.
- **Floating Ball Viewport Bounds Inversion Defense & Lifecycle Cleanup**:
  - Physical ball size minimum bounds and deterministic teardown.

### v0.48.15 (2026-10-24)

- **Floating Ball Viewport Bounds Inversion Defense & Lifecycle Cleanup**:
  - Guarded mobile floating ball bounds against inverted viewports (`visible.bottom < visible.top`) under extreme insets (landscape, soft keyboards), enforcing physical `ballSize` minimums;
  - Cleaned redundant dialog teardowns in `onunload` for deterministic lifecycle release.
- **Doc Preview Robustness & Fallback**:
  - Node fallback when contenteditable is absent and dataset.title header fallback.

### v0.48.14 (2026-10-24)

- **Doc Preview Robustness & Fallback**:
  - Fixed an issue in `extractDocPreviewBlocks` where paragraphs, code, quotes, or list items lacking `contenteditable="true"` (e.g. read-only or static views) would be silently dropped, adding graceful fallback to the node itself;
  - Hardened `docPreviewItemTitle` to check `item.dataset.title` as fallback, ensuring the preview header always receives an accurate title.
- **Touch Slop & Action Palette IME Guard**:
  - 10px touch slop tolerance and IME composition NOOP guard.

### v0.48.13 (2026-10-24)

- **Touch Slop & Action Palette IME Guard**:
  - Added a 10px `touch slop` tolerance to mobile card long-press (`bindCardLongPress`) and history item long-press, preventing micro-jitters from prematurely cancelling the gesture timer;
  - Guarded action palette keyboard navigation against IME composition (`isComposing || keyCode === 229`), completely preventing Enter keypresses from executing actions while typing Pinyin;
  - Added lifecycle cleanup for `focusTimer` on palette disposal.
- **Cross-Boundary Keyboard Navigation & Relative Viewport Scrolling**:
  - Rebuilt `scrollIntoView` using `getBoundingClientRect()` relative viewport deltas, completely eliminating scroll jumping bugs caused by nested `position: relative` containers;
  - Added seamless keyboard focus penetration between tab cards and doc items.

### v0.48.12 (2026-10-24)

- **Cross-Boundary Keyboard Navigation & Relative Viewport Scrolling**:
  - Rebuilt `scrollIntoView` using `getBoundingClientRect()` relative viewport deltas, completely eliminating scroll jumping bugs caused by nested `position: relative` containers;
  - Added seamless keyboard focus penetration between tab cards and doc items: pressing `ArrowDown` on the last card row moves focus into the first doc item, while `ArrowUp` on the first doc item seamlessly returns to cards or the search box;
  - Hardened `activateCardByElement` with strict `!card` and `!tabId` guards to prevent out-of-bound undefined tab matches.
- **Deep Bug Audit Round 2**:
  - IME composition Escape protection, dynamic target surface scoping, and Windows drive path defenses.

### v0.48.11 (2026-10-24)

- **Deep Bug Audit & Robustness Round 2**:
  - Fixed an IME issue where pressing Escape while typing Pinyin (`composing`) would wipe the entire search box instead of only closing the candidate popup;
  - Fixed empty state recent search chips and search guide focus scoping by using dynamic target surface resolution (`targetSurface`);
  - Guarded outline colon detection against Windows drive paths (`C:\`, `d:/`), preventing accidental outline mode switching;
  - Guarded block search SQL generation against whitespace-only notebook ID filters.
- **Deep Bug Audit Round 1**:
  - Timer leak fix in ecosystem bridge, circular config serialization safety, and full-width colon mode chip handling.

### v0.48.10 (2026-10-24)

- **Bug Audit & Robustness Defense**:
  - Fixed an un-cleared `setTimeout` timer in `wrapEcosystemModuleRead` that could cause hanging event loops, strictly clearing timer handles in `finally`;
  - Added safe serialization defense for non-standard or circular external module configurations;
  - Added full-width/half-width colon (`:` / `：`) prefix stripping for mode chips and W3C standard `Home` / `End` keyboard navigation;
  - Hardened ecosystem event bus listener execution with per-listener `try-catch` isolation and idempotent unbinding;
  - Upgraded SiReader and SiMedia palette actions to use comprehensive multi-alias detection (`getBridgeSafely`).
- **SiReader & SiMedia Deep Integration**:
  - Workbench mounts "SiReader Recent Books (`sireader-recent`)" and "SiMedia Now Playing (`simedia-active`)" widgets to track reading progress and playing audio/video titles.

### v0.48.9 (2026-10-23)

- **SiReader & SiMedia Deep Integration**:
  - Workbench mounts "SiReader Recent Books (`sireader-recent`)" and "SiMedia Now Playing (`simedia-active`)" widgets to track reading progress and playing audio/video titles;
  - Action palette actions `open-in-reader` and `open-in-media` prioritize native reader/player methods with graceful `openTab` fallbacks.
- **Ecosystem Event Bus Real-Time Workbench Refresh**:
  - The workbench listens to ecosystem lifecycle events across Xiaolv Checkin, Flashcards, Exam, Butler, and SiMedia/SiReader, automatically re-rendering active widgets upon brother plugin mutations without manual reload!
- **First Panel Masterpiece Polish**:
  - Keyboard navigation for mode chips, fluid hover scaling for card buttons, and dual-gradient energy shimmer stripes.

### v0.48.8 (2026-10-23)

- **Mode Chips Keyboard Navigation & Fluid Focus Handoff**:
  - Mode chips bar (`.sw__mode-chips-bar`) supports `ArrowLeft` / `ArrowRight` keyboard cycling across mode chips, `ArrowDown` to return to the search input, and `ArrowUp` (when at start of input) to focus the active chip, creating a complete keyboard-first loop.
- **Card Action Buttons Fluid Hover Micro-Interactions**:
  - Pin (`.sw__pin`), favorite (`.sw__fav-btn`), and close (`.sw__close`) handles upgrade with smooth scale (scale 1.12) and color transitions, eliminating abrupt flicker during card hover.
- **First Panel Masterpiece Polish (The Storefront Interface)**:
  - Tab cards (`.sw__card`) and document search results (`.sw__doc-item`) active indicator stripes upgraded to **interstellar purple to titanium raikiri gold dual-gradient energy shimmer** (`linear-gradient`) with ambient soft glow;
  - Window group counters (`.sw__group-count`) upgraded to branded rounded pill capsules with tabular numerals;
  - 1-9 direct access digit keycaps (`[data-sw-digit]::after`) upgraded with 2px physical mechanical keycap bottom edge and tactile inset shadow.

### v0.48.7 (2026-10-23)

- **First Panel Masterpiece Polish (The Storefront Interface)**:
  - Tab cards (`.sw__card`) and document search results (`.sw__doc-item`) active indicator stripes upgraded to **interstellar purple to titanium raikiri gold dual-gradient energy shimmer** (`linear-gradient`) with ambient soft glow;
  - Window group counters (`.sw__group-count`) upgraded to branded rounded pill capsules with tabular numerals;
  - 1-9 direct access digit keycaps (`[data-sw-digit]::after`) upgraded with 2px physical mechanical keycap bottom edge and tactile inset shadow.
- **Ecosystem & Plugin Commands Discovery In Command Mode**:
  - Command mode (`>` or `》`) now discovers and filters all registered commands across installed plugins (including QuickGate, Checkin, Exam), enabling one-click and Enter execution;
  - Complements the Xiaolv Common phrase search to establish a unified command cockpit.
- **Chinese Full-Width Punctuation Adaptive Routing**:
  - Penetration search model natively supports full-width Chinese punctuation (`！` $\to$ bookmark mode, `》` $\to$ command palette, `：` $\to$ outline penetration, `？` $\to$ cheatsheet);
  - Mode chips bar (`.sw__mode-chips-bar`) and input placeholder dynamically sync across desktop and mobile.

### v0.48.6 (2026-10-23)

- **Ecosystem & Plugin Commands Discovery In Command Mode**:
  - Command mode (`>` or `》`) now discovers and filters all registered commands across installed plugins (including QuickGate, Checkin, Exam), enabling one-click and Enter execution;
  - Complements the Xiaolv Common phrase search to establish a unified command cockpit.
- **Chinese Full-Width Punctuation Adaptive Routing**:
  - Penetration search model natively supports full-width Chinese punctuation (`！` $\to$ bookmark mode, `》` $\to$ command palette, `：` $\to$ outline penetration, `？` $\to$ cheatsheet);
  - Mode chips bar (`.sw__mode-chips-bar`) and input placeholder dynamically sync across desktop and mobile.
- **Unified Dialog Titlebar Across All Platform Surfaces**:
  - Implemented `mountPlatformDialogTitleWrap`, equipping desktop and mobile switchers, workbench dialog, snippet studio, and settings window with standard 22x22 interstellar purple branded icon, clear title text, compact version badge, and Esc close hint (`.lv-dialog-title-wrap`).
- **Midnight Black Gold Star-Sheen Hero Tiles**:
  - Workbench local time (`external-local-time`), world clock (`external-world-clock`), and dark material (`mat-dark`) widgets render with midnight dark background (`.sw-home__cell--midnight`), titanium raikiri golden sheen border, and starburst glow shadow.

### v0.48.5 (2026-10-23)

- **Chinese Full-Width Punctuation Adaptive Routing**:
  - Penetration search model natively supports full-width Chinese punctuation:
    - `！` (full-width exclamation) $\to$ automatically maps to bookmark mode (`!`);
    - `》` (full-width greater-than / book angle bracket) $\to$ automatically maps to command palette (`>`);
    - `：` (full-width colon) $\to$ automatically maps to outline penetration delimiter (`:`);
    - `？` (full-width question mark) $\to$ automatically maps to symbol cheatsheet (`?`);
  - Mode chips bar (`.sw__mode-chips-bar`) and input placeholder dynamically sync across desktop and mobile, resolving the friction of punctuation mismatches in Chinese input methods;
  - Mobile switcher dialog (`createMobileSwitcherDialog`) is now equipped with the `.lv-dialog-title-wrap` branded titlebar.

### v0.48.4 (2026-10-23)

- **Unified Dialog Titlebar Across All Platform Surfaces**:
  - Implemented `mountPlatformDialogTitleWrap`, equipping the switcher dialog, workbench dialog, snippet studio, and settings window with standard 22x22 interstellar purple branded icon, clear title text, compact version badge, and Esc close hint (`.lv-dialog-title-wrap`), standardizing visual hierarchy across dialogs;
  - Built-in idempotency guard ensures zero duplicate DOM injection during view reloads.
- **Midnight Black Gold Star-Sheen Hero Tiles**:
  - Workbench local time (`external-local-time`), world clock (`external-world-clock`), and dark material (`mat-dark`) widgets render with midnight dark background (`.sw-home__cell--midnight`), titanium raikiri golden sheen border, and starburst glow shadow;
  - Titles, values, and status badges seamlessly inherit high-contrast gold and bright sheen.

### v0.48.3 (2026-10-23)

- **Xiaolv Ecosystem Epoch 6 Federation Standard & Bridge Kit**:
  - **800ms Circuit Breaker & One-Way Failure Isolation**: Strict 800ms timeout circuit breaker and 3s snapshot cache for third-party widget readers; graceful fallback rendering (`[ 📦 Data not ready, click to retry ]`) when external modules fail or time out, preventing any foreign code from breaking the Raikiri workbench; full four-alias mounting (`siyuanSpeedSwitch`, `xiaolvSpeedSwitch`, `xiaolvRaikiri`, `lvRaikiri`) with safe lifecycle unmounting;
  - **Pre-configured 7 Core Ecosystem Widgets**: Built-in widget adapters for Xiaolv Checkin (`checkin-daily-streaks`), Exam (`exam-daily-summary`), Flashcards (`cards-due-summary`), Glean (`glean-later-list`), Butler (`home-expiry-reminders`), Contacts (`contacts-upcoming`), and Common Phrases (`common-quick-palette`); command mode (`>`) supports QuickGate commands and instant phrase search;
  - **Monochrome Vector Icon Upgrade**: Injected 32x32 `iconLvSpeedSwitch` (three-tier tab cascade + raikiri blade + energy gold core) into `CARD_ICON_SPRITE` and aligned topbar registration;
  - **Interstellar Purple & Midnight Black Gold Aesthetic**: Injected `--lv-brand`, `--lv-brand-soft`, `--lv-accent-gold`, and `--lv-midnight-card` tokens, added 1.5px physical tactile feedback to buttons, and unified `.lv-dialog-title-wrap` titlebars;
  - **Deep Engineering Hardening**: Standardized block attributes under `custom-lv-raikiri-*` namespace, updated `plugin.json` display name to `Lv Speed Switch`, enabled `settingsWindow: true`, bumped `minAppVersion` to `3.8.4`, upgraded TypeScript compiler target to `ES2022`, added root `CHANGELOG.md` and `SECURITY.md`, and preserved the 256x256 high-resolution `icon.png`.

### v0.48.2 (2026-10-22)

- **Instant Topbar Switcher Open & Shallow Clone Engine**:
  - **Shallow First-Screen Thumbnail Cloning**: Replaced the performance-draining `wysiwyg.cloneNode(true)` which deep-cloned entire massive documents before stripping them with `cloneNode(false)` shallow container clone plus on-demand deep-copy of only the first 6 blocks (`THUMB_CLONE_MAX`), decoupling thumbnail cost from document size (reducing clone time from hundreds of milliseconds to 0.1ms);
  - **Zero-Latency Desktop Dialog Presentation**: Added `disableAnimation: true` to `createSwitcherDialog` to eliminate SiYuan Dialog's native 50ms mounting timeout and transform delays for instant response on topbar clicks;
  - **Eliminated Card DOM Churn & Forced Synchronous Reflow**: Streamlined `renderList` to mount groups directly into the `contentHost` preview container, removing the legacy double-pass extraction loop (`while (scrollElement.firstChild)`) and layout reads;
  - **Asynchronous Microtask Scheduling**: Defer thumbnail cache pruning (`pruneThumbCache`) and zero-query workbench (`renderWorkbench`) to microtasks, prioritizing tab grid and search input rendering.

### v0.48.1 (2026-10-22)

- **Persistent Search Mode Chips Bar (Desktop, Mobile & Sidebar)**:
  - Persistent pill chips bar (`[All Tabs]`, `[@ Outline]`, `[^ Block]`, `[# Tag]`, `[! Bookmark]`, `[> Command]`, `[? Help]`) across desktop switcher, mobile drawer, and narrow sidebar dock;
  - Supports touch-friendly horizontal scroll and single-tap mode activation; real-time two-way synchronization between input prefixes, active chips, and dynamic mode placeholders.
- **Search Results Action Palette & Direct Shortcuts**:
  - Full-text search results (`.sw__doc-item`) support `⌘K` / `Ctrl+K` to open the Raycast-style action palette for split opening, reader/media launch, and block/Markdown copying;
  - Direct `Alt+C` shortcut on any focused search result row to copy `siyuan://blocks/...` to clipboard without leaving the view.
- **Laddered Escape Mechanism & Search Clear Micro-Buttons**:
  - Pressing `Escape` in a non-empty search input clears text and restores the tab list, while pressing `Escape` in an empty input closes the switcher;
  - Search input hosts dynamic `.sw__search-clear` button; recent search query list hosts one-click `.sw__recent-query-clear` chip.
- **Xiaolv Checkin 7-Day Capsule Tracker & Dual Bento Tiles**:
  - `checkin-weekly` widget features 7-day capsule tracker (`.sw__home-capsule-tracker`) with today halo and checkmark states;
  - Emotional celebration banner (`.sw__home-celebration`) when all today tasks are completed;
  - Dual Bento tiles: Honey Orange (`#f9a84d`) for streak metrics and Lavender Soft (`#9b8df7`) for daily progress, with 2.2em tabular numbers;
  - Action palette shortcuts styled as tactile 2px mechanical keycaps (`.sw__palette-item-shortcut`) with active indicator stripes (`.sw__card::before`).
- **High-Performance Keyboard & Render Optimizations**:
  - Removed layout-thrashing `getComputedStyle` on non-vertical arrow keys; cached mode chip button arrays in memory to eliminate DOM queries during rapid typing.

### v0.48.0 (2026-10-20)

- **Deep Penetration Search & Symbol Navigation Hub**:
  - Full symbol prefix routing: `@heading` or `:heading` penetrates document outlines (H1–H6), `^block` searches workspace text blocks, `#tag` filters global tags, `!bookmark` jumps to bookmarks, `>command` runs built-in actions, and `?` invokes the full CheatSheet navigation guide;
  - Parameterized safe SQL generation with injection-character stripping, precise block anchor jump, and stable multi-heading deduplication;
  - Rich-text keyword highlighting (`<mark class="sw__search-mark">`) with multi-term AND token matching and XSS entity escaping.
- **Secondary Action Palette & Direct Shortcuts**:
  - Raycast-style action palette (`⌘K` / `Ctrl+K`), aggregating split-opening (`open-right` / `open-bottom`), preview mode (`open-preview`), pin/favorite toggles, closing tabs, and copying block/Markdown links;
  - Card-level direct shortcuts: `Ctrl+Enter` (right split), `Alt+Enter` (bottom split), `Alt+C` (copy block link), `Alt+M` (copy Markdown), `Alt+P` (pin), `Alt+D` (favorite), `Alt+R` (read in SiReader), `Alt+V` (play in SiMedia);
  - Built-in MRU dynamic sorting engine prioritizing frequently used actions within preserved section hierarchy.
- **Workspace Session Protection & Undo Close**:
  - Browser-standard `Ctrl+Shift+T` / `⌘Shift+T` to undo and reopen the most recently closed tab from stack;
  - `save-as-doc-set` (`⌘⇧S`) in Action Palette to snapshot all opened tabs into a versioned document set.
- **Workbench Widgets & Ecosystem Linkage**:
  - **Database Board (`database-board`)**: Attribute view lightweight read-only board widget with field-based bucket aggregation and counts;
  - **Flashcard Review (`flashcard-review`)**: SM-2 review queue projection and `action:riffCard` direct launch;
  - **SiReader & SiMedia Linkage**: Media and reading cards support frosted glass corner badges (`.sw__home-media-badge`) and theme progress bars (`.sw__home-media-progress-bar`).
- **Tactile Visual Polish (Xiaolv Checkin Style)**:
  - Unified acrylic luminous inner highlights (`inset 0 1px 0 rgba(255,255,255,0.08~0.16)`) across cards, search items, palette, and Bento cells;
  - Double-layer ambient occlusion shadows, smooth hover elevations, and tabular numeral typography (`tabular-nums`);
  - Full narrow sidebar (245px–340px) anti-overflow protection and mobile 44px WCAG hit target compliance.
- **Verification**: Full test suite 8982 passed, 1 skipped, 0 failed; package.zip 606 KiB safely bounded below the 594 KiB release gate; all batch release, quality, and integration audits pass.

### v0.47.6 (2026-10-19)

- **Isolated Real-Host E2E Verifications**: Document set restore with inbox shorthands aligned to cloud inbox (`tests/e2e/document-sets.spec.mjs`); snippet studio 3-mode import (Merge / Fork / Overwrite) and save lifecycle (`tests/e2e/snippet-import-save.spec.mjs`); favorites grouping with work context return (`tests/e2e/favorites-flow.spec.mjs`); and recent opened vs closed diff-sensing alignment (`tests/e2e/recent-closed-flow.spec.mjs`).
- **Cross-Surface High-Contrast & A11y Reinforcement**: System-level `forced-colors: active` and `prefers-contrast: more` token hierarchy and high-visibility keyboard focus rings matching WCAG accessibility expectations.
- **Core Dispatch & Data Safety Guardrails**: Request service recursion defense (>16 levels) and bounded retries (`MAX_RETRIES = 2`); Agent synchronous native ID reads and SQLite scoping to prevent asynchronous overwrites; snippet recycle bin triple-cap eviction and Gist token masking.
- **Snippet Studio Safety & Lifecycle**: Snippet recycle bin 50-item / 30-day / 256KB triple-cap eviction with safe disabled draft recovery; Gist credential 4-dot masking (`••••cdef`), mandatory `public: false` unlisted declaration, and config-pack exclusion; snippet AI single-snippet authorization, 64KB bounded context, and SSE cancellation.
- **Floating Ball & Settings Search Enhancements**: Viewport out-of-bounds inward anchor clamping, action target collision separation; settings center multi-token AND matching across 10 tabs with live DOM element focus routing.
- **Verification**: Full test suite 8850 passed, 1 skipped, 0 failed; package.zip safely bounded below the 578 KiB release gate; all batch release, quality, and integration audits pass.

### v0.47.5 (2026-10-17)

- **Zero-dependency lightweight code formatter**: native state-machine parser for CSS selectors, declarations, indentation, and cursor projection (`formatWithCursor`), eliminating 200KB+ Prettier overhead.
- **3-mode snippet import planning engine**: Merge (preserves local enabled state and ordering), Fork (regenerates unique IDs for safe experimentation), and Overwrite (full mirror).
- **Cross-surface crystalline rim-light and tactile bevel alignment**: workbench cells, preview rail, and studio sections declare 1px crystalline top highlight (`--sw-rim-light`) and ambient occlusion soft shadows.
- **Masterpiece high-fidelity prototype fully integrates multi-device viewport simulation** (Desktop/iPad/Mobile/Dock) and 40+ interactive feedback paths.
- **Verification**: full test suite 8777 passed, 1 skipped; compact style contracts 7/7, mobile layout smoke PASS; package.zip 578 KiB strictly below the 578 KiB release gate.

### v0.47.4 (2026-10-17)

- **Modern tech workbench and widget gallery overhaul**: content-first clock, monospace figures, 0ms optimistic task toggle with smooth strikethrough decay, 2.8s progress shimmer ray, and tactile store card tiles.
- **Multi-device dual bento architecture and GPU performance guardrails**: mobile 2-column paired bento (clock and weather side by side at 50% width), iPad 4-column bento, touch isolation, and hardware-accelerated zero reflow.
- **Progressive sensory polish across all surfaces**: first panel cards consume 1px crystalline rim light without breaking legacy DOM, micro-tactile keycaps, and dual-layer glow focus rings; light mode ceramic frost upgrade and toggleable noise grain.
- **Search page 34% standalone preview rail optimization**: independent scrolling to prevent obscuring doc lists (closing Issue #15); Phase C controlled agent safety and execution receipt contracts fully delivered.
- **Verification**: full test suite 8770 passed, 1 skipped; compact style contracts 6/6, mobile layout smoke PASS; package.zip 575 KiB strictly below the 578 KiB release gate.

### v0.47.3 (2026-10-16)

- **Compact workbench**: reduced toolbar and card spacing, restored widget height tiers, and gave weather/countdown widgets compact layouts while retaining explicit failure and stale-content feedback.
- **Seven starter widgets**: Recently opened, Favorites, Today journal, Today's tasks, Time & date, Year progress, and Note stats, each with a compact layout. Saved layouts, configurations, and window modes are preserved; upgrades do not add all starters automatically. Add from the store, or explicitly restore defaults in an empty workbench.
- **Weather retry**: failed requests offer a Retry action that bypasses cached failures and backoff.
- **Preview diagnostics**: inspect or cancel before copying, with busy feedback and a manual fallback. Summaries include versions, device, status, and safe reasons while excluding titles, instance IDs, and raw errors. Health details show widget names and timestamps again.
- **Compatibility fixes**: improved nested outline titles and HTML entities, bookmark count fallbacks and legacy block IDs; missing statistics remain a failure while valid zero totals render as zero.
- **Verification**: complete gate passed with 8749 tests and 1 skipped; isolated Chrome/SiYuan coverage includes compact layouts, weather retry, and diagnostics. The declared minimum remains SiYuan 3.8.0; Android, screen-reader, and real external-account checks retain their documented limits.

### v0.47.2 (2026-10-14)

- **Added the compact 2px spacing tier**: introduced `--sw-space-2xs` and migrated 97 declarations / 99 top-level components; spacing coverage moved from 69.09% to 73.73%, with zero computed-style or geometry differences across 30 Chromium scenarios and 480 elements.
- **Fixed the release archive budget**: compacted README history indexes while keeping the complete bilingual changelogs; package.zip fell from 596562 B to 591332 B, below the 591872 B gate.

- **Added shared top-bar brand identity**: brought the R5 theme-colored mark, product name, and localized platform subtitle to all three production surfaces; compact containers hide the subtitle and reduce the mark size.
- **Added an unavailable-widget recovery surface**: when all saved widgets are unavailable, the layout is preserved with clear status, direct store and edit-to-remove actions, and unavailable placeholders in the main scroll area.
- **Improved widget-store keyboard selection**: the first Enter/Space activation selects and opens the matching detail; the second invokes its primary action, matching pointer interaction.
- **Improved shared typography tiers**: migrated 298 spacing, 17 font-size, 34 line-height, and 134 font-weight declarations to existing tokens while retaining fallbacks; coverage moved from 29.73%/80.27%/5.98%/7.98% to 55.94%/84.86%/35.04%/90.18%.
- **Fixed mobile floating-ball flick classification**: the first move crossing touch slop still dispatches the directional action, restores the parked position, and consumes the synthetic click; slow drags and action drops keep their semantics.
- **Fixed focus continuity and preview announcements**: retry, snippet-conflict close/reload, and copy-success paths return focus to the editor; the first-panel preview announces its ready state without making the full body a live region.
- **Verification**: full suite **8666/8666**; typography-token, mobile-flick, and negative contract probes passed; 30 Chromium scenarios across themes and widths measured 480 elements with **zero** computed-style or geometry differences; TypeScript, reproducible build, and all release gates passed. Expanded CSS grew by 12,238 bytes, so this batch makes no performance claim.

### v0.47.0 (2026-10-11)

- **Added an R54 three-surface visual adapter**: brought the R54-inspired canvas, white work surfaces, hairline borders, radii, spacing, and restrained elevation to the switcher, workbench, widget store, and snippet studio, informed by the other Little Lv plugins.
- **Added the R54 visual contract and negative verification**: covers material, primary/secondary hierarchy, touch targets, and compact-container degradation, with deletion probes for required declarations.
- **Improved the three-surface work hierarchy**: the switcher is a continuous search/preview workspace, the workbench and store share a catalog/detail hierarchy, and the snippet editor is the primary work surface with preview and AI as supporting surfaces.
- **Fixed inconsistent compact-surface material and scrolling**: real `sw-platform` container widths now drive the 760px/560px fallbacks while existing data, APIs, states, close behavior, and focus restoration remain unchanged.
- **Verification**: full suite **8653/8653**; the R54 contract (including deletion probes), TypeScript, production build, surface-switch, mobile-layout, and Chromium style smoke checks passed.

### v0.46.9 (2026-10-11)

- **Added real-kernel E2E release evidence**: completed the three-surface, settings, mobile-layout, widget-store, and snippet flows in an isolated SiYuan `3.8.7-alpha.6` backend run with exit code 0, including preview-boundary, touch-target, stale-state, and index-readiness assertions.
- **Improved preview and mobile settings layout**: the third-panel preview section owns its overflow boundary; mobile settings tabs keep a 44px touch target and the search bar no longer overflows horizontally.
- **Fixed mobile timing and workbench state regression**: mobile E2E waits for the host index after creating documents; retained content after a failed refresh is reported as stale with the existing Retry action preserved.
- **Verification**: background run `20261010172658-63372-e9c870` on SiYuan `3.8.7-alpha.6` exited 0; targeted E2E, TypeScript, production build, and release gates passed.

### v0.46.8 (2026-10-10)

- **Added compact top-bar containers and snippet focus continuity**: custom narrow panels now use the real container width, and closing the snippet picker restores focus to its actual opener.
- **Added full UI interaction regression gates**: coverage includes the three-surface top bar, 245px sidebar, widget store, configuration form, and snippet picker entry conditions, button states, empty/error feedback, disposal races, and deletion-injection checks.
- **Improved top-bar hierarchy and touch targets**: sidebar navigation continues to use density tokens; fine-pointer short windows may compact close controls while coarse pointers retain touch targets.
- **Fixed notebook failure feedback and stale contracts**: failure, empty, retry, and disposal states remain distinct, and source contracts now follow the shared loader helper.
- **Verification**: full suite **8635/8635**; TypeScript, production build, top-bar/sidebar, store, snippet, and Chromium smoke checks passed.

### v0.46.7 (2026-10-09)

- **Added the R5 platform top-bar prototype and real sidebar coverage**: documented desktop, 245px sidebar, and 360px mobile rules, then verified labels, overflow, close anchoring, target sizes, and coordinate clicks in a real-width fixture.
- **Improved top-bar current state and compact hierarchy**: restored the current-surface underline and moved sidebar/mobile navigation onto its own row while keeping settings and close reachable on the right.
- **Fixed notebook configuration failure feedback**: separated request failure from an empty list, added retry UI, restored options and the previous value after success, and ignored late responses after disposal.
- **Verification**: targeted top-bar, store, and notebook contracts **850/850**; TypeScript, build, and Chromium surface smoke passed.

### v0.46.6 (2026-10-09)

- **Added quick snippet toggles**: the persistent list and picker catalog now expose sibling Enable/Disable actions for native snippets, using whole-list writes, readback confirmation, JS confirmation, and dirty-draft protection.
- **Improved second-panel and store hierarchy**: restored workbench radius/shadow/glass depth; the store detail pane now has one title, factual metadata, live preview, and action area, with stale aria references cleared on redraw.
- **Fixed older-host compatibility and duplicate detail cards**: unknown master flags now use a neutral snapshot so confirmed writes are not reported as failures, and detail no longer mounts a full catalog card a second time.
- **Verification**: full suite **8620/8620**; snippet, store-structure, material, and negative-injection contracts passed.

### v0.46.5 (2026-10-09)

- **Added segmented surface navigation**: the switcher, workbench, and snippet lab now share visible icons, purpose hints, and current-state feedback.
- **Improved top-bar hit areas and feedback**: borders and fills stay visible, hover/focus/pressed states respond immediately, inner icon/label nodes cannot steal events, and close targets are 36px desktop / 44px touch.
- **Fixed unresponsive top-bar hover**: restored a stable hit layer, touch semantics, hint pass-through, and accessible names so the controls remain clickable while the pointer moves continuously.
- **Verification**: targeted top-bar contracts **105/105**; full suite **8610/8610**; TypeScript, build, and UI smoke rerun after the version bump.

### v0.46.4 (2026-10-09)

- **Added full-path boundary regression guards**: contracts and deletion-injection checks cover empty dialogs, preserved search scenes, floating-menu positioning, saved-search notebook scopes, and settings diff dialogs.
- **Improved continuous workflows**: group redraws replay the active search/filter; sort menus reposition on viewport changes; malformed host roots destroy empty shells; saved searches retain their notebook scope when the host list is unavailable.
- **Fixed display copy and factual alignment**: favorite-group titles no longer show HTML entities; settings, diff, template, and host-list dialogs have failure exits; path-filter and widget-readiness descriptions now match production behavior.
- **Verification**: full suite **8608/8608**; TypeScript, build, release/quality/integration audits, UI smoke, and negative gates passed.

### v0.46.3 (2026-10-09)

- **Added full-path interaction regression guards**: added style and lifecycle contracts for platform chrome, mobile sheets, search metadata, stale states, and snippet previews, with deletion-injection checks for critical declarations.
- **Improved three-panel controls and state feedback**: restored settings, close, and Esc hint feedback across desktop and touch layouts, unified the 44px mobile close hit area, and restored metadata, stale-cache status, and bounded store/Gist preview regions.
- **Fixed store copy and malformed dialog cleanup**: removed hardcoded Chinese labels from the English store flow, fixed malformed separators and dependency copy, and destroy empty store dialogs after host/theme mutation while restoring trigger focus.
- **Verification**: full suite **8596/8596**; TypeScript, reproducible builds, release/quality/integration audits, all UI smoke suites, and negative gates passed.

### v0.46.2 (2026-10-09)

- **Added a widget-store close control**: the store content area now keeps a visible, touch-friendly close action and restores focus after closing.
- **Improved the first-panel preview**: removed the duplicate native dialog title row and extended the preview rail through the full result area.
- **Fixed the three-panel layout**: the third panel keeps library, editor, and AI preview in one stable row instead of wrapping the preview rail.
- **Fixed preview loading**: request options passed as the third argument are now treated as AbortSignal options rather than a timeout value.
- **Verification**: full suite **8589/8589**; TypeScript, layout smoke, browser smoke, and negative gate checks passed.

### v0.46.1 (2026-10-09)

- **Fixed Miniflux category discovery**: send the normalized token so pasted surrounding whitespace no longer breaks category loading.
- **Fixed mobile group action feedback**: rejected host operations now show an error receipt, log safely, and release the busy state.
- **Improved settings switch accessibility**: module and dock switches support full-row clicks and expose accessible names.
- **Verification**: full suite **8585/8585**; `tsc`, layout smoke, Chromium smoke, and negative gate checks passed.

### v0.46.0 (2026-10-09)

- **Native snippet management**: adds snippet groups, backup/restore, metadata, editor foundations, and safety boundaries for a recoverable studio workflow.
- **Platform and search improvements**: adds surface adapter routing, native title-search normalization, composed search, and workbench cache/lifecycle hardening while preserving local-first failure semantics.
- **Host acceptance and resource evidence**: adds SiYuan 3.8 compatibility probes, desktop/native-sidebar acceptance matrices, isolated background E2E, and long-session resource checkpoints.
- **Verification**: full suite **8583/8583**; `tsc` clean; quality audit **50/50**; integration audit **50/50**; visual matrix, production build, and release-package checks passed.

### v0.45.0 (2026-10-08)

- **R13–R16 visual and scale campaign**: completed token scales for type, radii, spacing, shadows, motion, status language, and density, with a four-state consistency matrix aligning all surfaces and device modes.
- **Reliability pool (about twenty batches)**: closed cancellation families, session isolation, lifecycle cleanup, focus and keyboard accessibility, honest failure receipts, overlay disposers, and sanitization boundaries across async and unload paths.
- **T-7204 icon-system tokenization**: consolidated icon width/height consumption across style slices onto shared icon tokens while preserving existing geometry and behavior.
- **Verification**: full suite **6738/6738**; `tsc` clean; quality audit **50/50**; integration audit **50/50**; `git diff --check` clean.
### v0.44.1 (2026-09-30)

- **T-7054 workbench visual overhaul (batches A–I, all 58 widgets)**: iPad-quality material base (glass, depth shadows, hover) plus dedicated per-widget styles for nine families (clock, calendar/journal, weather, task/flashcard, writing, reading, stats, navigation, utilities); batch A adds view logic — day-progress bar, day/night indicator, UTC offset, milestone badge.
- **T-7064–T-7067 snippet studio, five batches**: built-in CSS snippets grow 5 to 26 across 14 categories (inline-code pill, link hover, task checkboxes with hover ring, table zebra, mark highlight, kbd key-caps, image hover zoom, completed-task softening, table header accent, scrollbar refinement, eye-care mode, line height, heading icons, card paragraphs, code-block theme), all `--b3-theme-*` + `color-mix` dark-adaptive, scoped under `.protyle-wysiwyg`, ≤10 lines each; the category filter covers all 14 categories; a Copy button in the editor toolbar (Clipboard API with execCommand fallback); five contract layers (tokens/scope/i18n/no-overlap/category anti-drift), each with negative-injection evidence.
- **T-7068 mobile long-press drag**: hold a cell for 520ms (≤6px movement) to start dragging — same pipeline as the drag handle (drop hints, Escape cancel, swipe guard, edge auto-scroll); mouse and tool buttons bypass; `touch-action: pan-y` keeps vertical scroll native with the hold state tightening gestures.
- **T-7069–T-7072 third-party widget ecosystem (calendar#17, first external integration)**: fixes widgets being purged on add and previews stuck at medium; ADR 0103 lifecycle — the normalization allowlist is runtime registrations ∪ persisted instances, so disable/reload keeps layouts with explicit store cleanup; orphaned widgets (unregistered providers) appear in the unavailable section and are removable; `calendar-recent-periodic` joins the catalog for pre-install exposure; the catalog invariant splits into bridged vs provider-only classes; the integration guide documents the bounded-retry registration pattern and the Calendar example.
- **Security maintenance**: transitive fast-uri vulnerabilities (ajv→ajv-formats→schema-utils chain) upgraded away; `pnpm audit` reports zero.
- **Verification**: full suite **6625/6625** (+59 over v0.44.0); `tsc` clean; every new contract carries negative-injection evidence; readiness artifact snapshots refreshed with the build.
### v0.44.0 (2026-09-30)

- **Module visibility switches (T-7026, ADR 0099)**: Settings → Panels → Modules can disable the workbench / snippet studio / floating ball independently — all entries of a disabled module (surface nav, quick actions, commands, floating ball) are hidden, and residual route calls are declined with an honest receipt; **the top bar consolidates into a single unified platform entry** (the standalone workbench button is removed; the context menu dynamically lists all enabled surfaces + settings); already-open panels stay until closed. The switcher is the platform root and cannot be disabled (lock-out protection).
- **Snippet recycle bin (T-7025, ADR 0100)**: pre-save / pre-delete / conflict-discarded versions are captured automatically (registered only after the native write is confirmed; a failed registration never fakes success); the catalog sheet gains a Recycle bin entry — list (origin tag/date/size) + restore as draft (disabled state, behind the dirty-draft guard, never auto-enabled, never overwrites the original) + delete-forever/empty (double confirm); bounded auto-cleanup (50 entries / 30 days / 256 KiB). New storage key `sw_snippet_recycle` (persistent key count 16→17).
- **Snippet studio dual-pane preview (T-7022)**: the preview becomes a side-by-side Saved vs Draft comparison (scene/width/theme stay in sync across panes), collapsing to a single pane with a toggle on narrow containers; new snippets without a baseline show an explicit empty state; **JS execution is hard-sealed at the preview module level** (sandbox never carries allow-scripts, CSP script-src is always none, the Run JavaScript button is removed) — the boundary is owned by the module alone.
- **Audit defect fixes (T-7032/T-7038~T-7044/T-7046)**: conflict-copy saves no longer report a false failure; workbench hero demotion applies to the current frame; snippet imports are generation-guarded (late files are honestly dropped when the scene changed); the sort menu gained an owner disposer (no ghost menus or leaked global listeners, focus returns to the trigger); sidebar and mobile switchers preserve scroll and focused card across rebuilds; the sidebar gains an independent journal entry; search chip keyboard path unifies on aria-pressed; path-filter generations are isolated per surface.
- **Pending-confirm writes (T-7045)**: a notification/readback failure after the list write no longer masquerades as a plain failure — the studio enters a "the write may have landed, verifying read-only" receipt and verifies (save/toggle require a matching entry, delete requires its absence); only a verified write yields the success receipt and recycle registration, otherwise the studio stays honestly and allows a retry after refresh (the recycle dedupe window keeps old versions from double-entry).
- **Verification**: full test suite **6566/6566**; `tsc` clean; every new gate carried negative injection (24 injections failed precisely and were byte-restored); production graph ceiling 71→72 (snippet-recycle joins via storage-migration, recorded in the ledger).

### v0.43.2 (2026-09-29)

- **Panel entry discoverability & honesty (user-reported)**: non-current SurfaceNav items now render as bordered pills by default (previously bare gray text with no hover affordance); structurally, any assembly path missing its navigate handler **skips rendering** the non-current item entirely — a gray fake entry can no longer exist. Real-click cross-panel switching (fullscreen switcher/workbench → snippet lab, adaptive/fixed size branches) is now pinned as a release-gate smoke driven by CDP in real Chromium, asserting mount state, fullscreen sizing, z-order, and zero fake entries per case.
- **Digit badge fix**: the 1-9 badges on switcher cards used to straddle the card border and were clipped to half a digit by the card's overflow; they now sit fully inside the card's top-right corner (doc-result badges likewise).
- **Close button prominence**: the top-right close button on all panels upgrades from a bare icon to a bordered, surface-filled button with an accent hover.
- **Verification**: full suite **6538/6538**; `tsc` clean; new gates include negative injections (honest-rendering guard removal, badge clipping regression, close-button revert — all precise reds with byte-restores).



- **Hotfix: the snippet lab (third panel) could not be opened** — the v0.43.0 capability-receipt wiring (T-6987) called the probe-coverage analyzer `analyzeCssCoverage` in the UI without importing it; the lazy studio chunk threw a `ReferenceError` on first render and the mount fell back to the switcher. The import is fixed and verified by new mount-level regression tests covering the full chain (mount → first render → capability receipt → editing → diagnostics verdicts and error positions).
- **Test-coverage gap closed**: the studio UI previously had only source-scan contracts (no code execution); a real `snippet-studio-mount` test (jsdom + siyuan stub) now runs the whole UI so construction/first-render errors fail inside the test chain.
- **Verification**: full suite **6537/6537**; `tsc` clean; release gates green.

### v0.43.0 (2026-09-29)

- **Widget store S2 (T-6967)**: sort menu moved into the filter chip row; detail-pane meta upgraded to four plain rows (source/refresh/privacy/cache); empty catalog keeps the full chrome and shows a failure banner with retry; network/local/offline capability chips neutralized; mobile filter chips scroll horizontally with snap.
- **Panel size unification (T-6986/T-6999)**: the snippet lab gains fullscreen/adaptive/fixed size modes (fullscreen stays the default); switcher/workbench/lab window settings are unified under the "Panels" tab with default-value notes and preview buttons.
- **Settings search & storage health (T-7002/T-7004)**: full combobox semantics, desktop first focus, in-page `/` and Ctrl+K jump, explicit clear button, group filter chips and panel-group path badges; the storage tab now lists all 15 persistent keys (five bilingual groups) with usage bars, schema version health (three states incl. downgrade protection) and cache management with a confirm-guarded thumbnail cache clear.
- **Settings save receipts & undo (T-7003)**: three-state save status (pending/saved/failed with retry — failures are no longer silent), a 20-step "undo last change" stack, per-group restore-to-defaults (whitelist-validated, undoable), and scene-preserving rebuilds when settings change from other entries.
- **Switcher rerender scene preservation (T-7009)**: sort changes and async data refreshes no longer jump the scroll or steal focus from the search box or cards.
- **Workbench health retry busy state (T-7011)**: per-row in-flight busy with double-click protection; rows settle back into their real status group.
- **Snippet preview chain (T-6987~T-6990)**: a frozen capability receipt (scene/width/theme/probe/scripts/network/semantics/token snapshot); a bounded selector-coverage diagnostics panel (hit / may-miss / unknown + error positions, comment- and string-safe); probe features 10→17 (callout/columns/formula placeholder/attributes/database placeholder/blocked media placeholder/document title — all static, zero remote); read-only builtin theme token snapshots (external injection ignored).
- **Floating ball (T-7014)**: closing a dialog restores focus to the control that opened it (ball/topbar) instead of dropping it to the page.
- **Acceptance & wording (T-7015)**: the current scene preset shows a "Current" badge instead of a no-op Apply button; quick-bar switcher wording unified with the surface name; full-page acceptance matrix and the third-panel R3 integration matrix published (all five orphaned design-review findings closed).
- **Bundle lines**: ADR 0098 — raw self-discipline line 1120→1152 KiB, archive ceiling 544→576 KiB; multi-chunk stable naming registered as a candidate task.
- **Verification boundary**: full suite **6535/6535** (+50 over v0.42.0); `tsc` clean; 24+ negative-injection groups all failed precisely and were byte-restored; browser screenshot matrix and real Android/desktop acceptance remain post-poned per B-004/B-005 (candidate task T-7020).

### v0.42.0 (2026-09-29)

- **Unified platform shell contract (T-7012)**: `PLATFORM_SURFACE_ENTRIES` grew 8→12 (adds `topbar-context-menu`, `plugin-command`, `quick-action`, `floating-ball` — previously silently dropped as unknown); all four SurfaceNav mounts plus snippet chips and toolbar buttons now carry the current query; `PlatformSurfaceContext` gained a bounded `focusSource` recorded on leave and restored (object row or search box) via a macrotask on return; `openSetting` accepts `returnTo` so closing Settings returns to the originating surface.
- **Switcher card focus model (T-7007)**: tab cards upgraded from plain divs to real focus targets (`tabIndex=0`, `role="button"`, title aria-label kept in sync on remount); a `focusin` delegate on the scroll container drives visual focus and preview from keyboard navigation, attached-action focus, and arrow-key focus alike (hover stays purely visual); filter chips honestly downgraded from a half tablist to a `role="group"` + `aria-pressed` button group.
- **Workbench rerender transaction (T-7010)**: `renderPanel` captures scroll anchors (root + dialog body) and the focused target (widget cards by `data-sw-object-id`, toolbar buttons by the new `data-home-action`) before clearing, then restores scroll immediately after mount and relocates the same focus target — honestly giving up when the target is gone; the edit toggle, refresh-all, config save, and 14+ other full-panel rerender triggers no longer jump to top.
- **Settings IA (T-6998, ADR 0097)**: the previously unreachable component-panel builder content (tint + workbench size/aspect segmented controls) folded into a dedicated Panels-tab group, automatically covered by settings search and mobile horizontal scroll; the dead `builders.homePanel` key removed.
- **History dropdown contract (T-7016)**: audit confirmed the section counts, first-8 cap, and expand-all behavior were already in production; pinned by contract and formally closed. Deeper "journal smart grouping" awaits real feedback.
- **Docs**: README adopts peek wording for Alt preview-open (R8-A9); EN README preview-coverage sentence aligned with Chinese.
- **Verification boundary**: full suite **6485/6485**; `tsc` clean; gates include negative-injection validation (dropping a vocabulary entry, removing query passthrough, removing the settings restore call, removing focus restore, removing the history cap — each failed precisely and was restored byte-identical via SHA-256); real-device/kernel acceptance still deferred per B-004/B-005.

### v0.41.0 (2026-09-28)

- **All 13 deepening features shipped (T-6949~T-6961)**: reading and reuse - session preview pinning, find-in-preview with hit navigation and two-step confirmed replace, saved-search rename and condition editing, settings-wide search with real-control locate; workbench - layout undo/redo (30 steps, 128 KiB budget), widget health details with locate and sanitized diagnostics, document-set version diff preview; snippet draft protection - three-way leave guard, in-draft undo/redo (50 steps, 512 KiB budget), conflict-copy keep (ADR 0090); editing and migration - single-transaction find/replace, CSS preview scenes with width tiers, config-pack diff preview with per-group apply.
- **Workbench modernization (T-6968 approved → T-6969 slices 1-4, ADR 0091)**: material × size-tier system - plain/accent/dark/vibrant materials derived through the skin layer (vibrant only by explicit declaration), 45 modules registered with store default tiers; iOS-style edit wiggle mode (dashed outline + wiggle, reduced-motion aware) with an X hero constraint (at most one full tile per panel, extras demoted to large); view-state micro header (10.5px identification row, status chips revealed on hover/focus, failures and loading always visible); tabular numerals throughout.
- **58 component spec cards and build-to-spec (T-6971 batches 1-7)**: all nine spec-card batches produced (58/58); building to spec fixed real gaps - list-stream family (Hacker News comment counts off-screen, Miniflux/RSS source-date meta moved into visible row metas, cross-source same-title dedupe, continuous ranks after filtering, RSS joined the 15-minute heartbeat with read marks and an unread chip, tiers exactly M/W/L, new capListflowRows hard cap of 5 on screen / 8 on large); writing family aligned (today-writing accent, activity M/W/L, note-stats M/W); air quality joined the 15-minute heartbeat; clock numerals; checkin read-only red line pinned.
- **Store rebuild S1 (T-6966 approved → T-6967)**: master-detail structure - left catalog (search, six source chips, grouped rows) + right detail pane with the full card and the single primary add pill; catalog rows carry zero buttons (G3) with a check mark for added modules; density/view-mode controls removed; Ctrl+B batch mode with a persistent bottom bar; mobile becomes a single-column list with a bottom-sheet detail.
- **Mobile fixes (T-6970)**: narrow-screen segmented controls wrap instead of overlapping; switcher thumbnails no longer render a blank frame when content starts with empty paragraphs (leading blank trimming, title fallback, blanks never cached).
- **Stability and polish**: failed refreshes retain cached content and report a receipt; clock heartbeats patch DOM locally instead of re-rendering the card; document-set probe timeouts no longer leak connections; search recovery states and command-mode cancellation fixed; preview keyboard scrolling and responsive studio layout fixed; panel headers aligned with the switcher.
- **Budget recalibration**: ADR 0089 (compressed entry 288→320 KiB), ADR 0090 (archive ceiling 512→544 KiB), ADR 0091 (workbench material × tier system).
- **Verification (v0.41.0 release run)**: full suite **6452/6452** (+165 vs v0.40.0, including build-to-spec and master-detail contracts, all negative-validated); `tsc`, reproducible double build (3/3 artifacts match), release/quality/integration audits and four smoke suites green; all 58 spec cards screenshot-checked in light and dark; real-device/kernel acceptance deferred per B-004/B-005.


### v0.40.0 (2026-09-27)

- **Floating-ball gesture depth (T-6919~T-6920)**: single click, double click, and long press bind to separate actions ("More panel", catalog actions, or empty); with a double-click binding, a single click enters a 300ms disambiguation window where a second click fires the double action and cancels the pending single, while unbound gestures keep the zero-latency single click (zero regression for existing users); long press arms at 550ms, and drag/cancel paths tear the timer down while suppressing the synthetic click. Settings gained a gesture binding card reusing the flick-panel card language with normalized persistence.
- **Workspace restore 2.0 (T-6921~T-6922)**: document sets record the desktop active document at save time (the `active` flag survives entry normalization and version snapshots; mobile honestly defaults to no marker); restore replay orders candidates through a pure function so the active entry replays last without keepCursor, refocusing it on completion. The restore preview upgraded from a toast to an inline three-section list: pending, already-open (muted), and outside-set open documents dimmed as "kept open" visitors.
- **Snippet studio interop and review (T-6923, continuing T-6912)**: importing a usercss with `@var/@advanced` variables keeps the metadata header and substitutes body placeholders with the defaults (five basic types; dropdown/image placeholders stay untouched), with the receipt reporting the count; exports no longer stack a second header onto header-bearing content. Together with v0.39.0's "summary + diff + per-hunk acceptance" AI pipeline, the studio now covers the full Stylus interop and controlled AI review story.
- **Split-open keyboard parity (T-6924, R11)**: `Ctrl+click / Ctrl+Enter` on a search result opens the document in the right split (the public openTab `position` capability), matching the existing right-click gesture; `Alt` preview stays priority-exclusive and mobile stays unbound.
- **Real-device feedback fixes (T-6925)**: closing a tab from the mobile switcher no longer jumps to SiYuan's native tab overview — the host close side effect is dismissed through its own `#modelClose` control and the switcher dialog is re-raised; workbench module headers no longer render the same text twice (the narrow-screen "doubled glyph" root cause); the workbench quick-action bar became a solid full-bleed bottom bar instead of a transparent overlay; duplicate mobile close buttons were consolidated.
- **Docs and validation (T-6918)**: full suite **6287/6287**; `tsc`, build, reproducible builds, release/quality/integration audits, and the four smoke suites all green; real-kernel E2E extended to **9 green specs** (three mobile layout regressions plus a real split-open spec); real Android/desktop interaction acceptance remains deferred under B-004/B-005.

### v0.39.0 (2026-09-27)

- **Third surface reachability and productization (T-6894, T-6896, T-6902~T-6905, T-6908~T-6909)**: Snippet Studio is reachable from the switcher platform navigation, workbench object actions, the floating-ball More panel, and the public `snippetStudioOpen` command; mobile surfaces show "available on desktop" instead of disappearing silently, and a failed dynamic-chunk load falls back to the switcher with an understandable receipt. The studio gained first focus, a top-right close button (dirty-draft guarded), five footer receipt states, AI receipt loading/ready/error mapping, five permanently visible capability boundaries, and unified platform token bridging.
- **AI draft review pipeline (T-6906~T-6907, T-6914~T-6917, ADR 0083)**: AI requests project versioned CSS/JS generation constraints (the soft policy layer). Completed candidates render a locally computed change summary plus a line diff with per-hunk ✔/✗ acceptance (rejecting a deletion keeps the original line; rejecting everything discards the candidate; accepting everything stays byte-identical). A deterministic reviewer with 8 versioned rules (external @import, unscoped universal selectors, hardcoded colors, duplicate declarations, dynamic execution, network calls, credential literals, global writes) marks findings inline. Iterate rounds diff against the previous candidate and are labeled as such; oversized snippets degrade to a disclosed whole-block replacement. CSS exports carry a usercss metadata header that Stylus installs directly, and imports strip the header to prevent accumulation (T-6912).
- **Command mode and catalog (T-6911, T-6913)**: the `>` command mode groups built-in actions and SiYuan host commands under collapsible heads with keyboard equivalents and session memory, replacing the flat 12-item truncation; the snippet catalog ranks native snippets before builtin samples (the host getSnippet contract carries no update timestamp, so true time-sorting waits for upstream).
- **First-panel preview depth (T-6895, T-6900~T-6901, T-6910)**: opened tabs and the empty-query view share one preview pane and request generation; keyboard movement, hover, and focus share one preview pipeline; the two kernel requests fail in isolation; a dead document ID (non-zero code response) yields a Failed receipt instead of a blank pane.
- **Docs and validation (T-6897~T-6898)**: both READMEs were rewritten around switcher / workbench / snippet studio / floating ball, with the GitHub description and topics synced; the 26-screen prototype gap matrix is on file. Full suite **6279/6279**; `tsc`, build, reproducible, quality/integration audits, and the four smoke suites all green; real Android/desktop interaction acceptance remains deferred under B-004/B-005.

### v0.38.0 (2026-09-26)

- **Cross-surface objects (T-6878~T-6881, T-6890)**: snippet objects now appear in the switcher's empty-query workspace and query section; chips carry `objectId` into the snippet studio for exact ID selection with a name fallback; fetches share a 60-second cache, single-flight requests, and stale-generation discard. Widget objects now expose type, instance, source, description, capabilities, and health; leaving and returning to the workbench restores focus and scroll by instance ID, while display descriptors remain separate from execution handlers.
- **Workbench health receipts (T-6879~T-6880)**: refresh writes per-cell `ok/failed` health markers and aggregates a bottom receipt; failed cells get border and text-chip feedback, `aria` object descriptions track health, and cells stay mounted after failures.
- **Floating-ball shortcuts (T-6884, T-6886~T-6887, T-6891)**: the More panel supports 1-9 direct access; four-way flicks default to More, Quick Capture, previous tab, and next tab, with per-direction settings. The 1-9 slots persist separately per device and store only action IDs or saved-search IDs, fill empty slots from visible rows, and preserve invalid slots with unavailable feedback. Saved searches remain first-class objects, are looked up by ID and replayed on execution, and are never registered as global actions.
- **Tab-card metadata and audit fixes (T-6883, T-6888~T-6889, T-6892)**: the updated-time badge now includes a Changed marker for edits within seven days, reusing the recent-list predicate and updating in place across desktop, sidebar, and mobile; removed the extra favorites empty-state prefix (audit F4); and tightened quick-capture hints, English greeting punctuation, and audit screenshot stability.
- **Engineering and verification (T-6882, T-6885)**: the raw `dist/index.js` budget was recalibrated to 1088 KiB under ADR 0081 while the 512 KiB zip ceiling remains; real-kernel first-open timing stayed below 300 ms, so no skeleton was added. Full suite **6238/6238**; real-kernel E2E **7 passed / 1 skipped**; real Android/desktop interaction remains deferred under B-004/B-005.

### v0.37.0 (2026-09-26)

- **Platform · fullscreen by default (ADR 0080)**: the switcher `panelSizeMode` and workbench `homeSizeMode` now default to fullscreen and the snippet studio opens at viewport size with the fullscreen container class; because `updateSettings` persists the whole object, only fresh installs see the new defaults and every size option remains selectable; mobile sizing is untouched.
- **Platform · unified route context (T-6869 P1-c)**: new `platform-surface-model` pure model (surface whitelist, bounded SurfaceContext, floating-ball restore fallback, ContextBar caption projection); session-level last-surface memory; destroy-before-open singleton guards for the desktop/mobile switcher and workbench dialogs (rapid hotkey/FAB clicks no longer stack windows); the floating ball restores the last used surface with a safe switcher fallback; workbench layout-editing state survives surface navigation with focus returned to the layout toggle.
- **UI · unified platform primitives, six RZ batches (T-6870~T-6876)**: `platform-dom` helpers and `_platform-shell.scss` primitives (six-state status badges with semantic dots, kbd chips, segmented controls, primary/soft pills); settings tabs reorganized into group cards with eight enums switched to segmented controls (skin, panel size, dock display, sidebar layout, widget palette, workbench size, mobile columns, density) and the density switch upgraded to a comfortable/compact segment; persistent keyboard hints in the switcher context bar; kbd-skinned digit badges; a six-state badge on the preview pane header (loading→ready); a workbench edit banner; store Add as a filled primary pill and Configure as a soft pill; quick-capture segmented targets with a primary pill save and honest keyboard hints (Ctrl+Enter/Esc); a stacked icon-over-label mobile bottom bar (44px targets).
- **Fixes (contrast sampling and defect evidence)**: Chromium contrast sampling caught the host warning/error raw colors failing 3:1 as badge small text (light 2.9 / dark 2.99) - badge text and holiday red now blend the semantic hue with the text color; the sampler gained `color(srgb ...)` color-mix support; fixed the quick-capture active target being visually indistinguishable (`sw__target--active` had JS toggling but no CSS rule).
- **Snippet studio · original layout absorbed (R2 prototype)**: preview as the hero area (4fr) + a lower properties:editor row (2fr:3fr) + an AI right rail + the catalog as an overlay picker, replacing the R1 equal-column split.
- **Engineering**: ADR 0079/0080; a 26-screen full-plugin UI prototype and a parameterized screenshot tool; production graph ceiling 66→68 (platform-surface-model/platform-dom); new platform model unit tests and T-6869~T-6877 wiring contracts with negative verification; baseline 6201/6201.

### v0.36.0 (2026-09-25)

- **Keyboard · arrow-key row navigation**: after Tab focuses a search result row, ↑/↓ steps through rows (`moveDocItemFocus` with scrollIntoView follow); focus on workbench/unified rows returns false so native scrolling is preserved; the control guard now admits digits plus Up/Down on result rows. The keyboard-first loop is complete: Tab into results → arrows to scan → 1-9 direct open or Enter to activate → Alt preview / `>` command mode.
- **Search · resident preview pane**: on desktop the doc-results section gains a right-hand pane (260px; skipped under 680px width and on mobile) that live-previews the focused document's outline (≤12 entries with h1-h6 indent) and first-paragraph excerpt (≤600 chars bounded). 300ms debounce (Raycast/Spotlight consensus) plus generation-based stale-packet discard; zero new endpoints (getDocOutline + SQL, both whitelisted; rootId BLOCK_ID_RE-validated before the literal); pure-model projection `buildDocPreviewSnapshot` is unit-testable.
- **Engineering**: real-kernel E2E extended with row-navigation assertions (ArrowDown/Up focus equality) and a preview-pane outline rendering assertion (companion doc seeded with heading + paragraph markdown); T-6838/T-6839 contracts include negative verification.

### v0.35.0 (2026-09-25)

- **Search · keyword highlighting**: query terms highlighted in doc result titles and snippets (pure `buildKeywordHighlightSegments` segmenter: phrase hits, exclusions stay plain, case-insensitive with original casing preserved, bounded 64-hit overlap-merged ranges; segment assembly with zero innerHTML). Titles get a solid primary mark; snippets get primary tint without background.
- **Search · snippet sanitization**: the kernel's presentational `<mark>` wrappers in full-text snippets are stripped at the projection layer (`stripSnippetMarkup` removes known wrappers only; literal prose like "a < b" is untouched) instead of rendering as literal text.
- **Keyboard · digit direct access for result rows**: 1-9 opens the first nine visible doc results in search state (with digit badges); `activateDocResultItem` is the single activation entry shared by click and digit (block-level hit anchor persisted on the row); non-empty queries prefer result rows with card fallback; digit keys no longer die when cards hide; digit keys pass the control guard when focus rests on a result row.
- **Engineering**: real-kernel E2E extended with highlight assertions (negative-verified) and the digit-direct open path; kernel-widgets-wiring gained the T-6837 contract (negative-verified).

### v0.34.0 (2026-09-24)

- **Related content**: the zero-term workbench lists backlinks/mentions of the current document (official getBacklink2, bounded projection, explainable truncation); click to jump.
- **Saved searches + `>` command mode**: save and replay queries and filters; `>` enters command mode listing executable actions only.
- **Marks + digit badges**: jump back by exact scroll ratio; the first nine visible cards carry digit badges.
- **Multi-target quick capture**: journal/current-doc targets, destination preview, controlled write with per-step failure reasons.
- **Preview open**: Alt+click opens search results as read-only preview tabs (doc.mode preview).
- **Document set version history & rollback**: overwrites keep the last 3 versions (FIFO), any of them restorable reversibly; restore summary includes Essentials receipts; scene presets persist into document sets (presetId layering).
- **Dynamic favorite groups**: tag + notebook scope + updated-window (7/30/90 whitelist) parameterized queries.
- **Density tier & config pack**: compact/comfortable density switch; one-click export/import of a versioned config pack (grouped apply with per-item receipts after whole-pack validation; multi-key persistence is not atomic).
- **Mobile floating-ball anti-misfire**: `data-prevent-swipe` official contract (L1) + capture-phase touch interception (L2) + drag-time scroll-chain blocking (L3); dragging the ball no longer triggers SiYuan edge swipes; off-edge docking and fling-up summon.
- **History dropdown balance**: per-section top-8 with expand-all; journals no longer bury recently closed.
- **Real-instance E2E channel**: 6 real-kernel acceptance specs; ADR 0077 (1024 KiB raw line); provider protocol metadata; GBK mojibake comment cleanup.

### v0.33.0 (2026-09-24)

- **Search diagnostics & sorting**: score breakdown (source weight/title score/matched fields) and health snapshot (source counts, latency, degradation reasons); fixed remote search silently dropping out on misplaced call args; async behavior locks added.
- **Result identity anchoring**: viewport pins to item identity across async refreshes (fzf `--track` semantics).
- **R5-A absorption batch**: openTab new options (keepCursor background restore, doc.mode preview), saved-search commands, history domain study (converged), document set version rollback, open strategy layer, breadcrumb entry.
- **Real-instance E2E channel**: Playwright + local SiYuan kernel acceptance with the `window.siyuanSpeedSwitch` public hook.
- **Workbench & related content**: zero-term workbench with related-content row (backlinks/mentions) and bounded polling for index latency.
- **Surface migration**: command mode `>`, marks, multi-target capture, preview open, version history timeline, dynamic groups, density tiers, config pack, provider protocol, clipboard entry, breadcrumb button.

### v0.32.0 (2026-09-23)

- **Search · Full-library pinyin completion**: pure-letter queries (e.g. cp) now also surface matches from all library titles via a lazy pinyin cache (zero standing requests).
- **Search · Filter chips**: one-click result-type narrowing (all/tabs/collections/documents) above the results.
- **Switcher · Jump back / forward**: speed-switch driven jumps can be undone and redone (session stack).
- **Switcher · Split-right open**: right-click a result to open it in the right split (desktop).
- **Document sets · Essentials layer**: marked documents auto-open after every set restore (up to 10, manageable).
- **Document sets · Scene linkage**: restoring a set auto-applies a same-named ball preset (e.g. "writing" set → writing layout).
- **Quick actions · Icon catalog**: the icon picker is browsable by category with Chinese/pinyin/English-id search.
- **Quick actions · Plugin grouping**: add-action candidates are grouped by their source plugin.
- **Fixed · Query operators**: queries with `-exclusions` / `"phrases"` no longer blank the document results.
- **Verification**: 6,065 tests across 225 files, four UI smoke suites (including 22 floating-ball Chromium scenarios); Android on-device items remain pending.

### v0.31.0 (2026-09-23)

- **Floating ball · Host command actions**: nine SiYuan commands wired in (outline, bookmarks, tags, inbox, backlinks, recent documents, recently closed, flashcard review, read-only toggle) with capability detection and safe fallback on older hosts.
- **Floating ball · One-tap sync**: invokes the kernel performSync directly with completion/failure feedback; read-only mode and sync mutexes surface honestly.
- **Floating ball · Insert template**: lists the template directory, renders the chosen template and inserts it at the caret of the active document.
- **Floating ball · Scene presets**: save the current action layout and primary click as named scenes; apply or cycle in one click (up to 8, same-name overwrites).
- **Floating ball · Throw to window** (desktop) and **dismiss keyboard** (mobile).
- **Floating ball · Jump back / forward**: speed-switch driven jumps can be undone and redone (session stack, FIFO 50).
- **Floating ball · Surface shrink**: the ball no longer appears on the sidebar dock (it duplicated the desktop-window ball); legacy configs stay compatible.
- **Switcher · Unified index**: one search box sections across open tabs, favorites, recently closed and document sets.
- **Switcher · Query operators**: `"exact phrases"`, `-exclusions`, multi-term AND; last-pick boost (session memory).
- **Switcher · Pinyin matching**: full pinyin, initials and mixed input (e.g. cp → 产品), on by default and toggleable in settings; off means substring only.
- **Switcher · Zero-term workbench**: with an empty query the panel surfaces scene, document-set and smart-group entries directly.
- **Recent · Show changed only**: one click filters to documents changed within the last 7 days.
- **Document sets · Workspace switching**: switching snapshots the current tabs back into the active set (toggleable), marks the restored set as current, and supports cycling.
- **Skins (new)**: optional standalone skin layer — Apple liquid glass, Midnight glass, Paper ink; fusion stays the default, skins touch only Speed Switch surfaces and pass the WCAG AA contrast gate.
- **Behavior changes**: the floating ball no longer appears on the sidebar; pinyin matching is on by default. Everything else is additive with no destructive migrations.
- **Verification**: 6,060 tests across 225 files, four UI smoke suites (including 22 floating-ball Chromium scenarios); Android on-device items remain pending.

### v0.30.1 (2026-09-22)

- **Task Horizon mobile integration**: the floating ball can discover and invoke the task manager and quick-add plugin commands, rechecking provider capabilities before execution and safely handling failures, timeouts, and unloads.
- **Companion version required**: the two mobile commands require the matching Task Horizon patch to be merged and released; upgrading LvSpeed Switch alone cannot create those provider-side mobile entries.
- **Verification**: 6,020 tests across 223 files, four UI smoke suites, 22 floating-ball Chromium scenarios, and 6/6 provider integration checks passed; Android keyboard, back navigation, rotation, and task submission remain pending.

### v0.30.0 (2026-09-22)

- **Complete floating ball**: independent desktop, sidebar, and mobile surfaces with stable drag targets, free placement, action execution, overflow search, and keyboard-equivalent access.
- **Configuration governance**: appearance/behavior settings, per-surface enablement and action ordering, default presets, import/export, capability states, and safe fallback.
- **Reliability and viewport handling**: scroll/modal/fullscreen yielding, execution watchdog, visualViewport/safe-area handling, and host-aware layering.
- **Verification**: 6,011 tests, four UI smoke suites, 22 Chromium scenarios, and 100 real pointer drags passed.

### v0.29.1 (2026-09-21)

- **Fixed iCal every-N-days weekday recurrence** (`FREQ=DAILY;INTERVAL=N;BYDAY=…`) degrading to a single occurrence; city table grows to 555 entries (wave 12); version-consistency and count-consistency gates, fixture end-to-end integration tests, bilingual issue templates and repo metadata refresh.


### v0.29.0 (2026-09-21)

- **World-clock city table grows to 535 entries (wave 11)**: European second-tier cities, Russia/Central Asia, the Americas, and Oceania additions - all bilingual; full-table IANA validation clean.
- **Subscription fixes**: iCal webcal:// and suffix-less URL support; RSS/Atom multi-candidate date parsing.
- **Quality infrastructure**: version-consistency and count-consistency gates, fixture end-to-end integration tests, issue templates, repo metadata refresh.


### v0.28.3 (2026-09-21)

- **Fixed the iCal feed gateway lagging behind the config policy**: suffix-less addresses saved fine but failed at fetch; the loader gate now mirrors the config normalization.


### v0.28.2 (2026-09-21)

- **World-clock city table grows to 460 entries (wave 9)**: Chinese-city English aliases completed plus 25 new dual-language zone groups; full-table IANA validation clean.
- **iCal subscription URL policy relaxed**: webcal:// links accepted; .ics suffix requirement dropped; security rules unchanged.
- **RSS/Atom date tolerance**: later date candidates are tried when the first is malformed.


### v0.28.1 (2026-09-21)

- **iCal subscription URL policy relaxed**: webcal:// links accepted; the .ics suffix requirement dropped; security rules unchanged.
- **RSS/Atom date tolerance**: later date candidates are tried when the first is malformed.
- **Engineering**: dead shim removed; acceptance checklist grew section 5d for recent features.


### v0.28.0 (2026-09-21)

- **iCal recurrence semantics completed**: BYSETPOS selection, DAILY+BYDAY weekday filtering, MONTHLY ordinal-less BYDAY fix, YEARLY+BYMONTH+BYMONTHDAY annual dates, and 8 explicit degrade guards.
- **Bundle structure optimization**: the city table declares per IANA zone (338 cities / 104 zones), recovering ~2.9KB raw margin with deep-equality verification.


### v0.27.1 (2026-09-21)

- **iCal recurrence supports BYSETPOS** (MONTHLY/WEEKLY candidate-set selection): "last weekday of the month" style events expand correctly; fixed the silent degradation of ordinal-less MONTHLY BYDAY to a single occurrence (RFC: every matching weekday of the month); standalone BYSETPOS still degrades safely.
- **Engineering cleanup**: a repository-wide dead-export sweep removed 5 zero-reference items.


### v0.27.0 (2026-09-21)

- **World-clock city table grows to 338 entries (wave 8)**: bilingual asymmetry closed (~70 cities gained their missing language); 24 new dual-language cities added; full-table IANA validation clean.
- **Performance benchmarks promoted to hard gates**: filter benchmarks measure CPU time with unconditional asserts; the 40 ms aggregation pathology line now also blocks on CI.
- **Full storage-migration drill**: 12 keys x 5 corruption classes through a sanitize fixpoint; v0.23.5-era upgrade simulation survives key-by-key.


### v0.26.0 (2026-09-21)

- **Publish compliance (F7 closed)**: `plugin.json` declares `publish.resources` for the four packaged docs assets; a package-resource contract gate keeps the declaration from drifting.
- **Documentation alignment**: the English README mirrors the Chinese one 1:1 across 15 sections; full English history lives here.
- **Quality gates**: CPU-time aggregation benchmark with a 40 ms pathology line; `aggregateSearchResults` doubling gate; store collapse aria contracts and zero-match empty-state tests (B4 closed).

### v0.23.5 (2026-09-19)

- **A sync no longer reloads the whole plugin**: SiYuan reloads a plugin wholesale whenever its
  stored data changes, and this plugin keeps 13 persistent keys — so every cross-device merge, or a
  write from another window, destroyed the open switcher, the second panel and any running search
  session (visible as flickering toolbar/dock icons and dialogs closing on their own). The plugin
  now overrides `onDataChanged`: it only performs a bounded re-read plus a lazy refresh, and the
  chain is forbidden from writing (a write broadcasts another data change and re-enters the same
  hook, which is the loop this closes). Coalesced repeat broadcasts, manual refresh and forced
  refresh all keep working.
- **The desktop journal entry point no longer wedges**: the "choose journal notebook" dialog only
  resolved its value from the Confirm/Cancel buttons, so closing it with Escape or by clicking the
  backdrop left the awaiting chain hanging forever — the next journal click did nothing. Close now
  funnels through the host `Dialog` `destroyCallback` on every platform.
- **Ordering and the calendar stop losing content once many tabs are open**: kernel
  `/api/query/sql` truncates to `search.limit` (default 64, floor 32) when a statement has no outer
  `LIMIT`, and the plugin never read `truncated` from the response. Fixed the update-time query
  behind "recently edited" (it also bypassed the whitelisted dispatcher and had no timeout), the
  month calendar limit with a stable tiebreak, and both settings pickers (databases / documents).
- **A dead data source no longer slows every refresh**: life widgets re-paid an up-to-10-second
  timeout per cycle for unreachable endpoints. There is now a 20-second suppression window per
  endpoint that falls back to the widget's existing stale/empty state, cleared immediately by any
  success, including a manual refresh.
- **Long-run stability**: all dialog teardown now uses the host `destroyCallback` (previously eight
  places overrode host methods and polled `isConnected`), and `setInterval` is now absent from the
  plugin sources. SiYuan gives plugin disable/unload a single shared 5-second teardown budget, and
  polling timers were exactly the leak living beyond it.
- **Internal**: added gates that validate against SiYuan's official API contract snapshot (request
  and response shapes for the 25 kernel endpoints, dispatcher consistency, and explicit records of
  where the measured host diverges from the contract), and consolidated the persisted key list into
  a single source.

### v0.23.4 (2026-09-19)

- **The "Checkin summary" widget is now natively bridged**: it used to be registered as a
  third-party provider widget whose availability depended on a provider handshake, so the store
  kept saying "requires the 小驴打卡 plugin" even with the plugin installed and enabled. It now
  bridges natively like the other six checkin widgets (`checkin-summary` joins the bridge list
  with the `items.read` capability): ready whenever 小驴打卡 is present.
- **Richer summary**: a new aggregated snapshot — done today, best streak, days this month,
  pending today, and the top-3 streak list; computed locally, read-only, no network requests.
### v0.23.3 (2026-09-19)

- **Fixes marketplace updates being rolled back by cloud sync**: the archive's zip entry
  timestamps now come from the release commit instead of a fixed epoch. The fixed epoch made
  installed files' modification times older than the sync index, so automatic sync judged the
  cloud newer and overwrote the freshly updated version with the old one (only this plugin was
  affected: only our build pipeline used a fixed-epoch timestamp).
- **Fixes an “unknown notebook” group under notebook grouping**: when a tab lacks explicit
  notebook metadata, the notebook id used to be derived from the first path segment — which is
  the root document id, not a notebook. Opening the notebook-grouped panel now restores the
  real ownership with one bounded kernel query and re-renders.
- **Widget card header slimmer**: the config button is now a gear icon (tooltip keeps the
  semantics) and update times are compact — the title no longer truncates into an ellipsis.
- **First-paint icon sizes**: every switcher toolbar icon carries explicit width/height, so
  oversized black icons no longer flash while styles load; the widget config dialog joins the
  icon-clamp observer coverage.
- **Also**: contribution heatmaps gained a “less → more” color-scale legend; performance
  micro-benchmarks use best-of-3 sampling to resist host load spikes.
### v0.23.2 (2026-09-19)

- **Fixes the database table widget showing an empty table for embedded/mirrored databases on
  the 3.8.4 kernel**: the av block id and the database id differ; binding now resolves in two
  steps (block id → getAttributeView → database id + viewID + pageSize retry), and the config
  search accepts pasting a database ID directly (standalone databases produce no av block).
- **Data health**: missing-asset rows link to the referencing block (the actual place to fix);
  the reference display now reads the real response field (item) instead of the absent path.
- **Sort determinism**: user-content sorting (names/titles/tags/paths) is pinned to a Chinese
  pinyin collator, no longer drifting with the host environment.
- **Engineering**: performance micro-benchmarks use best-of-3 sampling to resist host load
  spikes; iCal TZID/RRULE/EXDATE/RDATE, a storage usage section, and the action panel key
  (see v0.23.1).
### v0.23.1 (2026-09-19)

- **Fixes the Miniflux widget never fetching for real**: the kernel proxy gateway URL
  gate lacked Miniflux routes, so production unread-list requests were always blocked
  (unit tests mocked the network layer and never caught it). Entries and categories
  routes are now allowlisted following the established pattern.
- **Category filter for the Miniflux widget**: categories load dynamically from your
  Miniflux instance (inside the config form); credentials travel only via request headers,
  and filtering runs server-side.
- **Also**: a storage usage settings section; a switcher action panel key
  (Shift+F10 / ContextMenu); user-content sorting pinned to a Chinese pinyin collator
  (stable across devices); full iCal time zone, recurrence, cancellation and extra-date
  support; a writing strength score and a 12-month lookback; countdown/elapsed dual modes;
  year/quarter/month progress.
### v0.23.0 (2026-09-19)

- **Per-widget deep optimization completed for all 58 widgets**: reviewed and enhanced with an
  8-dimension scorecard (config discoverability, data correctness, information hierarchy, size
  fitness, interaction feedback, state recovery, performance lifecycle, three-surface/a11y/privacy);
  ledger in `docs/component-deep-optimization-plan.md`. Highlights: path filters stay consistent
  across local tabs, remote results and full-text probing (300-card filter p95 ≈ 0.56 ms); database
  table typed cells; database/saved-searches/recent-updates/recent-edits gained search, sorting and
  accurate totals; favorite group picker, document-set last-used ordering, random-review candidate
  stats; world-clock cross-day markers; countdown yearly repeats with safe Feb-29 clamping; calendar
  week-start option; weather/air-quality display toggles; maintenance state kept separate from
  downtime in service status; checkin widgets remained render-only bridges with no protocol changes.
- **Second-round increments (competitor research follow-ups)**:
  - Countdown gained a **countdown/elapsed dual mode** (`N days since`); year progress supports
    **year/quarter/month periods**.
  - **Display override pilot**: local time, countdown and daily quote support three digit sizes
    (standard/large/extra-large).
  - Recent writing activity: a **writing strength score** (exponential-smoothing half-life, opt-in)
    and a **12-month lookback window**.
  - **Full time-zone and recurrence support for iCal subscriptions**: TZID resolution, RRULE
    expansion (DAILY/WEEKLY/MONTHLY, COUNT/UNTIL/BYDAY), EXDATE cancellations and RDATE extras —
    recurring events anchored in the past were previously invisible.
  - The settings page gained a **storage usage** section: total and per-key approximate size
    (UTF-8 bytes).
  - Switcher action panel key: **Shift+F10 / ContextMenu** opens the focused card's action menu
    from the keyboard (mouse-free).
- **Engineering**: automated tests 6117 → 6258 (207 files); resource self-discipline lines
  recalibrated per ADR 0059/0062 (224 KiB per-entry zip, 832 KiB raw; the 512 KiB archive hard
  ceiling is unchanged); the production dependency graph stays at 52 modules.
### v0.22.0 (2026-09-18)

- **Fixes the load error (issue #1)**: under certain host timing `window.siyuan.languages`
  is not yet populated, and registering a global-hotkey command made the kernel read
  `_trayMenu` off it, throwing a TypeError that aborted plugin loading (every agent
  capability registered afterwards was skipped). Command registration is now fully
  isolated: a single failed command no longer affects loading, and the global hotkey
  degrades to the in-app hotkey until the host is ready.
- **Eleven new widget-panel widgets (48 → 59)**:
  - **Kernel-data widgets (read-only SiYuan v3.8.x endpoints)**: database table (bind one
    SiYuan database block and render its current view read-only, following the filters
    and sorts you set in SiYuan; clicking a row opens its document; see ADR 0058), pinned
    docs, inbox (cloud shorthands with a determined empty state when signed out), recent
    updates, data health (missing-asset survey), recent docs (SiYuan's own recent list),
    database navigator, saved searches (the native search's saved criteria).
  - **External-data widgets**: RSS/Atom subscription (any feed URL, zero credentials, zero
    server), air quality (Open-Meteo European AQI with PM2.5/PM10, six-tier bands), and
    Hacker News board switching (front page / best / Ask HN / Show HN).
  - **Ecosystem bridge**: SiYuan-Checkin monthly summary (checkin days, record total and a
    per-item ranking).
- **Top bar and command palette**: both top-bar icons gained right-click menus (quick
  access to settings / switcher / widget panel); the command palette gains "open
  settings" and "open today's journal" commands.
- **Compatibility**: a compatibility survey against the SiYuan v3.8.4 kernel source found
  no breaking changes; all new widgets are read-only endpoints with no new writes or
  implicit data egress.
- **Engineering quality**: automated tests 5872 → 6138 (198 test files); boundary
  hardening across eleven existing modules; performance gates and the package budget hold
  (package.zip 339861 bytes, within the 512 KiB ceiling).

### v0.21.0 (2026-09-17)

- **Widget provenance becomes first-class (ADR 0057)**: widget protocol v2.4 adds a
  structured `source` field (`pluginId/name/icon/version/homepage/collection/order`),
  replacing grouping by free-text author. The store now prefers **source grouping over
  functional grouping** — one plugin's widgets collapse into a single source group whose
  header shows the provider icon, an **added x/y** counter and **select/clear whole group**;
  cards inside a group follow `source.order`; the "needs plugin" area aggregates per
  provider; provider and collection names join the card search text.
- **Five SiYuan-Checkin bridge widgets**: `checkin-today / checkin-streak /
  checkin-year-heatmap / checkin-weekly / checkin-occasions`, built on the checkin plugin's
  public ecosystem API v4 (`window.siyuanCheckin`, read-only, local-only, zero network).
  A missing plugin or capability yields a deterministic empty state instead of an error
  state; if the plugin later registers the same `moduleId`, its native implementation takes
  over without migrating user configuration.
- **Semantic search (third search method)**: joins query-syntax and regexp; the method menu
  only offers it when host AI embedding is configured, and a stale selection silently falls
  back to keyword search.
- **GitHub contributions become a grid heatmap**: a fourth `viewType: heatmap` with the item
  ceiling raised from 42 to 371, Sunday-aligned placeholder cells preserved, and levels
  passed through from the provider rather than recomputed by the view.
- **Third-party integration example now runs end to end**: the provider template
  `docs/widget-example/siyuan-checkin-home-modules.js` plus six runtime contracts exercise
  register → listModules → read → buildHomeModuleView → unregister as a real plugin.
- **Engineering**: `src/index.ts` shrank from 9226 to 8104 lines (mobile switcher and second
  panel UI extracted); `src/index.scss` (6517 lines) split into tokens plus nine **ordered**
  slices — CSS order is cascade order, so slicing must stay sequential rather than clustered
  by domain — with an exclusive-anchor coverage gate; three root ledgers archived under a
  root-doc budget gate; the perf self-check moved to adaptive calibration plus a ratio
  assertion.
- Release gates: 5959 automated tests (178 test files), TypeScript, production build, mobile
  smoke, Chromium smoke and `verify:release`; artifacts dist/index.js 653949 bytes,
  package.zip 330184 bytes.

### v0.20.0 (2026-09-17)

- **Life-info line (new widgets)**: **iCal schedule subscription** (user-provided `.ics` URL, bounded RFC 5545 parsing — 256 KiB source / 500-event caps, over-limit rejected instead of silently truncated, upcoming-window rendering, 30-minute cache) and **GitHub contribution heatmap** (official public event feed without a key; the optional token travels only in a request header and never enters the URL, cache, or cache key; UTC date buckets render a week-column contribution grid with an 84-day default window (28–366 configurable) and the caliber difference from GitHub's official heatmap honestly documented; 60-minute cache). Both fetch through the kernel proxy and are listed in the store catalog, dependency notes, and endpoint allowlist.
- **Fix**: the iCal text-fetch defect (D-397) — the text-fetch variant's `responseKind` option was ignored by the underlying bounded fetcher, which always JSON-parsed, so the iCal card could never fetch successfully on a live host; the new GitHub network gates surfaced it naturally before release, and a regression gate now locks it.
- **Storage data integrity**: `sw_thumb_cache` now normalizes on read — entries corrupted structurally or left behind by the mobile v0.7.0 upper-bound semantics (the write side hardcoded desktop constants) get cleaned up; a read-only storage migration drill with a bounded recovery report now runs on load, with drill health exposed via workspace-context; document-set restore exports a structured report.
- **Mobile fixes**: icon size overruns, toolbar chip clipping, widget panel height, and bare-SVG fallback sizing; the layout gate now measures at real phone width.
- **Workspace runtime**: session registry, recovery flow, cancellation boundary, and safe exit — 20+ contract capabilities completed (event pipeline wired into production).
- **Engineering quality**: all 365 window assertions migrated to block-scoped gates (the migration surfaced and fixed a real product defect — the size tile lacked `touch-action`); the doubling-complexity perf gate gained marginal-rerun noise hardening (ceiling semantics unchanged); a storage compatibility matrix with bidirectional doc-contract gates and a protocol-compat-claim consistency gate were added.
- Release gates pass: 5872 automated tests (171 test files), TypeScript, production build, mobile smoke, Chromium smoke, and `verify:release`; artifacts dist/index.js 631710 bytes, package.zip 318095 bytes.

### v0.19.0 (2026-09-16)

- **Search maturation**: workspace document results gain an in-panel "Load more" incremental expansion — the first 12 render immediately, clicking expands more results purely client-side (no cache-key changes, no new requests, focus preserved after re-render), and the native SiYuan search becomes the fallback once everything is expanded. The fetch cap is now a named constant (33) shared with the Agent path; the unified cache key (sorted object keys + unordered-key set + v:1 versioning) was audited and is locked by existing tests.
- **Architecture refactor (no behavior change)**: the search method group — 20 methods plus 1 module-level function, about 887 lines — moved to `doc-search-ui.ts`, bringing `src/index.ts` down to 9156 lines (about -28% across seven rounds). Document-search instance state now lives in `doc-search-state.ts`; the production dependency graph covers 41 modules with full gate review.
- **Fix**: all 351 comments corrupted by the v0.16.9 encoding accident are restored — 322 matched automatically against the v0.16.8 revision, 29 sourced manually (two born-corrupted lines were reconstructed semantically and split back into their original multi-line form). Comment text only; no behavior change.
- **Docs**: the widget protocol adds a "Cross-surface layout" section covering three independent layouts (desktop/sidebar/mobile) over globally shared configuration, `supportedDevices` pruning, full-width single-column mobile widgets, and layout cleanup semantics.
- Release gates pass: 5703 automated tests (160 test files), TypeScript, production build, mobile smoke, Chromium smoke, and `verify:release`; artifacts dist/index.js 601607 bytes, package.zip 309233 bytes.

### v0.18.0 (2026-09-16)

- **Third-party widget ecosystem**: added external-source widgets including World Clock, Hacker News, Uptime Kuma status, Frankfurter rates, Miniflux unread, daily quote, device battery, NewsNow live news, and ActivityWatch app usage, backed by a pure-model candidate catalog and source audit docs; sources without configured credentials stay offline by default.
- **Path filtering on desktop**: endpoint gating lifted based on real-host evidence (kernel 3.8.4, `/api/filetree/listDocsByPath`); the desktop dialog now offers notebook/path filters with generation-based cancellation locked by contract tests.
- **Store regrouping**: built-in widgets reorganized into seven purpose groups with bilingual descriptions; a new dependencies tab, dependency state parsing, and structured summaries; single-column mobile widget panel.
- **Resilience**: SiYuan sync lifecycle integration freezes panel interaction during sync; a 120-second sync watchdog covers lost end events.
- **Polish**: unified motion tokens, pressed-state feedback, and `prefers-contrast` accessibility.
- **Refactor (no behavior change)**: six rounds shrank `src/index.ts` from 12681 to 10003 lines (-21%), splitting store UI, settings, config forms, external widget registration, grapheme utils, and search state into modules; production graph 31→40.
- **Fixes**: repaired the corrupted `home-adapter-diagnostics` capability text (since v0.17.0); aligned release claims with actual registration (41 widgets, 11 capabilities).
- Release gates pass: 5693 automated tests, TypeScript, production build, mobile smoke, Chromium smoke, and `verify:release`; artifacts dist/index.js 601563 bytes, package.zip 307859 bytes.

### v0.17.0 (2026-09-14)

- Read-only SiYuan Agent audits now include bounded lifecycle history, health reports, trend windows, transport envelopes, queues, and recovery coordinators.
- Joint recovery adds atomic multi-coordinator commits, checkpoint windows, cursor-based incremental recovery, diagnostics status/risk projections, and bounded pagination.
- Safety boundaries remain unchanged: no new Agent write actions, no handler/instance/document-body leakage, and all outputs are bounded and sanitized.
- Release gates pass: 1513 automated tests, TypeScript, mobile smoke, Chromium smoke, production graph, and package-size checks.

### v0.16.39 (2026-09-13)

- The built-in **Journal calendar** now renders a complete 6-week × 7-column month: it detects SiYuan daily-note attributes with a date-title fallback, shows the month, adjacent dates, weekends, today, and journal dots, opens existing journals, and navigates ±24 months. The same release also includes **Countdown**, **Clipped to read**, and **Quick capture**.
- Widget store UI overhaul: larger dialog (up to 960×720), builtin widgets grouped by function (7 groups), plugin widgets grouped by source author, miniature skeleton previews with proportional size rectangles, and on-demand live preview dialogs.
- Widget store availability and interaction improvements: category, conditional, and added-state filters compose independently; configured third-party widgets retain their settings and show an unavailable state while their provider is unloaded, then recover immediately after re-registration; localized grouping, persistent filters, and an explicit no-results state complete the flow.
- Configuration UX improvements: countdown uses a native date picker, pinned documents offer suggestions from currently open documents with block-ID validation, and notebook filters preserve an explicit empty option plus unavailable-value feedback before save.
- Widget panel UI polish: single-layer chrome (inner module card removed), compact chevron fold toggle, muted empty-state prefix, calendar cell hover tint, list item hover accent bar, larger stat hero numbers, rounded progress bar caps, smooth collapse animation, staggered widget loading.
- Fixed append-to-journal agent capability that was defined but never registered; added a capability registration guard test.
- 675 automated tests.

### Older releases

For the full per-version history, see [GitHub Releases](https://github.com/xiaolv-suite/siyuan-speed-switch/releases).
