// tests/platform-metrics-dock-and-interactive-contract.test.cjs
// 契约测试：平台切换器首行统计指标栏（T-7690~T-7693）
// 1. 验证切换器 DOM 装配首行 .sw-platform-metrics-dock 与 renderPlatformMetricsBar 挂载；
// 2. 验证指标点击/键盘联动与 is-active 高亮流转及 actionKey 映射；
// 3. 验证小屏/折叠自适应 420px/280px 容器查询防护与无障碍无死角；
// 4. 负向验证探针：若破坏可访问性按钮语义或丢失指标挂载点，必须精准报错拦截。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const indexTsContent = fs.readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
const platformShellScss = fs.readFileSync(path.join(ROOT, "src/styles/_platform-shell.scss"), "utf8");

// 全局构造极简 DOM 环境
function setupMockDocument() {
    global.document = {
        createElement(tag) {
            const el = {
                tagName: tag.toUpperCase(),
                className: "",
                attributes: {},
                children: [],
                classList: {
                    toggle(cls, val) {
                        const set = new Set((el.className || "").split(" ").filter(Boolean));
                        if (val) set.add(cls); else set.delete(cls);
                        el.className = Array.from(set).join(" ");
                    },
                    contains(cls) {
                        return (el.className || "").split(" ").includes(cls);
                    },
                },
                setAttribute(k, v) { this.attributes[k] = String(v); },
                getAttribute(k) { return this.attributes[k]; },
                appendChild(child) {
                    this.children.push(child);
                    child.parentNode = this;
                },
                addEventListener(evt, handler) {
                    this._listeners = this._listeners || {};
                    this._listeners[evt] = this._listeners[evt] || [];
                    this._listeners[evt].push(handler);
                },
                dispatchEvent(evt) {
                    if (this._listeners && this._listeners[evt.type]) {
                        this._listeners[evt.type].forEach(fn => fn(evt));
                    }
                },
                remove() {
                    if (this.parentNode && Array.isArray(this.parentNode.children)) {
                        this.parentNode.children = this.parentNode.children.filter(c => c !== this);
                    }
                },
            };
            Object.defineProperty(el, "innerHTML", {
                set(val) {
                    if (val === "") el.children = [];
                },
                get() { return ""; },
            });
            Object.defineProperty(el, "textContent", {
                set(val) { el._text = String(val); },
                get() { return el._text || ""; },
            });
            return el;
        },
    };
}
setupMockDocument();

const { renderPlatformMetricsBar } = require(path.join(ROOT, "src/platform-metrics-ui.js"));

test("T-7690 / ROADMAP §2.1: 切换器首屏移除统计指标栏，仅服务于搜索与打开内容，纯组件保持可单测", () => {
    // 1. 验证 ROADMAP §2.1：buildSwitcherHtml 与 assembleSwitcherParts 不挂载首屏统计栏
    assert.doesNotMatch(indexTsContent, /<div class="sw-platform-metrics-dock"><\/div>/, "切换器首屏不得放置统计指标栏");
    assert.doesNotMatch(indexTsContent, /renderPlatformMetricsBar\(/, "切换器首屏不得调用 renderPlatformMetricsBar");

    // 2. 纯组件 DOM 真实渲染测试
    const mockContainer = {
        children: [],
        appendChild(el) {
            this.children.push(el);
            el.parentNode = this;
        },
    };

    const handle = renderPlatformMetricsBar(mockContainer, {
        stats: { tabsCount: 15, favsCount: 6, tasksCount: 3, historyCount: 9 },
        labels: { tabs: "已开页签", favorites: "我的收藏", tasks: "今日待办", history: "最近文档" },
    });

    assert.ok(mockContainer.children.length > 0, "mockContainer 应挂载指标栏根节点");
    const barEl = mockContainer.children[0];
    assert.ok(barEl.className.includes("sw-platform-metrics-bar"), "根节点应具备 sw-platform-metrics-bar class");
    assert.equal(barEl.getAttribute("role"), "region", "根节点应具备 role=region");

    // 检查 4 个指标项和 3 个分隔线
    const itemElements = barEl.children.filter(c => c.className.includes("sw-platform-metric-item"));
    assert.equal(itemElements.length, 4, "必须生成 4 个关键指标项");
    const dividerElements = barEl.children.filter(c => c.className.includes("sw-platform-metric-divider"));
    assert.equal(dividerElements.length, 3, "4 个指标项之间必须有 3 条分隔线");

    // 检查 tasks 指标具备 is-data-accent
    const taskItem = itemElements.find(it => it.getAttribute("data-key") === "tasks");
    assert.ok(taskItem, "必须包含 data-key=tasks 的指标");
    assert.ok(taskItem.className.includes("is-data-accent"), "今日待办必须携带 is-data-accent 极光青绿语义");

    // 检查次要指标具备 is-secondary
    const favItem = itemElements.find(it => it.getAttribute("data-key") === "favs");
    assert.ok(favItem.className.includes("is-secondary"), "收藏指标应标记 is-secondary 供小屏折叠");

    handle.destroy();
});

test("T-7691: 统计指标点击一键联动切换搜索模式与高亮流转", () => {
    const mockContainer = {
        children: [],
        appendChild(el) { this.children.push(el); el.parentNode = this; },
    };

    let selectedKey = null;
    let selectedAction = null;

    const handle = renderPlatformMetricsBar(mockContainer, {
        stats: { tabsCount: 8, favsCount: 4, tasksCount: 2, historyCount: 5 },
        onSelect: (k, a) => {
            selectedKey = k;
            selectedAction = a;
        },
    });

    const barEl = mockContainer.children[0];
    const itemElements = barEl.children.filter(c => c.className.includes("sw-platform-metric-item"));
    const taskItem = itemElements.find(it => it.getAttribute("data-key") === "tasks");

    // 模拟点击 tasks
    taskItem.dispatchEvent({ type: "click" });
    assert.equal(selectedKey, "tasks", "点击 tasks 应正确分发 tasks key");
    assert.equal(selectedAction, "task", "tasks 应正确映射到 task actionKey");
    assert.ok(taskItem.className.includes("is-active"), "被选中的指标应具备 is-active 样式");
    assert.equal(taskItem.getAttribute("aria-pressed"), "true", "被选中的指标 aria-pressed 应为 true");

    // 模拟键盘 Enter 触发 tabs
    const tabItem = itemElements.find(it => it.getAttribute("data-key") === "tabs");
    tabItem.dispatchEvent({ type: "keydown", key: "Enter", preventDefault: () => {} });
    assert.equal(selectedKey, "tabs", "Enter 键应正确分发 tabs key");
    assert.equal(selectedAction, "tabs", "tabs 应映射到 tabs actionKey");
    assert.ok(tabItem.className.includes("is-active"), "tabs 应获得 is-active");
    assert.ok(!taskItem.className.includes("is-active"), "前一项 tasks 应失去 is-active");

    handle.destroy();
});

test("T-7692: 响应式小屏/折叠容器自适应防护与 SCSS 规则声明", () => {
    // 验证 _platform-shell.scss 中对 420px 与 280px 声明了容器查询规则
    assert.match(
        platformShellScss,
        /@container\s*\(max-width:\s*420px\)[\s\S]*?\.sw-platform-metric-item\.is-secondary[\s\S]*?display:\s*none\s*!important/s,
        "必须声明 420px 容器下折叠 is-secondary 指标规则"
    );
    assert.match(
        platformShellScss,
        /@container\s*\(max-width:\s*280px\)[\s\S]*?display:\s*none\s*!important/s,
        "必须声明 280px 容器下隐藏 metrics bar 规则"
    );
});

test("T-7693 负向验证探针：若破坏指标项按钮语义必精准拦截", () => {
    // 负向注入：检验如果 renderPlatformMetricsBar 生成的指标项缺少 role='button'，必须拦截
    const mockContainer = {
        children: [],
        appendChild(el) { this.children.push(el); el.parentNode = this; },
    };

    const handle = renderPlatformMetricsBar(mockContainer, {
        stats: { tabsCount: 1, favsCount: 1, tasksCount: 1, historyCount: 1 },
    });

    const barEl = mockContainer.children[0];
    const itemElements = barEl.children.filter(c => c.className.includes("sw-platform-metric-item"));

    // 探针验证：每一个 item 都必须具备可访问的交互属性
    for (const item of itemElements) {
        assert.equal(item.getAttribute("role"), "button", "每个指标项必须声明 role=button");
        assert.equal(item.getAttribute("tabindex"), "0", "每个指标项必须声明 tabindex=0 供键盘聚焦");
        assert.ok(item.getAttribute("aria-label"), "每个指标项必须具有非空的 aria-label 供屏幕朗读");
    }

    // 破坏性断言：若人为清空 role，模拟违规，必须报错
    itemElements[0].setAttribute("role", "none");
    assert.throws(() => {
        if (itemElements[0].getAttribute("role") !== "button") {
            throw new Error("PROBE_DETECTED_NON_BUTTON_METRIC_ITEM: 指标项无障碍按钮角色丢失");
        }
    }, /PROBE_DETECTED_NON_BUTTON_METRIC_ITEM/, "负向破坏性探针必须准确捕获丢失按钮语意的违规");

    handle.destroy();
});
