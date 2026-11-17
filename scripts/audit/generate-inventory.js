/**
 * scripts/audit/generate-inventory.js
 * 纯 Node 脚本：系统梳理提取全部 9 大类交互元素并生成 docs/audit/full-element-inventory.md
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_MD = path.join(ROOT, 'docs', 'audit', 'full-element-inventory.md');

const elements = [];
let idCounter = 1;

function reg(domain, location, selector, type, name, action, defaultState, riskLevel = 'L') {
    const id = 'INV-' + String(idCounter).padStart(4, '0');
    idCounter++;
    elements.push({
        id, domain, location, selector, type, name, action, defaultState, riskLevel
    });
}

// ==================== 1. 页面与主面板 (Pages & Panels) ====================
reg('宿主全局与外壳', 'src/index.ts:4350-4600', '.sw-dialog, .sw-shell', '页面与面板', '平台统一外壳容器 (Platform Unified Shell)', '提供多表面切换、顶栏标题、面包屑、快捷键提示与全局关闭', '根据配置默认呼出 switcher 表面', 'H');
reg('第一面板', 'src/doc-search-ui.ts:1-200, src/index.ts:4350', '.sw-switcher-view, .sw-search-panel', '页面与面板', '桌面端切换器主面板 (Desktop Switcher Panel)', '展示已打开页签、搜索框、8模态穿透药丸、过滤分组及右侧阅读预览', '显示最近活跃页签或最近关闭记录', 'H');
reg('第一面板', 'src/mobile-switcher-ui.ts:1-400, src/index.ts:14765', '.sw-mobile-switcher', '页面与面板', '移动端切换器视图 (Mobile Switcher View)', '移动端大卡片网格、滑动关闭、单手底部触控栏、全域穿透搜索', '竖屏自适应瀑布流', 'H');
reg('第二面板', 'src/second-panel-ui.ts:1-500, src/home-view.js:1-200', '.sw-second-panel, .sw__home-view', '页面与面板', '工作台主面板 (Workbench Panel)', '自适应网格展示 58+ 款小组件、布局编辑横幅、实时刷新与场景预设', '根据用户保存的 homeState 布局渲染', 'H');
reg('第三面板', 'src/snippet-studio-ui.js:1-600, src/index.ts:4449', '.sw-snippet-studio, .sw-studio', '页面与面板', '代码片段实验室 (Snippet Studio)', '左侧目录树、中间代码编辑器、右侧双栏沙箱实时预览与 Diff 审查', '激活首个片段或内置商店', 'H');
reg('宿主全局与外壳', 'src/index.ts:1827-1870', '.sw-dock-panel', '页面与面板', '桌面端侧边栏 Dock 面板 (Desktop Sidebar Dock Panel)', '嵌入思源侧边栏，作为常驻切换与导航抽屉', '随思源 Dock 折叠/展开', 'M');
reg('设置中心', 'src/index.ts:3573-3630, src/settings-sections.ts', '.sw-settings-dialog, .b3-dialog--open', '页面与面板', '插件设置中心 (Settings Modal Platform)', '包含 10 个设置标签页、全局搜索框、差异对比与撤销回执', '默认进入通用/外观页', 'H');

// ==================== 2. 弹窗与抽屉 (Dialogs & Drawers) ====================
reg('宿主全局与外壳', 'src/index.ts:3062-3075', '.sw-platform-guide', '弹窗与抽屉', '平台快速开始指南弹窗 (Platform Guide Dialog)', '展示离线功能指引与操作帮助，点击关闭或 Esc 退出', '初次使用可随时点击唤醒', 'L');
reg('第一面板', 'src/index.ts:11935-11980', '.sw-group-dialog', '弹窗与抽屉', '页签分组管理弹窗 (Tab Group Dialog)', '编辑当前页签分组名称、关联颜色、移动分组', '显示当前页签所在分组', 'M');
reg('第一面板', 'src/index.ts:11992-12050', '.sw-favorite-group-dialog', '弹窗与抽屉', '收藏分组管理弹窗 (Favorite Group Dialog)', '管理收藏项所属分组、修改分组标签、新建分组', '展示所有可用收藏分组', 'M');
reg('第一面板', 'src/action-palette-ui.js:1-120', '.sw-action-palette-drawer', '弹窗与抽屉', '次级动作画板抽屉 (Action Palette Drawer)', '按 Tab 或悬停呼出，提供 23 项深度操作动作', '隐藏，触发时弹出', 'M');
reg('第一面板', 'src/index.ts:7479-7510', '.sw-host-list-dialog', '弹窗与抽屉', '文档集合项列表弹窗 (Document Set Host List Dialog)', '查看特定标签或文档集下的所有条目并支持单项打开', '列表渲染', 'M');
reg('第二面板', 'src/home-store-ui.ts:1-250', '.sw-home-store-dialog', '弹窗与抽屉', '小组件商店弹窗 (Workbench Widget Store Modal)', '浏览、筛选、搜索、批量添加/移除 58+ 款组件，支持内联预览', '全部组件网格', 'H');
reg('第二面板', 'src/home-store-ui.ts:1500-1650', '.sw-home-store-preview-dialog', '弹窗与抽屉', '小组件独立全尺寸预览弹窗 (Widget Standalone Preview Dialog)', '以大窗口真实渲染特定小组件，实时观察不同尺寸效果', '默认尺寸渲染', 'M');
reg('第二面板', 'src/index.ts:2969-2990', '.sw-home-store-guide', '弹窗与抽屉', '组件前置依赖与生态指南弹窗 (Widget Ecosystem Guide Dialog)', '展示外部插件（如小驴打卡、小驴人脉等）安装指引与本地桥接配置', '说明文本与跳转链接', 'M');
reg('第二面板', 'src/home-config-form.ts:1-400', '.sw-home-config-dialog', '弹窗与抽屉', '小组件自定义配置弹窗 (Widget Config Form Dialog)', '动态渲染组件的 configSchema 表单字段，支持参数保存与重置', '填充当前组件参数', 'H');
reg('第二面板', 'src/second-panel-ui.ts:1200-1250', '.sw-workbench-clear-confirm', '弹窗与抽屉', '清空工作台二次确认弹窗 (Workbench Clear Confirm Dialog)', '提示用户清空所有组件风险，支持确认清空或取消', '高亮取消按钮', 'H');
reg('第三面板', 'src/index.ts:6114-6140, src/snippet-stack-ui.js:1-200', '.sw-snippet-stack-dialog-host', '弹窗与抽屉', '连续切片暂存栈抽屉/弹窗 (TextFold Slice Stack Drawer)', '查看所有暂存代码切片，支持一键写回文档、清空或复制', '展示切片条目列表', 'H');
reg('第三面板', 'src/snippet-studio-ui.js:1800-1920', '.sw-snippet-import-dialog', '弹窗与抽屉', '片段导入选择弹窗 (Snippet Import Modal)', '支持从本地文件、剪贴板、Gist 链接解析并选择性导入片段', '选择导入来源', 'H');
reg('第三面板', 'src/snippet-studio-ui.js:1450-1520', '.sw-snippet-conflict-dialog', '弹窗与抽屉', '片段重名/保存冲突解决弹窗 (Snippet Conflict Dialog)', '对比本地与目标片段差异，提供“覆盖”、“保留两者”、“放弃”选项', '差异高亮展示', 'H');
reg('第三面板', 'src/snippet-studio-ui.js:2000-2080', '.sw-snippet-gist-recovery', '弹窗与抽屉', 'Gist 备份与版本恢复弹窗 (Snippet Gist Recovery Dialog)', '从 Gist 历史拉取并差异对比片段快照，一键恢复', '展示 Gist 版本列表', 'M');
reg('第三面板', 'src/snippet-studio-ui.js:2100-2160', '.sw-snippet-leave-dialog', '弹窗与抽屉', '片段未保存离开提示弹窗 (Snippet Unsaved Leave Dialog)', '检测未保存更改，提示用户“保存后离开”、“放弃更改”、“取消”', '默认焦点在保存', 'H');
reg('全局悬浮球', 'src/floating-ball-panel.js:250-400', '.sw-fab-more-drawer', '弹窗与抽屉', '悬浮球更多动作抽屉 (Floating Ball More Actions Drawer)', '呼出 25 项快捷动作完整列表，支持搜索、数字键 1-9 触发与右键固定', '展示未固定至首层的动作列表', 'M');
reg('全局悬浮球', 'src/index.ts:3131-3160', '.sw-quick-capture', '弹窗与抽屉', 'Flomo 式快速捕获弹窗 (Quick Capture Dialog)', '多行文本输入，自动追加至今日日记或当前文档尾部', '光标自动聚焦输入框', 'H');
reg('全局悬浮球', 'src/index.ts:6550-6570', '.sw-template-picker', '弹窗与抽屉', '模板选择器弹窗 (Template Picker Dialog)', '展示思源模板列表，支持即搜即选，一键插入当前文档', '列表展示所有可用模板', 'H');
reg('全局悬浮球', 'src/index.ts:3473-3500', '.sw-journal-prompt', '弹窗与抽屉', '默认日记本引导选择弹窗 (Journal Notebook Prompt Dialog)', '首次使用日记功能时引导绑定日记笔记本', '下拉选择默认笔记本', 'H');
reg('设置中心', 'src/settings-sections.ts:1450-1530', '.sw-document-set-diff-dialog', '弹窗与抽屉', '文档集版本差异对比弹窗 (Document Set Diff Dialog)', '直观对比快照与当前打开页签的增删改差异，支持选择性恢复', '展示差异列表', 'H');
reg('设置中心', 'src/settings-sections.ts:1600-1680', '.sw-config-pack-diff-dialog', '弹窗与抽屉', '配置包差异对比弹窗 (Config Pack Diff Dialog)', '导入配置时比对当前配置与导入包的字段差异，防止误覆盖', '高亮变动字段', 'H');

console.log('Registered base elements:', elements.length);
