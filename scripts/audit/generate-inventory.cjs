/**
 * scripts/audit/generate-inventory.cjs
 * 全量资产与交互元素清单生成器 (Inventory Generator)
 * 严格按照代码事实生成覆盖 9 大类别的可量化资产清单，输出至 docs/audit/full-element-inventory.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audit', 'full-element-inventory.md');

// 统一收集清单数组
const inventory = [];
let counter = 1;

function addElement({ domain, location, selector, type, name, action, defaultState, riskLevel = 'L' }) {
    const id = `INV-${String(counter).padStart(4, '0')}`;
    counter++;
    inventory.push({
        id,
        domain,
        location,
        selector,
        type,
        name,
        action,
        defaultState,
        riskLevel
    });
}

// ==================== 1. 页面与主面板 (Pages & Panels) ====================
addElement({
    domain: '宿主全局与外壳',
    location: 'src/index.ts:4350-4600',
    selector: '.sw-dialog, .sw-shell',
    type: '页面与面板',
    name: '平台统一外壳容器 (Platform Unified Shell)',
    action: '提供多表面切换、顶栏标题、面包屑、快捷键提示与全局关闭',
    defaultState: '根据配置默认呼出 switcher 表面',
    riskLevel: 'H'
});
addElement({
    domain: '第一面板',
    location: 'src/doc-search-ui.ts:1-200, src/index.ts:4350',
    selector: '.sw-switcher-view, .sw-search-panel',
    type: '页面与面板',
    name: '桌面端切换器主面板 (Desktop Switcher Panel)',
    action: '展示已打开页签、搜索框、8模态穿透药丸、过滤分组及右侧阅读预览',
    defaultState: '显示最近活跃页签或最近关闭记录',
    riskLevel: 'H'
});
addElement({
    domain: '第一面板',
    location: 'src/mobile-switcher-ui.ts:1-400, src/index.ts:14765',
    selector: '.sw-mobile-switcher',
    type: '页面与面板',
    name: '移动端切换器视图 (Mobile Switcher View)',
    action: '移动端大卡片网格、滑动关闭、单手底部触控栏、全域穿透搜索',
    defaultState: '竖屏自适应瀑布流',
    riskLevel: 'H'
});
addElement({
    domain: '第二面板',
    location: 'src/second-panel-ui.ts:1-500, src/home-view.js:1-200',
    selector: '.sw-second-panel, .sw__home-view',
    type: '页面与面板',
    name: '工作台主面板 (Workbench Panel)',
    action: '自适应网格展示 58+ 款小组件、布局编辑横幅、实时刷新与场景预设',
    defaultState: '根据用户保存的 homeState 布局渲染',
    riskLevel: 'H'
});
addElement({
    domain: '第三面板',
    location: 'src/snippet-studio-ui.js:1-600, src/index.ts:4449',
    selector: '.sw-snippet-studio, .sw-studio',
    type: '页面与面板',
    name: '代码片段实验室 (Snippet Studio)',
    action: '左侧目录树、中间代码编辑器、右侧双栏沙箱实时预览与 Diff 审查',
    defaultState: '激活首个片段或内置商店',
    riskLevel: 'H'
});
addElement({
    domain: '宿主全局与外壳',
    location: 'src/index.ts:1827-1870',
    selector: '.sw-dock-panel',
    type: '页面与面板',
    name: '桌面端侧边栏 Dock 面板 (Desktop Sidebar Dock Panel)',
    action: '嵌入思源侧边栏，作为常驻切换与导航抽屉',
    defaultState: '随思源 Dock 折叠/展开',
    riskLevel: 'M'
});
addElement({
    domain: '设置中心',
    location: 'src/index.ts:3573-3630, src/settings-sections.ts',
    selector: '.sw-settings-dialog, .b3-dialog--open',
    type: '页面与面板',
    name: '插件设置中心 (Settings Modal Platform)',
    action: '包含 10 个设置标签页、全局搜索框、差异对比与撤销回执',
    defaultState: '默认进入通用/外观页',
    riskLevel: 'H'
});

// ==================== 2. 弹窗与抽屉 (Dialogs & Drawers) ====================
addElement({
    domain: '宿主全局与外壳',
    location: 'src/index.ts:3062-3075',
    selector: '.sw-platform-guide',
    type: '弹窗与抽屉',
    name: '平台快速开始指南弹窗 (Platform Guide Dialog)',
    action: '展示离线功能指引与操作帮助，点击关闭或 Esc 退出',
    defaultState: '初次使用可随时点击唤醒',
    riskLevel: 'L'
});
addElement({
    domain: '第一面板',
    location: 'src/index.ts:11935-11980',
    selector: '.sw-group-dialog',
    type: '弹窗与抽屉',
    name: '页签分组管理弹窗 (Tab Group Dialog)',
    action: '编辑当前页签分组名称、关联颜色、移动分组',
    defaultState: '显示当前页签所在分组',
    riskLevel: 'M'
});
addElement({
    domain: '第一面板',
    location: 'src/index.ts:11992-12050',
    selector: '.sw-favorite-group-dialog',
    type: '弹窗与抽屉',
    name: '收藏分组管理弹窗 (Favorite Group Dialog)',
    action: '管理收藏项所属分组、修改分组标签、新建分组',
    defaultState: '展示所有可用收藏分组',
    riskLevel: 'M'
});
addElement({
    domain: '第一面板',
    location: 'src/action-palette-ui.js:1-120',
    selector: '.sw-action-palette-drawer',
    type: '弹窗与抽屉',
    name: '次级动作画板抽屉 (Action Palette Drawer)',
    action: '按 Tab 或悬停呼出，提供 23 项深度操作动作',
    defaultState: '隐藏，触发时弹出',
    riskLevel: 'M'
});
addElement({
    domain: '第一面板',
    location: 'src/index.ts:7479-7510',
    selector: '.sw-host-list-dialog',
    type: '弹窗与抽屉',
    name: '文档集合项列表弹窗 (Document Set Host List Dialog)',
    action: '查看特定标签或文档集下的所有条目并支持单项打开',
    defaultState: '列表渲染',
    riskLevel: 'M'
});
addElement({
    domain: '第二面板',
    location: 'src/home-store-ui.ts:1-250',
    selector: '.sw-home-store-dialog',
    type: '弹窗与抽屉',
    name: '小组件商店弹窗 (Workbench Widget Store Modal)',
    action: '浏览、筛选、搜索、批量添加/移除 58+ 款组件，支持内联预览',
    defaultState: '全部组件网格',
    riskLevel: 'H'
});
addElement({
    domain: '第二面板',
    location: 'src/home-store-ui.ts:1500-1650',
    selector: '.sw-home-store-preview-dialog',
    type: '弹窗与抽屉',
    name: '小组件独立全尺寸预览弹窗 (Widget Standalone Preview Dialog)',
    action: '以大窗口真实渲染特定小组件，实时观察不同尺寸效果',
    defaultState: '默认尺寸渲染',
    riskLevel: 'M'
});
addElement({
    domain: '第二面板',
    location: 'src/index.ts:2969-2990',
    selector: '.sw-home-store-guide',
    type: '弹窗与抽屉',
    name: '组件前置依赖与生态指南弹窗 (Widget Ecosystem Guide Dialog)',
    action: '展示外部插件（如小驴打卡、小驴人脉等）安装指引与本地桥接配置',
    defaultState: '说明文本与跳转链接',
    riskLevel: 'M'
});
addElement({
    domain: '第二面板',
    location: 'src/home-config-form.ts:1-400',
    selector: '.sw-home-config-dialog',
    type: '弹窗与抽屉',
    name: '小组件自定义配置弹窗 (Widget Config Form Dialog)',
    action: '动态渲染组件的 configSchema 表单字段，支持参数保存与重置',
    defaultState: '填充当前组件参数',
    riskLevel: 'H'
});
addElement({
    domain: '第二面板',
    location: 'src/second-panel-ui.ts:1200-1250',
    selector: '.sw-workbench-clear-confirm',
    type: '弹窗与抽屉',
    name: '清空工作台二次确认弹窗 (Workbench Clear Confirm Dialog)',
    action: '提示用户清空所有组件风险，支持确认清空或取消',
    defaultState: '高亮取消按钮',
    riskLevel: 'H'
});
addElement({
    domain: '第三面板',
    location: 'src/index.ts:6114-6140, src/snippet-stack-ui.js:1-200',
    selector: '.sw-snippet-stack-dialog-host',
    type: '弹窗与抽屉',
    name: '连续切片暂存栈抽屉/弹窗 (TextFold Slice Stack Drawer)',
    action: '查看所有暂存代码切片，支持一键写回文档、清空或复制',
    defaultState: '展示切片条目列表',
    riskLevel: 'H'
});
addElement({
    domain: '第三面板',
    location: 'src/snippet-studio-ui.js:1800-1920',
    selector: '.sw-snippet-import-dialog',
    type: '弹窗与抽屉',
    name: '片段导入选择弹窗 (Snippet Import Modal)',
    action: '支持从本地文件、剪贴板、Gist 链接解析并选择性导入片段',
    defaultState: '选择导入来源',
    riskLevel: 'H'
});
addElement({
    domain: '第三面板',
    location: 'src/snippet-studio-ui.js:1450-1520',
    selector: '.sw-snippet-conflict-dialog',
    type: '弹窗与抽屉',
    name: '片段重名/保存冲突解决弹窗 (Snippet Conflict Dialog)',
    action: '对比本地与目标片段差异，提供“覆盖”、“保留两者”、“放弃”选项',
    defaultState: '差异高亮展示',
    riskLevel: 'H'
});
addElement({
    domain: '第三面板',
    location: 'src/snippet-studio-ui.js:2000-2080',
    selector: '.sw-snippet-gist-recovery',
    type: '弹窗与抽屉',
    name: 'Gist 备份与版本恢复弹窗 (Snippet Gist Recovery Dialog)',
    action: '从 Gist 历史拉取并差异对比片段快照，一键恢复',
    defaultState: '展示 Gist 版本列表',
    riskLevel: 'M'
});
addElement({
    domain: '第三面板',
    location: 'src/snippet-studio-ui.js:2100-2160',
    selector: '.sw-snippet-leave-dialog',
    type: '弹窗与抽屉',
    name: '片段未保存离开提示弹窗 (Snippet Unsaved Leave Dialog)',
    action: '检测未保存更改，提示用户“保存后离开”、“放弃更改”、“取消”',
    defaultState: '默认焦点在保存',
    riskLevel: 'H'
});
addElement({
    domain: '全局悬浮球',
    location: 'src/floating-ball-panel.js:250-400',
    selector: '.sw-fab-more-drawer',
    type: '弹窗与抽屉',
    name: '悬浮球更多动作抽屉 (Floating Ball More Actions Drawer)',
    action: '呼出 25 项快捷动作完整列表，支持搜索、数字键 1-9 触发与右键固定',
    defaultState: '展示未固定至首层的动作列表',
    riskLevel: 'M'
});
addElement({
    domain: '全局悬浮球',
    location: 'src/index.ts:3131-3160',
    selector: '.sw-quick-capture',
    type: '弹窗与抽屉',
    name: 'Flomo 式快速捕获弹窗 (Quick Capture Dialog)',
    action: '多行文
