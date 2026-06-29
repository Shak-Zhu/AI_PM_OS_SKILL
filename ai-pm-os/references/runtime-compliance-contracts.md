# Critical Output Contract Registry — 关键输出契约注册表

|`ai-pm-os` 任何关键输出在发送前必须命中本注册表中的契约，并完成 Pre-send Compliance Gate。
|本文件与 `references/stability-rules.md` §10 共同定义运行时遵循保障；删除或弱化任一字段视为破坏内核。

## 1. Critical Output Contract 通用结构

<!-- SECTION:CONTRACT_SPEC -->
每个契约必须具备 10 个字段（机器可校验，验证器按区块精确解析）：

| 字段 | 含义 |
|---|---|
| `contract_id` | 契约唯一标识，格式 `COC-<TYPE>-<NNN>`，必须与所在 BLOCK/ENDBLOCK 的 ID 精确相等 |
| `trigger` | 触发该契约的意图 / 事件关键词 |
| `required_reads` | 发送前必须读取的 Required Project Files 列表 |
| `required_sections` | 制品必须包含的章节清单 |
| `required_file_write` | 权威落盘文件路径（双输出之一） |
| `required_chat_delivery` | 聊天交付模式：`full-body-single-codeblock` 或 `path-only-with-explicit-grant` |
| `abbreviation_exception` | 短指针授权例外的可执行规则（见 §1.1） |
| `forbidden_shortcuts` | 禁止的捷径列表（如省略字段、跳过门禁、单渠道发送） |
| `evidence` | 必须随制品记录的证据（文件路径、归一化 hash、门禁结果） |
| `fail_closed_behavior` | 缺字段、缺渠道或授权不明时的失败关闭行为 |
<!-- END:CONTRACT_SPEC -->

### 1.1 abbreviation_exception 唯一通用规则

Approved Design §2 与 §5 规定唯一通用规则，所有契约必须严格遵循，不得在契约内部局部冲突：

> **path-only 仅在 Project Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许。** "简洁" / "赶快" / "一键复制" 等表达均不构成 path-only 授权。

本通用规则适用于全部契约；如未来需要对某类契约永久禁止 path-only 例外，必须通过 Approved Design 变更（CHG-###）正式纳入 §2 与 §5，不得由本注册表或任何契约在局部文件中单方面引入禁令。

## 2. 关键语义规则

<!-- SECTION:KEY_SEMANTICS -->

| 规则 | 含义 |
|---|---|
| `one-click-copy` = `完整正文单代码块` | 把完整内容放入单个可复制代码块；禁止仅给路径 |
| `path-only` 仅在显式授权时允许 | Project Owner 当前消息必须包含"只给路径"或"短指针"等明确表达 |
| 三种非授权表达 | "简洁""赶快""一键复制"均不构成 path-only 授权 |
| 双输出事务 | 文件落盘 + 聊天全文必须同时成功；任一失败即交付失败 |
| 错误成功状态 | 不得在缺字段、缺渠道或授权不明时输出 `issued` / `accepted` / `complete` / `done` / `finished` |
| 上下文压缩后 | 必须重新读取契约来源；不得依赖压缩摘要声称已满足 |
| 通用 abbreviation_exception | 全部契约共享 §1.1 唯一通用规则；契约内部不得另行添加矛盾条款 |
<!-- END:KEY_SEMANTICS -->

## 3. 关键输出契约

每个契约以下面格式的 BLOCK 包裹：BLOCK 行后跟 10 行字段定义（每行一个 `| `field_name` | ... |` 表格行），再跟 ENDBLOCK 行。验证器按 BLOCK 解析，缺失、重复、未知字段或额外契约均 fail-closed。

<!-- CONTRACT:BLOCK:COC-CAR-004 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-CAR-004 |
| `trigger` | 用户提出 Scope / Baseline / Decision / RAID / Sprint 变更请求 |
| `required_reads` | 当前 Approved Baseline + Scope Baseline + Decision Log + Change Log + Pending Updates |
| `required_sections` | 请求编号 / 变更类型 / 涉及文档 / 影响范围（Scope/WBS/RAID/Sprint）/ 风险评估 / 替代方案 / 申请级别（L1/L2/L3）/ 申请理由 |
| `required_file_write` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` 写入 PU；或在 `01_PM_DOCUMENTS/PM_CHANGE_LOG.md` 追加条目 |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Project Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止直接写 Approved Baseline；禁止省略影响范围和风险评估；禁止以"小调整"为由跳过 PU |
| `evidence` | 影响范围列表 + 风险 ID（如 R-###）+ 替代方案对比 + 申请级别判断依据 |
| `fail_closed_behavior` | 缺影响范围或风险评估 → Escalation: contract-field-missing → 不得输出 `approved`；Copilot 不得自我批准；missing source/permission/object → status=pending/unconfirmed |
| `decision_maker` | 做出审批决定的人员姓名或 ID |
| `decision_role` | 做出决定的人员所承担的角色（如 Project Owner、Sponsor Approver 等） |
| `relayed_by` | 经手传达审批结果的人员（若与 decision_maker 不同） |
| `source` | 审批决定的来源渠道（如会议、邮件、消息等） |
| `decided_at` | 审批决定的时间戳（YYYY-MM-DD 或 ISO 8601 格式） |
| `notes` | 审批备注、附加说明或条件 |
| `related_object` | 关联的对象引用（如 PU 编号、变更请求编号等） |
<!-- CONTRACT:ENDBLOCK:COC-CAR-004 -->

<!-- CONTRACT:BLOCK:COC-PUA-005 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-PUA-005 |
| `trigger` | Skill 生成 Pending Update 后请求 Project Owner 批准 |
| `required_reads` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` + 涉及文件当前内容 + 预生成内容 diff |
| `required_sections` | PU 编号 / 状态 Proposed / 涉及文件 / 变更前内容 / 变更后内容 / 风险 / 批准所需操作 |
| `required_file_write` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` 追加 PU 条目（Proposed 状态） |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Project Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止跳过"变更前/变更后"对比；禁止以"按之前惯例"代替显式 diff；禁止将 Proposed 状态省略为"已申请" |
| `evidence` | PU 编号 + 涉及文件路径 + 变更前/后 hash 对比 + 风险说明 |
| `fail_closed_behavior` | 缺变更前/后 diff → Escalation: contract-field-missing → 不得输出 `pending-approval-ready`；Copilot 不得自我批准；missing source/permission/object → status=pending/unconfirmed |
| `decision_maker` | 做出审批决定的人员姓名或 ID |
| `decision_role` | 做出决定的人员所承担的角色（如 Project Owner、Sponsor Approver 等） |
| `relayed_by` | 经手传达审批结果的人员（若与 decision_maker 不同） |
| `source` | 审批决定的来源渠道（如会议、邮件、消息等） |
| `decided_at` | 审批决定的时间戳（YYYY-MM-DD 或 ISO 8601 格式） |
| `notes` | 审批备注、附加说明或条件 |
| `related_object` | 关联的对象引用（如 PU 编号、变更请求编号等） |
<!-- CONTRACT:ENDBLOCK:COC-PUA-005 -->

## 4. Pre-send Compliance Gate（8 步）

<!-- SECTION:GATE_TABLE -->
关键输出在发送前必须按以下 8 步顺序检查；任一失败 → 停止发送制品 → 记录 Escalation + Gap：

| 步骤 | 名称 | 检查内容 |
|---|---|
| 1 | 意图与契约匹配 | 用户意图触发哪一类契约；命中后锁定 `contract_id` |
| 2 | Required Project Files 读取证据 | `required_reads` 全部已读取并记录证据；缺任一 → 失败 |
| 3 | 必需章节完整 | `required_sections` 全部出现在制品中；缺任一 → 失败 |
| 4 | 权威文件落盘 | `required_file_write` 路径已成功写入（行数 ≥ 预期最小值） |
| 5 | 聊天交付模式 | `required_chat_delivery` 模式正确（`full-body-single-codeblock` 必须含完整正文）；双输出事务（文件 + 聊天）任一失败即 fail-closed |
| 6 | 规范化一致性 | 文件正文与聊天正文 hash 一致；不一致 → 失败（双输出事务前提） |
| 7 | 禁止项未触发 | `forbidden_shortcuts` 全部未触发；任一触发 → 失败 |
| 8 | PASS/FAIL 证据 | 必须输出 `[Delivery Gate] PASS` 证据；FAIL 时记录失败原因 |
<!-- END:GATE_TABLE -->

门禁结果必须以 `[Delivery Gate] PASS` 或 `[Delivery Gate] FAIL: <reason>` 形式出现在制品证据区。

## 5. 失败升级路径

- 字段缺失 → `Escalation: contract-field-missing` → 写入 `00_PM_MEMORY/PM_GAP_ANALYSIS.md`
- 渠道失败 → `Escalation: dual-output-failed` → 不得输出 `issued` / `accepted` / `complete`
- 授权不明 → `Escalation: abbreviation-grant-unclear` → 走 L2 Pending Update
- 禁止项触发 → `Escalation: forbidden-shortcut` → 停止发送并请求 L1 澄清
- Copilot 自我批准 → `Escalation: self-approval-detected` → 不得自我批准；转入 pending/unconfirmed 状态

## 6. 验收口径

- 2 类契约（COC-CAR-004、COC-PUA-005）全部存在；每类契约的字段集合与规定字段精确相等，每字段恰好出现一次；`contract_id` 字段值必须与所在 BLOCK/ENDBLOCK 的 ID 精确相等
- 任何未识别的字段行（包括 `fake-field`、`FakeField`、`field.name` 等非 `[a-z_]` 形式）必须作为 unknown field 失败
- BEGIN 与 END 标记必须各恰好 2 个、一一配对、ID 严格相等、顺序与预期契约列表完全一致；孤立、重复、嵌套、错配或额外标记均 fail-closed
- 8 步 Gate 表格恰好 8 行，编号严格为 1~8，顺序和名称逐项精确相等
- `one-click-copy` 语义在 §2 中明确且不与 `path-only` 混淆
- 三种非授权表达（"简洁""赶快""一键复制"）在 §2 中明确列出
- 双输出失败关闭行为在 §2 + §4 中显式声明
- 错误成功状态（`issued` / `accepted` / `complete` / `done` / `finished`）在 §2 + §5 中明确禁止
- Copilot 不得自我批准：缺少 source/permission/object 时必须转为 pending/unconfirmed 状态
- 全部契约的 `abbreviation_exception` 字段必须仅引用 §1.1 唯一通用规则；不得在契约内引入与通用规则冲突的禁止条款
- 验证器机器检查以上全部；破坏任一即退出非 0

## 7. 变更记录（已归档）

<!-- SECTION:CODER_APPLICABILITY -->

> **CHG-011 Applicability Gate 已归档。** 本节内容不再适用。

本 Skill 不执行 AI Coder 委派模型，所有验收通过 Project Owner 直接审批 Pending Update 契约（COC-PUA-005）或变更审批契约（COC-CAR-004）完成，无需中间层。

<!-- END:SECTION:CODER_APPLICABILITY -->
