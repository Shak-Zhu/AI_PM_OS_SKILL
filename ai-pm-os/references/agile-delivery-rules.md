# Agile Delivery Rules — 敏捷交付与一致性治理

本文档定义 Scrum、Kanban、Hybrid 三大敏捷框架在 `ai-pm-os` 内的专业行为
规则。删除或弱化本文档视为破坏内核；验证脚本 `scripts/validate-skill.js`
对本文档执行必需术语和语义不变量的机器可验证检查。

---

## 1. 核心敏捷对象定义

本文档覆盖以下 11 个敏捷核心对象/状态；每个对象均定义语义与最小必填字段：

| # | 对象 | 语义定义 | 最小必填字段 |
|---|---|---|---|
| 1 | **Product Backlog** | Product Owner 维护的优先级排序需求池；条目按业务价值排序；可随时涌现但必须经 PO 优先级确认 | Item ID、标题、优先级、状态、Owner |
| 2 | **Sprint Backlog** | 当前 Sprint 内承诺交付的需求与任务；committed 后范围冻结 | Sprint 编号、Item ID、Story Point、状态、Owner |
| 3 | **User Story** | 以用户视角描述的交付单元；格式：As a ... I want ... so that ... | Story ID、标题、Acceptance Criteria、Story Point、Owner、优先级 |
| 4 | **Acceptance Criteria** | Story 交付完成的客观判断标准；每条必须可验证（通过/失败）；不得与 DoR 混淆 | Criteria ID、描述、Sprint 归属、Story 引用 |
| 5 | **Story Point** | 相对工作量估算值（非工时）；用于 Velocity 计算和 Sprint 容量规划 | Story 引用、数值（整数 Fibonacci 序列）、估算方法 |
| 6 | **DoR（Definition of Ready）** | Story 进入 Sprint Planning 承诺前的准入条件；不满足 DoR 不得committed | Story ID、DoR 检查项完成状态、PO 确认日期 |
| 7 | **DoD（Definition of Done）** | Story 达到交付完成状态的标准；与 DoR 用途不同；不得与 Acceptance Criteria 混淆 | Story ID、DoD 检查项完成状态、评审通过日期 |
| 8 | **Sprint Goal** | Sprint 内的业务目标摘要；为 Sprint Backlog 提供情境 | Sprint 编号、Goal 描述、关联 Story |
| 9 | **WIP（Work In Progress）** | 看板列同时在制的最大工件数；超过 WIP 限制时禁止拉入新工作 | 列名、WIP 限制值、当前在制数量 |
| 10 | **Blocked** | Story 或任务因外部依赖无法推进的状态；必须记录原因与持续时长 | Item ID、Blocked 日期、阻塞原因、Owner |
| 11 | **Carry-over** | Sprint 结束时未完成的 Story 跨 Sprint 保留的处理规则 | Story ID、原 Sprint、原因、重新承诺状态 |

---

## 2. Scrum 框架规则

### 2.1 适用条件

- 有明确 Product Owner 且可参与 Sprint Planning 和 Review。
- 需求可拆分为 1~4 周 Sprint 内可交付的 Story。
- 团队稳定（同一组人跨 Sprint 协作）。
- 有固定的 Sprint 节奏（2 周或 4 周）。

### 2.2 不适用条件

- 需求极不稳定（每周 > 50% 变化）。
- 法规/合规驱动型项目（需要强文档而非增量交付）。
- 团队地理分布跨 3 个以上时区且会议协调困难。
- 硬性交付日期锁定、无法接受 Sprint 节奏的项目。

### 2.3 组合规则

- 与 Hybrid 组合：上层 PMO 提供 Stage Gate + Exception 治理。
- 与 PMP/PMBOK 组合：Sprint 内提供范围/进度/风险/质量细节。
- 与 PRINCE2 组合：大型 Scrum 项目提供阶段层治理。

### 2.4 Scrum 门禁

1. **Sprint Planning Gate**：每个 Sprint 必须从 Product Backlog 顶部拉入 Story；每个 Story 必须满足 DoR 才能被承诺。
2. **DoR Gate**：Story 不满足 DoR 时不得进入 Sprint Backlog；必须留在 Product Backlog 直至满足。
3. **Scope Change Gate**：Sprint 期间禁止向 Sprint Backlog 新增 Story；范围变化必须等下一 Sprint。
4. **Sprint Review Gate**：每个 Sprint 必须有 Review Meeting 且产出 Action Items。

### 2.5 Scrum 输出规则

- **必须输出**：Sprint Backlog（含 Story ID、Point、Owner）、Sprint Goal、Sprint Review Action Items。
- **禁止输出**：超出当前 Sprint 的范围承诺；未经 PO 批准的 Story 纳入。

---

## 3. Kanban 框架规则

### 3.1 适用条件

- 需求流量不稳定（持续涌现而非批量 Sprint）。
- 维护型/运营型工作（故障修复、持续改进）。
- 团队同时处理多优先级工作流（需 Class of Service 区分）。
- 需要实时可视化流程瓶颈。

### 3.2 不适用条件

- 需要 Sprint Goal 提供情境的交付项目。
- 强依赖团队协作完成的大规模 Story（建议 Scrum）。
- 需要强制迭代节奏的合规场景。

### 3.3 组合规则

- 与 PMO 组合：WIP 与审批流集成。
- 与 PMP/PMBOK 组合：Risk 与 Change 的持续流治理。

### 3.4 Kanban 门禁与治理

#### WIP 限制规则

1. **WIP 超限禁止拉入**：看板列当前 WIP 数量 >= WIP 限制时，不得从上游拉入新工件。
2. **WIP 恢复优先级**：WIP 超限时，团队必须优先完成当前在制工件，而非增加吞吐量。
3. **WIP 调整**：WIP 限制由团队根据 Lead Time / Cycle Time 数据调整；Skill 必须记录调整原因。

#### Blocked 治理规则

1. **Blocked 必须记录**：任何 Story/Task 因外部依赖无法推进时，必须记录 Blocked 日期、原因和 Owner。
2. **Blocked Aging 升级**：Blocked 状态持续 > 1 个工作日时，Skill 必须输出升级建议（联系 Stakeholder 或调整 Sprint）。
3. **Blocked 不得计入 Velocity**：Blocked Story 的 Story Point 不计入 Sprint Velocity。

#### Pull 条件规则

1. **下游拉取**：新工件仅当目标列 WIP < 限制时才能被拉入。
2. **优先级 Pull**：同等条件下，优先拉取高优先级 Backlog 条目。

### 3.5 Kanban 输出规则

- **必须输出**：Kanban Board（含 WIP 限制值、当前在制数量）、Blocked 状态表。
- **禁止输出**：固定 Sprint 节奏的承诺；未达 DoR 的 Story 进入看板。

---

## 4. Hybrid 框架规则

### 4.1 适用条件

- 上层需要 PMO / PMP / PRINCE2 阶段治理，下层需要敏捷交付。
- 法规合规要求强文档但业务侧需要快速迭代。
- 大型复杂项目（多团队、多阶段）需要统一 Gate 控制。

### 4.2 不适用条件

- 纯敏捷或纯预测的极简场景（直接用 Scrum 或 PMBOK 即可）。
- 极小团队（< 3 人）且无阶段治理需求。

### 4.3 阶段门禁规则

1. **Phase Gate**：每个阶段（Phase）结束时必须有 Gate Review；未通过 Gate 不得进入下一阶段。
2. **Sprint 内 Hybrid 约束**：Hybrid 模式下，Sprint 门禁规则与 Scrum 相同；Scope Baseline 必须在 Sprint 启动前批准。
3. **跨 Phase Carry-over**：未完成 Story 跨 Phase 保留时必须重新评估业务价值并更新优先级。

### 4.4 输出规则

- **必须输出**：Phase / Sprint 映射表、Scope ↔ Backlog 一致性报告、Phase Gate 决策记录。
- **禁止输出**：未经 Scope Baseline 批准的条目进入 Sprint。

---

## 5. DoR  DoD 分离规则

### 5.1 核心原则

**DoR  DoD  Acceptance Criteria**。三者各有专属用途，不得互换：

| 维度 | DoR  DoD | Acceptance Criteria |
|---|---|---|---|
| 触发时机 | Story 进入 Sprint Planning 承诺前 | Story 达到交付完成时 | Story 开发过程中逐步满足 |
| 目的 | 判断 Story 是否"可承诺" | 判断 Story 是否"已完成" | 判断 Story 是否"符合用户需求" |
| 典型检查项 | 需求已澄清、AC 已写、Story Point 已估、Owner 已分配、测试环境已准备 | 代码已合并、Cod eReview 通过、测试全部通过、文档已更新、PO 已验收 | 功能符合用户故事描述、非功能需求满足 |
| 批准人 | PO + Team | PO + Team | PO（或授权 Test） |
| 与另一方关系 | 是 DoD 的前置条件 | 包含但不限于 DoR 检查项 | 是 DoR 检查项的一部分 |

### 5.2 DoR 最低检查项（≥4 条）

1. Story 有明确的 User Role 和 Goal（As a ... I want ... so that ...）。
2. Acceptance Criteria 已写且每条可客观判断。
3. Story Point 已完成估算（Fibonacci 序列）。
4. Owner 已分配（开发 + 测试）。
5. 技术依赖已识别且有应对方案。
6. DoR 由 PO 在 Sprint Planning 时确认通过。

### 5.3 DoD 最低检查项（≥4 条）

1. 所有 Acceptance Criteria 已满足并通过验收。
2. 单元测试覆盖率 >= 80%（或项目规定的阈值）。
3. Code Review 已通过。
4. 集成测试 / E2E 测试全部通过。
5. 产品负责人已验收。
6. 相关文档已更新。

### 5.4 DoR 门禁强制行为

- **禁止**：DoR 未通过的 Story 进入 Sprint Backlog 并标记为 committed。
- **禁止**：Skill 将 DoR 检查结果写入 DoD 字段 字段 字段 字段，混淆两个概念。
- **必须**：DoR 不满足时，在 Pending Updates 中记录缺失项并建议具体补救步骤。

---

## 6. Scope Baseline 一致性规则

### 6.1 核心原则

**Product Backlog  Approved Scope。Backlog 中的条目未经批准不得视为已批准范围。**

### 6.2 Scope 冲突检测与响应

当 Skill 检测到 Product Backlog / Sprint Backlog 中的条目与 Approved Scope Baseline 冲突时：

1. 输出 `Conflict: sprint-scope` 或 `Conflict: backlog-scope`。
2. 在 `PM_GAP_ANALYSIS.md` 写入 `GAP-SCP-###` 记录冲突。
3. 在 `PM_PENDING_UPDATES.md` 写入 `PU-CHG-###` 请求变更批准。
4. **禁止**：自动从 Sprint Backlog 删除冲突条目；禁止自动修改 Approved Scope。
5. **必须**：在 Daily Briefing / Sprint Review 中标注冲突并建议会议。

### 6.3 未批准 Story 进入 committed Sprint 的禁止行为

1. **禁止**：将 Product Backlog 中状态为 `Proposed` 或 `Draft` 的 Story 标记为 committed 进入 Sprint。
2. **禁止**：将不在 Approved Scope Baseline v1.1 中的 REQ/BL 条目直接纳入 Sprint Backlog committed。
3. **必须**：未批准条目进入 Sprint 必须经 `PM_PENDING_UPDATES.md` + 审批流程。
4. **必须**：每个 committed Story 必须有 PO 签字（显式 Approval 记录）。

---

## 7. Story 质量检查规则

Skill 必须能识别以下五类 Story 缺口：

| 缺口类型 | 检查规则 | Skill 行为 |
|---|---|---|
| **缺 Acceptance Criteria** | Story 有 ID 但正文无 AC 列表 | 输出 `Gap: story-missing-ac` + 建议补充 AC |
| **缺 Story Point** | Story 有 ID 但无 SP 值 | 输出 `Gap: story-missing-sp` + 建议估算方法 |
| **缺 Owner** | Story 有 ID 但无开发/测试 Owner | 输出 `Gap: story-missing-owner` + 建议分配 Owner |
| **缺优先级** | Story 有 ID 但无 P0/P1/P2/P3 优先级 | 输出 `Gap: story-missing-priority` + 建议 PO 确认 |
| **缺 Sprint 归属** | Story 状态为 `Ready` 但无 Sprint 编号 | 输出 `Gap: story-missing-sprint` + 建议 PO 在 Planning 时分配 |

**禁止伪造缺口值**：Skill 不得自动填入缺失字段；只能输出 Gap 建议。

---

## 8. Sprint Carry-over 规则

### 8.1 Carry-over 条件

以下情况可将未完成 Story 带入下一 Sprint：

1. 原 Sprint 已结束且 Story 确实未达到 DoD。
2. PO 确认业务价值仍然有效，不降级也不删除。
3. 重新评估 Story Point（实际工作量可能变化）。
4. 重新确认 Owner（可能有人员变更）。

### 8.2 重新承诺规则

1. **禁止静默滚动**：未完成 Story 不得不经 PO 确认自动进入下一 Sprint Backlog。
2. **必须重新评估**：Carry-over Story 必须重新过 DoR。
3. **必须记录原因**：每次 Carry-over 必须记录 `Carry-over Reason`（外部依赖 / 估算不足 / 需求变化 / 其他）。
4. **Velocity 影响**：Carry-over Story Point 不计入当前 Sprint Velocity。

### 8.3 Carry-over 输出

```
Sprint N Carry-over Report:
  Story ID | 原 Sprint | 原因 | 重新承诺 Sprint | Owner 确认
  US-001  | Sprint N-1 | 外部依赖未解除 | Sprint N+1 | PO confirmed
```

---

## 9. 敏捷框架自动选择规则（Skill 职责）

Skill 根据以下四维自动选择 Scrum / Kanban / Hybrid：

### 9.1 维度说明

- **意图维度**：用户意图推断（处理 Backlog / Sprint Planning / 看板 / 报告）。
- **项目模式维度**：Sprint 节奏稳定 → Scrum；流量不稳定持续涌现 → Kanban；多阶段复杂项目 → Hybrid。
- **治理层级维度**：需要 Stage Gate → Hybrid；Sprint Review → Scrum；持续流 → Kanban。
- **输出目标维度**：产出 Sprint Backlog → Scrum；产出 Kanban Board → Kanban；产出阶段报告 → Hybrid。

### 9.2 自动选择决策表

| 条件 | 自动选择 | 辅助框架 |
|---|---|---|
| 有活跃 Sprint + PO + 稳定节奏 | **Scrum** | +PMO（治理门禁）|
| 持续流 + 维护型工作 + 无固定 Sprint | **Kanban** | +PMO（审批流）|
| 多阶段项目 + 既有 Phase 又有迭代 | **Hybrid** | +Scrum（下层）+PMO（上层）|
| 团队 < 3 人或临时项目 | **Kanban**（优先）| +PMO |
| 法规合规 + 需要文档化 | **Hybrid**（重文档）| +PMP/PMBOK |

### 9.3 请求用户澄清的条件

Skill **只有**在以下实质业务歧义时才请求澄清：
1. 同一 Story 被 PO 和 Tech Lead 标注不同优先级且无法从项目文件中判断。
2. 需求同时存在于两个 Sprint 的 Backlog 中，Skill 无法判断去重优先保留哪个。
3. 团队同时存在 Scrum 和 Kanban 的混合使用，Skill 无法判断主模式。

**禁止**：因未指定"Scrum 还是 Kanban"而让用户选择方法论。

---

## 10. 敏捷语义不变量（机器可验证）

以下 5 条不变量由 `scripts/validate-skill.js` 自动检查：

| # | 不变量 | 验证规则 |
|---|---|---|
| **SI-04** | DoR  DoD 分离 | agile-delivery-rules.md 中 DoR  DoD 各有不少于 4 条检查项；文档中包含""或"不得互换"显式声明 |
| **SI-05** | Scope 冲突规则 | 文档中包含"禁止将未批准条目进入 committed Sprint"；scenarios.md 中存在 SC-AGILE-SCP-01 场景 |
| **SI-06** | WIP 限制强制 | 文档中包含"WIP 超限禁止拉入"规则；scenarios.md 中存在 WIP 相关场景 |
| **SI-07** | Story 质量缺口识别 | 文档中明确定义 5 类缺口（AC、SP、Owner、优先级、Sprint 归属）|
| **SI-08** | Carry-over 禁止静默滚动 | 文档中包含"禁止静默滚动"和"必须重新评估 DoR"规则 |

---

## 11. 与场景的对应

所有敏捷场景（SC-AGILE-*）的 Then 块必须可映射回本文档的：
- 某一条门禁规则（§2~§4）
- 某一条 Scope 一致性规则（§6）
- 某一条 Story 质量检查规则（§7）
- 某一条 Carry-over 规则（§8）

任何场景若找不到映射，视为无效场景。

---

## 12. 与验证脚本的对应

`scripts/validate-skill.js` 对本文档执行：
1. 必需术语存在性检查（§1 的 11 个对象术语）。
2. 语义不变量检查（§10 的 SI-04~SI-08）。
3. 敏捷场景存在性检查（scenarios.md 中 SC-AGILE-* 场景）。
