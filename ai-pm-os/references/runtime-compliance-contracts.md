# Critical Output Contract Registry — 关键输出契约注册表

`ai-pm-os` 任何关键输出在发送前必须命中本注册表中的契约，并完成 Pre-send Compliance Gate。
本文件与 `references/stability-rules.md` §10 共同定义运行时遵循保障；删除或弱化任一字段视为破坏内核。

## 0. 路径与治理根约定

契约的 `required_file_write` 路径采用**项目相对路径**或**可配置治理根路径**（`${GOVERNANCE_ROOT}`），不得硬编码为任何开发期控制空间目录路径。

| 路径类别 | 形式 | 说明 |
|---|---|---|
| 项目壳内权威文件 | `00_PM_MEMORY/...` / `01_PM_DOCUMENTS/...` / `_AI_GLOBAL_MEMORY/...` | 与干净产品壳一致的项目相对路径 |
| 工作包与 QC 报告 | `${GOVERNANCE_ROOT}/pm-ai-work-packages/<WP-ID>.md` / `${GOVERNANCE_ROOT}/pm-ai-reviews/QC-<WP-ID>.md` | `GOVERNANCE_ROOT` 按 §0.5 解析 |
| 技能内部 | `ai-pm-os/references/...` / `scripts/...` | Skill 源码路径 |

可交付 Skill 不得假设任何具体治理根目录存在；运行时使用的所有可写目标必须以 `${GOVERNANCE_ROOT}` 占位符或项目相对路径表示。

## 0.5. GOVERNANCE_ROOT 解析契约（确定性、干净壳可运行）

`GOVERNANCE_ROOT` 是本注册表在启用 AI Coder 委派后定位工作包与 QC 报告的可选项目治理根；其值必须可由运行环境在**不依赖任何宿主操作系统环境变量**的前提下确定性确定。

### 0.5.1 配置来源（按解析优先级排序，从高到低）

| 优先级 | 来源 | 形式 | 适用范围 |
|---|---|---|---|
| 1 | 运行时进程显式注入（API / CLI 参数） | `--governance-root=<path>` 或等价编程接口 | 本次运行覆盖所有其他来源 |
| 2 | 项目壳内 `.ai-pm-os/governance-root` 文件（每行一个候选路径，首行非空非注释为有效值） | 文件 | 当前工作目录下存在时优先于默认值 |
| 3 | 产品壳项目相对默认路径（见 §0.5.2） | `01_PM_DOCUMENTS/AI_PM_GOVERNANCE/` | 干净壳复制后即可运行；无需任何环境变量；首次运行时按契约创建所需子目录 |

### 0.5.2 产品壳默认治理根（项目相对路径）

默认 `GOVERNANCE_ROOT = <project_root>/01_PM_DOCUMENTS/AI_PM_GOVERNANCE/`，其中 `<project_root>` 是 `ai-pm-os/SKILL.md` 所在目录的**父目录**（即 `ai-pm-os/` 的直接父目录）。

该默认值必须保证：

- 干净产品壳（仅含 `ai-pm-os/`、`00_PM_MEMORY/`、`_AI_GLOBAL_MEMORY/` 等目录）复制后可直接运行，无需任何 OS 环境变量。
- 默认治理根是**产品壳内的项目相对路径**。
- 未启用 AI Coder 委派时，不创建该目录，也不执行 Coder Work Package 或 PM/QC 代码审查契约。
- 不得在源码、注册表或场景中硬编码任何产品开发私有目录；必须通过 `${GOVERNANCE_ROOT}` 占位符访问。

### 0.5.3 解析规则

1. 若优先级 1 提供了非空字符串，则取该值（忽略后续来源）。
2. 否则若项目壳内存在 `.ai-pm-os/governance-root` 且首行非空非注释（不以 `#` 开头），则取该文件首行。
3. 否则使用 §0.5.2 的产品壳默认治理根 `01_PM_DOCUMENTS/AI_PM_GOVERNANCE/`（项目相对路径）。
4. 解析失败（值为空、不是字符串、含 OS 绝对路径前缀、含 `..` 段或越出项目根）→ fail-closed：
   - `Escalation: governance-root-invalid`
   - 不允许继续执行任何 Critical Output Contract
   - 必须写入 `00_PM_MEMORY/PM_GAP_ANALYSIS.md`（编号 `GAP-GR-###`）并请求 L1 澄清

### 0.5.4 路径合法性

- 不得以 Windows 盘符路径开头（如形如 `[drive]:\` 的任意字符串）。
- 不得以 `/` 开头（Unix 绝对路径禁止）。
- 不得以双反斜杠开头（UNC 网络路径禁止）。
- 不得含 `..` 路径段。
- 解析后路径必须以项目根为前缀；越出项目根视为非法。

### 0.5.5 验证器要求

`SI-14` 必须：

- 解析 `.ai-pm-os/governance-root`（若存在）首行非空非注释。
- 当文件不存在或内容为空时，回退到 §0.5.2 项目相对默认值。
- 验证运行时由验证器计算出的 `GOVERNANCE_ROOT` 解析结果可被生成并落盘到测试日志中（用于负向注入的 baseline）。

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

Approved Design §2 与 §5 规定唯一通用规则，所有 6 类契约必须严格遵循，不得在契约内部局部冲突：

> **path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许。** "简洁" / "赶快" / "一键复制" 等表达均不构成 path-only 授权。

本通用规则适用于全部 6 类契约；如未来需要对某类契约永久禁止 path-only 例外，必须通过 Approved Design 变更（CHG-###）正式纳入 §2 与 §5，不得由本注册表或任何契约在局部文件中单方面引入禁令。

## 2. 关键语义规则

<!-- SECTION:KEY_SEMANTICS -->

| 规则 | 含义 |
|---|---|
| `one-click-copy` = `完整正文单代码块` | 把完整内容放入单个可复制代码块；禁止仅给路径 |
| `path-only` 仅在显式授权时允许 | Human Owner 当前消息必须包含"只给路径"或"短指针"等明确表达 |
| 三种非授权表达 | "简洁""赶快""一键复制"均不构成 path-only 授权 |
| 双输出事务 | 文件落盘 + 聊天全文必须同时成功；任一失败即交付失败 |
| 错误成功状态 | 不得在缺字段、缺渠道或授权不明时输出 `issued` / `accepted` / `complete` / `done` / `finished` |
| 上下文压缩后 | 必须重新读取契约来源；不得依赖压缩摘要声称已满足 |
| 通用 abbreviation_exception | 全部 6 类契约共享 §1.1 唯一通用规则；契约内部不得另行添加矛盾条款 |
<!-- END:KEY_SEMANTICS -->

## 3. 6 类关键输出契约

每个契约以下面格式的 BLOCK 包裹：BLOCK 行后跟 10 行字段定义（每行一个 `| \`field_name\` | ... |` 表格行），再跟 ENDBLOCK 行。验证器按 BLOCK 解析，缺失、重复、未知字段或额外契约均 fail-closed。

<!-- CONTRACT:BLOCK:COC-CWP-001 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-CWP-001 |
| `trigger` | PM AI 签发工作包给 Coder（Cursor） |
| `required_reads` | `${GOVERNANCE_ROOT}/pm-ai-work-packages/<WP-ID>.md` 父包 + `00_PM_MEMORY/PM_CURRENT_STATUS.md` + `00_PM_MEMORY/PM_SCOPE_BASELINE.md` + `ai-pm-os/SKILL.md` |
| `required_sections` | 基本信息 / Required Project Files / scope_in / scope_out / 允许修改的文件 / 验收标准 / 禁止事项 / 报告要求 |
| `required_file_write` | `${GOVERNANCE_ROOT}/pm-ai-work-packages/<WP-ID>.md` |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止省略任何 8 个规定章节；禁止只给路径不发正文；禁止以"参考模板"代替正文 |
| `evidence` | 文件落盘路径 + 文件行数 + 聊天代码块 hash + `Required Project Files` 表格完整 |
| `fail_closed_behavior` | 缺任一章节 → Escalation: contract-field-missing → 不得输出 `issued` |
<!-- CONTRACT:ENDBLOCK:COC-CWP-001 -->

<!-- CONTRACT:BLOCK:COC-RWP-002 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-RWP-002 |
| `trigger` | QC 报告 L3 rework required；PM AI 签发返工包 |
| `required_reads` | 触发返工的 QC 报告（含 QC-F 编号） + 原 WP 报告 + 父包变更记录 |
| `required_sections` | 基本信息（含 `状态：Issued / Rework`）/ Required Project Files / scope_in（逐条引用 QC-F）/ scope_out / 允许修改的文件 / 验收标准 / 禁止事项 / 报告要求 |
| `required_file_write` | `${GOVERNANCE_ROOT}/pm-ai-work-packages/<WP-ID>-R<N>.md` |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止重写工作包代替返工；禁止合并多个 QC-F 到一条 scope_in 而不区分证据；禁止省略原始证据引用 |
| `evidence` | QC 报告路径 + QC-F 列表 + 父包路径 + `Coder 报告必须新增 Read Evidence` 条款 |
| `fail_closed_behavior` | 缺 QC-F 引用或父包引用 → Escalation: contract-field-missing → 不得输出 `issued` |
<!-- CONTRACT:ENDBLOCK:COC-RWP-002 -->

<!-- CONTRACT:BLOCK:COC-PQR-003 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-PQR-003 |
| `trigger` | PM/QC 完成对一个 WP 的独立验收 |
| `required_reads` | 待审 WP + WP-RESULT 报告 + QC 评级标准 + 上一轮 QC 报告（如果存在） |
| `required_sections` | 基本信息（含日期 / 评级 L1~L4 / 结论）/ 五层验收状态 / Baseline And Scope Audit / 独立功能验收 / 阻断发现（含 ID / 严重度 / 发现 / 证据）/ 结论 / 完成度 |
| `required_file_write` | `${GOVERNANCE_ROOT}/pm-ai-reviews/QC-<WP-ID>.md` |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止以"通过"代替"PM/QC Accepted：是"；禁止省略阻断发现的证据列；禁止直接给 Accepted 而不写阻断发现 |
| `evidence` | 待审 WP 路径 + WP-RESULT 路径 + 阻断发现表 + 验收命令真实退出码 |
| `fail_closed_behavior` | 缺阻断发现表或证据列 → Escalation: contract-field-missing → 不得输出 `accepted` |
<!-- CONTRACT:ENDBLOCK:COC-PQR-003 -->

<!-- CONTRACT:BLOCK:COC-CAR-004 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-CAR-004 |
| `trigger` | 用户提出 Scope / Baseline / Decision / RAID / Sprint 变更请求 |
| `required_reads` | 当前 Approved Baseline + Scope Baseline + Decision Log + Change Log + Pending Updates |
| `required_sections` | 请求编号 / 变更类型 / 涉及文档 / 影响范围（Scope/WBS/RAID/Sprint）/ 风险评估 / 替代方案 / 申请级别（L1/L2/L3）/ 申请理由 |
| `required_file_write` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` 写入 PU；或在 `01_PM_DOCUMENTS/PM_CHANGE_LOG.md` 追加条目 |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止直接写 Approved Baseline；禁止省略影响范围和风险评估；禁止以"小调整"为由跳过 PU |
| `evidence` | 影响范围列表 + 风险 ID（如 R-###）+ 替代方案对比 + 申请级别判断依据 |
| `fail_closed_behavior` | 缺影响范围或风险评估 → Escalation: contract-field-missing → 不得输出 `approved` |
<!-- CONTRACT:ENDBLOCK:COC-CAR-004 -->

<!-- CONTRACT:BLOCK:COC-PUA-005 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-PUA-005 |
| `trigger` | Skill 生成 Pending Update 后请求 Human Owner 批准 |
| `required_reads` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` + 涉及文件当前内容 + 预生成内容 diff |
| `required_sections` | PU 编号 / 状态 Proposed / 涉及文件 / 变更前内容 / 变更后内容 / 风险 / 批准所需操作 |
| `required_file_write` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` 追加 PU 条目（Proposed 状态） |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止跳过"变更前/变更后"对比；禁止以"按之前惯例"代替显式 diff；禁止将 Proposed 状态省略为"已申请" |
| `evidence` | PU 编号 + 涉及文件路径 + 变更前/后 hash 对比 + 风险说明 |
| `fail_closed_behavior` | 缺变更前/后 diff → Escalation: contract-field-missing → 不得输出 `pending-approval-ready` |
<!-- CONTRACT:ENDBLOCK:COC-PUA-005 -->

<!-- CONTRACT:BLOCK:COC-HAR-006 -->
| 字段 | 值 |
|---|---|
| `contract_id` | COC-HAR-006 |
| `trigger` | Coder + PM/QC 均通过后请求 Human Owner 进行最终 L1 验收 |
| `required_reads` | Coder 执行报告 + PM/QC 报告 + 当前 WP + Baseline + 所有 QC 反馈闭环证据 |
| `required_sections` | 验收请求编号 / 涉及 WP / 验收范围 / 已通过层（Coder/PM/QC）/ 待 Human 验收的范围 / 验收动作 / 失败升级路径 |
| `required_file_write` | `01_PM_DOCUMENTS/PM_APPROVAL_STATUS.md` 追加 Human Pending 条目 |
| `required_chat_delivery` | `full-body-single-codeblock` |
| `abbreviation_exception` | 按 §1.1 唯一通用规则：path-only 仅在 Human Owner 当前消息显式包含"只给路径"或"短指针"等明确表达时允许；"简洁""赶快""一键复制"均不构成授权 |
| `forbidden_shortcuts` | 禁止以"Coder+PM 通过"代替 Human 验收；禁止省略失败升级路径；禁止以"等待 Human 确认"代替明确验收请求 |
| `evidence` | Coder 报告路径 + PM/QC 报告路径 + 五层验收状态 + 真实退出码 |
| `fail_closed_behavior` | 缺任一已通过层或失败升级路径 → Escalation: contract-field-missing → 不得输出 `human-pending` |
<!-- CONTRACT:ENDBLOCK:COC-HAR-006 -->

## 4. Pre-send Compliance Gate（8 步）

<!-- SECTION:GATE_TABLE -->
关键输出在发送前必须按以下 8 步顺序检查；任一失败 → 停止发送制品 → 记录 Escalation + Gap：

| 步骤 | 名称 | 检查内容 |
|---|---|---|
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
- 治理根解析失败 → `Escalation: governance-root-invalid` → 不得执行任何 COC；写入 `PM_GAP_ANALYSIS.md`

## 6. 验收口径

- 6 类契约全部存在；每类契约的字段集合与规定 10 字段精确相等，每字段恰好出现一次；`contract_id` 字段值必须与所在 BLOCK/ENDBLOCK 的 ID 精确相等
- 任何未识别的字段行（包括 `fake-field`、`FakeField`、`field.name` 等非 `[a-z_]` 形式）必须作为 unknown field 失败
- BEGIN 与 END 标记必须各恰好 6 个、一一配对、ID 严格相等、顺序与预期契约列表完全一致；孤立、重复、嵌套、错配或额外标记均 fail-closed
- 8 步 Gate 表格恰好 8 行，编号严格为 1~8，顺序和名称逐项精确相等
- `one-click-copy` 语义在 §2 中明确且不与 `path-only` 混淆
- 三种非授权表达（"简洁""赶快""一键复制"）在 §2 中明确列出
- 双输出失败关闭行为在 §2 + §4 中显式声明
- 错误成功状态（`issued` / `accepted` / `complete` / `done` / `finished`）在 §2 + §5 中明确禁止
- `GOVERNANCE_ROOT` 解析按 §0.5 优先级与合法性规则；缺省值为项目相对路径 `01_PM_DOCUMENTS/AI_PM_GOVERNANCE/`；解析失败 → fail-closed
- 全部 6 类契约的 `abbreviation_exception` 字段必须仅引用 §1.1 唯一通用规则；不得在契约内引入与通用规则冲突的禁止条款
- 验证器机器检查以上全部；破坏任一即退出非 0

## 7. 与 WP-007 命令路由集成

命中 COC 时，Layer 2 必须同时返回 `workflow_id` 和 `contract_id`（详见 `router.md` §8.5 和 `command-and-approval-rules.md` §7）。缺少任一字段时，Pre-send Compliance Gate 返回 `Escalation: coc-missing-workflow-or-contract`。
