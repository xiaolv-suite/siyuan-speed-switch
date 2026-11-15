# 外部桌面命令桥（2026-11-09）

替代退休快门的最小接收面，随雷切源码启用但**默认关闭**。在思源命令面板执行“配置外部桌面命令桥”，分别选择接收、打开文档/白名单页面、打卡写入；只有用户保存后才建立连接。没有自动修改日常宿主配置。宿主必须提供 Web Locks，否则不启动接收器。

传输为已鉴权内核的 `qg-cmd` SSE 与固定文件 `/storage/petal/siyuan-speed-switch/bridge/commands.ndjson`。回执在同目录 `results.ndjson`，保留最近200行。外部调用方仍须思源内核令牌；桥不新增无鉴权网络服务器，不读取外部URL，不执行JavaScript、SQL、任意插件API或未知命令。

信封：`{v:1,id,op,args,createdAt,ttlMs}`。id为1～96位字母数字/下划线/点/短横线，createdAt含时区，TTL 1～300000ms；最多32KiB。过期/未来时间/设备路由/未知操作拒绝。相同ID不同操作或参数拒绝。原ID重复读取原回执，不换ID盲重试。

- 只读：`commands.list`（只返回准许导航命令）、`editor.context`、`navigation.context`、`checkin.items`、`checkin.summary`。
- 独立导航授权：`doc.open`（合法思源块ID）、`commands.run`（硬编码插件+导航命令白名单）。不兼容任意第三方命令，不静默扩大权限。
- 独立写授权：仅 `checkin.record`，走打卡 `recordEventsBatch`，externalRef=`raikiri:<requestId>`；供应端幂等生效。未开放 editor.insert/home.memo 等旧写操作，旧客户端收到unsupported而非假成功。

`external-bridge-policy.json`保存授权；`external-command-journal.json`保存请求ID、SHA256操作指纹、时间与回执。先持久化unknown预留再执行，存储失败不执行；执行后持久化结果失败保持unknown，禁止自动重放。24小时内至多512身份，满了拒绝接收，不挤出仍有效身份。Web Locks按同源串行化接收，卸载关闭SSE和轮询，不清空外部队列；轮询文本最多256KiB，最多读200条，不支持无界队列。

回执status：recorded（已确认）、failed/rejected/expired（明确失败）、unknown（可能执行但未确认）。客户端必须按status处理，发送成功不代表执行成功。外骨骼现有LvGetReceipt只把recorded/duplicate当成功，失败不会伪装成功。

本轮受控测试覆盖双通道同ID、重启幂等、权限/TTL/白名单、预留失败、未知结果、回执格式与卸载。真实思源SSE鉴权/目录权限、跨窗口、外骨骼端业务往返尚需隔离宿主联合验收；不以MCP tools/list通过代替执行接线证明。

## 已核实的导航命令键

打卡openCheckin/openCheckinTab；人脉openWorkbench；管家openButler；拾遗cmd.openPanel；考试command.openPractice/command.openWrongbook/command.openReport；闪卡openDashboard/openManager/startReview；常用open；雷切switchTabs/commandPalette/secondPanel。以上来自各仓langKey实际注册，公共API名openHub/openReview不等同宿主命令键。联合AST合同核实源码；旧未知command仍拒绝。

外骨骼LvGetReceipt已以JSON顶层ID和结构化data解析当前回执。实际C#类隔离编译与生产发信语句生成的envelope交由TS接收器通过；没有覆盖运行中EXE。
