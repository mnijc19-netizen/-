# 🎯 SURGICAL_DISPATCH_GUIDE.md — 手术级极速调度指南

> **核心用途**：在开发新功能或修复 Bug 时，直接根据 `[OP-XXX]` 操作编号查表定位靶向文件，精准作业，严禁全仓盲搜！

---

## 📋 手术级操作调度靶向表

| 操作编号 | 业务场景 / 目标 | 核心靶向文件 (锁定 2~3 个) | 验证测试指令 |
| :--- | :--- | :--- | :--- |
| **`[OP-001]`** | 资产账户与调额对账 | `frontend/src/components/AccountBalanceAdjustModal.tsx`<br>`frontend/src/services/localStore.ts` | `node scripts/ci_self_check.js` (R1, R2) |
| **`[OP-002]`** | 交易流水增删改与去重 | `frontend/src/api/client.ts`<br>`frontend/src/services/localStore.ts` | `node scripts/ci_self_check.js` (R3, R4) |
| **`[OP-003]`** | 信贷负债与分期还款规划 | `frontend/src/services/repaymentScheduler.ts`<br>`frontend/src/pages/PlannerPage.tsx` | `node scripts/ci_self_check.js` (R6) |
| **`[OP-004]`** | 智能票据与正则/NLP解析 | `frontend/src/services/smsParser.ts`<br>`frontend/src/services/urlAutoIngest.ts` | `node scripts/ci_self_check.js` (R8, R9) |
| **`[OP-005]`** | AI 对话管家与工具调用 | `frontend/src/components/AiChatAssistantModal.tsx`<br>`frontend/src/services/aiAgent.ts` | `node scripts/live_human_simulation.js` |
| **`[OP-006]`** | GitHub Gist 云信箱同步 | `frontend/src/services/githubGistSync.ts`<br>`frontend/src/components/IphoneShortcutModal.tsx` | `node scripts/ci_self_check.js` (R7) |
| **`[OP-007]`** | 证券基金与实时行情更新 | `frontend/src/services/marketData.ts`<br>`frontend/src/components/BatchBalanceOcrModal.tsx` | `npm test` |
| **`[OP-008]`** | 移动端 UI/液态毛玻璃样式 | `frontend/src/components/MobileBottomNav.tsx`<br>`frontend/src/index.css` | `npm run build` |

---

## ⚡ 手术级作业 3 步工作流

1. **定位 (Targeting)**：根据用户指令，在上方表格中匹配对应的 `[OP-XXX]` 编号，直接打开靶向文件；
2. **纯净修改 (Atomic Edit)**：严格按照 5 层洋葱架构分层修改，严禁跨层污染；
3. **闭环自检 (Verification)**：运行对应的测试命令，确认 100% 通过后提交 Git 物理留痕。
