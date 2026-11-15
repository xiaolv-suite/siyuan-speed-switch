# ADR 0556：有限外部命令接收与打卡权威投影

2026-11-09。修复审计ECO008与R01-04。雷切承接qg-cmd/固定NDJSON接收但不搬入快门全部功能；默认关闭，读/导航/写分别授权，固定白名单、TTL、持久身份预留和回执，未知结果不重放。新增两项本地状态见external-command-bridge.md与privacy-and-security.md。

打卡today/summary优先消费新daily.read/getDailyProjection，连击消费getStreaks；显示上限、排期、冷冻等语义由提供方裁定，禁止组件另造事实。历史事件不在日期过滤前截断，展示条目仍有界。原公开桥命令按plugin实例执行并await，手机入口走现有移动分发。

行为回归先失败后通过，外部写门禁在外置副本去掉授权判断时确实失败。真实宿主与外骨骼联合验收保留独立边界。
