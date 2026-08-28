# 📜 全域版本演进编年史 (Changelog)

All notable changes to the SmartWealth Pro project will be documented in this file.

---

## [v2.5] - 2026-08-29 (当前版本)
### Added
- **宪法式 AI 治理母版 v2.0 全面落库**：新增 `AGENTS.md`、`.cursorrules`、`docs/MASTER_CONSTITUTION.md`、`docs/SURGICAL_DISPATCH_GUIDE.md`、`docs/PROJECT_ONBOARDING.md`。
- **信贷负债与分期还款自动识别引擎**：支持从待还账单（京东白条、花呗、美团月付、信用卡）中自动提取多期还款计划，隔离日常消费与负债总额。

---

## [v2.4] - 2026-08-27
### Fixed
- **AI 思考流式打字与向上滑动冲突修复**：引入 `scrollContainerRef` 与用户手势意图感知，向上翻阅历史消息时暂停自动吸底。
- **医药健康品类精准归类升级**：新增同仁堂、大参林、博爱、省立、药房等 20+ 关键词置顶，彻底杜绝药店被错误归入餐饮。
- **AI 系统提示词假数据脱敏**：清空 System Prompt 中的示范数字，杜绝 AI 幻觉复述。
- **AI 工具库注入 `update_transaction`**：支持多轮对话中直接原地更正已有流水，杜绝重复建账。
- **端到端真人拟人化实测套件**：引入 `scripts/live_human_simulation.js`，接入真实智谱 API Key 闭环实测。

---

## [v2.3] - 2026-08-26
### Added
- **10 轮系统级全功能防回归自动化测试**：覆盖复式记账、快速调额、流水隔离、双层哈希去重、预算监控、健康度模型。
- **GitHub Gist 私有云信箱双通道容灾**：支持 API 与 Raw CDN 双路由无缝同步。

---

## [v2.0 ~ v2.2] - 2026-08-20 ~ 2026-08-25
### Added
- **移动端 Mobile-First 全面重构**：iOS 液态毛玻璃主题、底部导航坞、Universal 5-in-1 快捷记账 Action Sheet。
- **iPhone 侧键 Action Button / 轻点背面静默记账**：打通 iOS 快捷指令与 Gist 云信箱。
- **证券持仓实时行情**：接入腾讯财经行情源，支持 ETF/股票持仓自动计算市值。
