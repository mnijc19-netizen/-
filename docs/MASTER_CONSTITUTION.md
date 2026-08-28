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

---

## 📱 第四章：全域 AI 视觉识别与 Gist 云信箱智能分流公理

系统确立 **【iPhone 侧键截屏 ➔ 智谱 AI 视觉识别 ➔ Gist 云信箱 ➔ 前端智能分流】** 为官方标准零摩擦记账闭环：

```
[iPhone 截屏] ➔ [Base64 发送至智谱 GLM-4V] ➔ [智谱 AI 视觉解析] 
       ↓
[写入 GitHub Gist smartwealth_inbox.json]
       ↓
[前端 App 自动拉取 (githubGistSync)] 
       ├── 若判定为日常消费 (type: 'expense') ➔ 记入日常消费流水并关联对应扣款账户
       └── 若判定为信贷分期/待还账单 (type: 'debt') ➔ 自动建立分期负债计划，严禁扣减零钱现金！
```

1. **信贷分期与日常消费严格隔离**：
   - 白条/花呗/美团月付/信用卡待还账单属于 **信贷负债 (Debt)**，进入月度资金规划大厅（Planner），严禁作为单笔日常消费扣减现金或产生负余额；
2. **多期参数自动提取**：
   - 自动解析总待还本金、分期期数、当期与未来月供、每月还款日，保证资产负债表与自由现金流推算 100% 精确。

---

## 🎨 第五章：UI 审美标准法与全域视觉工程公理 (UI Aesthetics Standard Law)

系统所有界面设计、卡片排版与交互动效必须 100% 严格遵守以下 **UI 审美四大黄金律**：

### 1. 【卡片纵向空间紧凑黄金律 (Vertical Rhythm & Compact Density)】
- **卡片内边距收敛**：全局卡片 Padding 统一控制在 `p-3.5 sm:p-4`（小型/嵌套卡片使用 `p-2.5 sm:p-3`），严禁使用 `p-6` 或过大无意义留白造成视觉臃肿；
- **纵向节奏节制**：页面容器间距统一使用 `space-y-2.5 sm:space-y-3`（严禁超过 `space-y-4` 导致屏幕被无限拉长）；
- **高度合理化**：单个卡片在移动端视口内的高度必须精简克制，保证首屏（390×844）至少能完整纵览“净资产核心卡 + 2~3 个核心模块”，拒绝一屏只能看一个大块。

### 2. 【信息密度与呼吸感二元平衡律 (Information Hierarchy & Clarity)】
- **字体层级规整**：
  - 一级标题 / 卡片主标：`text-xs sm:text-sm font-bold`；
  - 二级辅助说明 / 时间标签：`text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500`；
  - 核心财务数字：采用清晰等宽 `font-mono font-bold`，金额与辅助文本主次分明；
- **视觉去噪**：严禁在标题中滥用装饰性 Emoji 或夸张色块，保持苹果 HIG 的极简克制。

### 3. 【全端 60FPS 丝滑轻量动效律 (Lightweight & Micro-Interactions)】
- 统一采用纯 CSS GPU 硬件加速的液态毛玻璃（`backdrop-filter: blur(20px)`）；
- 所有可点击交互元素必须配置微缩放反馈（`active:scale-[0.98]`）与触感震动（`haptic.selection()` / `haptic.toggle()`）。

### 4. 【零溢出与弹性自适应律 (Zero Overflow & Responsive Resilience)】
- 移动端单行操作按钮不得超过 3 个，复杂多功能必须采用清晰的上下双层舒展卡片（2-Tier Card）；
- 文本一律配置 `truncate` 或 `line-clamp`，杜绝任何换行挤压、横向滚动条或布局被顶开。
