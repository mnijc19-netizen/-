# 🏛️ MASTER_CONSTITUTION.md — 项目全域母宪法与单点权威法典

> **版本**：v2.0 (Universal Master Edition)  
> **地位**：本项目所有代码设计、重构、功能扩展与 AI 调度的最高法律。任何代码变更若与本法典冲突，必须执行违宪仲裁并获得用户确认方可修宪！

---

## 👑 第一章：5 层单向洋葱架构公理

```
Layer 4: UI 展现与交互层 (components/, pages/)
   ↓ (单向依赖)
Layer 3: 响应式状态与持久化层 (localStore.ts, api/client.ts)
   ↓ (单向依赖)
Layer 2: 领域纯计算引擎层 (repaymentScheduler, marketData, smsParser)
   ↓ (单向依赖)
Layer 1: 纯数据字典与 Schema 层 (types/index.ts, DEFAULT_CATEGORIES)
   ↓ (单向依赖)
Layer 0: 母宪法公理层 (恒等式、物理留痕、单点权威)
```

- **Layer 0: 母宪法公理层**：
  - 恒等式：`净资产 (Net Worth) ≡ 总资产 (Total Assets) - 总负债 (Total Liabilities)`；
  - 零隐式篡改：用户财务数据神圣不可隐式剥夺，每次变动物理留痕；
  - 隐私默认保护：敏感资产数字默认遮罩 (`¥ ••••`)。
- **Layer 1: Schema 字典层**：
  - 10 大标准消费字典（餐饮美食、日用百货、交通出行、休闲娱乐、医疗健康、住房物业、生活服务、文化教育、服饰装扮、其他支出）；
  - 11 种账户类型标准枚举（`wallet`, `bank`, `investment`, `credit`, `loan`, `huabei`, `baitiao`, `meituan_pay`, `douyin_pay`, `jiebei`, `fenfu`）。
- **Layer 2: 领域纯计算引擎层**：
  - 100% 纯函数、无 UI 依赖、零外部副作用；
  - 负责还款计划生成、投资估值更新、NLP/正则票据要素提取、自由现金流健康度评分。
- **Layer 3: 响应式持久化层**：
  - `localStore.ts` 为本地数据唯一持久化权威，实现 `seenRaw` + `seenFuzzy` 双层哈希防重；
  - 严禁在 Getter / Computed 内部执行修改数据状态的写操作。
- **Layer 4: UI 展现与交互层**：
  - 仅负责接收用户手势输入与渲染视图状态；
  - 严禁在组件 JSX 内部编写核心业务数学公式。

---

## 🛡️ 第二章：单一权威入口公理 (Single Point of Authority)

1. **账户余额调额与校准**：
   - 必须且只能由 `AccountBalanceAdjustModal` 权威调度，并自动生成校准流水；
   - 严禁在“设置页”等偏好设置中开设绕过复式记账的“改余额后门”。
2. **交易流水创建与修改**：
   - 记账统一由 `api.createTransaction` / `UniversalQuickAddModal` 处理；
   - AI 修改流水统一由 `update_transaction` 工具调度，禁止私自创建重复流水。
3. **负债分期与信贷计划**：
   - 统一由 `repaymentScheduler.ts` 集中管理与推算，绝不与日常现金消费混淆。

---

## ⚡ 第三章：违宪冲突仲裁机制

当用户提出新需求或代码改动与本法典产生冲突时：
1. **严禁私自盲改**；
2. **AI 必须主动向用户发出预警**：“⚠️ 该需求与《母宪法》第 X 条存在冲突（原因分析）”；
3. **提供结构化决策选项**：
   - 选项 A：确认正式修改宪法核心条款（修宪升级）；
   - 选项 B：采用符合宪法架构的无冲突替代方案。
