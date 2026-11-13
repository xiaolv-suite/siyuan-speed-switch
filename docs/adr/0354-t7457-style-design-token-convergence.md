# ADR 0354：T-7457 样式设计体系与刻度规范严格收口（动效时长、控件高度与间距 Token 收敛）

## 背景与动机

在小驴雷切高质量工程演进中，视觉动效、控件高度与间距体系建立了严格的 Token 化刻度门禁：
1. **动效时长**：所有过渡时长必须收敛于 `$sw-dur-*`（如 `$sw-dur-fast`、`$sw-dur-base`）与 `$sw-ease` 刻度，严禁硬编码字面量秒数；
2. **控件高度**：所有输入框与胶囊必须引用 `--sw-control-h`、`--sw-control-h-md`、`--sw-control-h-sm` 等标准高度变量，禁止裸写 `26px`；
3. **间距体系**：内边距、外边距与网格间距必须引用 `--sw-space-*` 变量，禁止裸写 `6px` 等字面量。

在前期微质感优化中，`_11-ui-polish.scss` 与 `_05-settings-widgets.scss` 引入了个别字面量属性声明（`0.16s ease`、`min-height: 26px`、`padding: 1px 6px`），触发了四个专项门禁的精准拦截。必须对这些设计违规彻底收敛与清洗。

## 架构决策与实现

1. **动效时长与缓动规范收敛**：
   在 `src/styles/_11-ui-polish.scss` 中，将 `.sw__home-module-item-action` 的过渡属性从字面量 `0.16s ease` 替换为标准 Sass 动效变量：
   ```scss
   transition: transform $sw-dur-fast $sw-ease, background $sw-dur-fast $sw-ease;
   ```
2. **控件高度刻度收敛**：
   在 `src/styles/_11-ui-polish.scss` 中，将 `.sw__empty-syntax-chip` 的最小高度从硬编码 `26px` 替换为高度刻度 Token：
   ```scss
   min-height: var(--sw-control-h-md, 26px);
   padding: var(--sw-space-2xs, 2px) var(--sw-space-md, 8px);
   ```
3. **间距体系 Token 收敛**：
   在 `src/styles/_05-settings-widgets.scss` 中，将关系组件与文档组件次级胶囊的内边距从 `padding: 1px 6px` 替换为：
   ```scss
   padding: 1px var(--sw-space-sm, 6px);
   ```

## 验证与证据

1. `tests/control-height-gate.test.cjs`：4/4 测试通过，控件高度无任何字面量回归；
2. `tests/motion-scale-gate.test.cjs`：5/5 测试通过，动效时长完全契合阶梯刻度；
3. `tests/spacing-token-migration.test.cjs`：3/3 测试通过，间距 Token 零违规；
4. `tests/store-motion-accessibility.test.cjs`：33/33 测试通过，包含减弱动效回退与高对比度验证。
