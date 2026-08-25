# 极智全域个人资产与财务管理系统 (SmartWealth Pro)

> **📱 Mobile-First 原生手机端体验 • 🤖 智谱 GLM-4.6V 多模态视觉全能大脑 • 🐕 现代消费信贷与负债穿透 • 🌸 1024px 正版 App 图标 • ⚡ 端侧毫秒级压缩 • 100% 隐私安全**

---

## 🌐 线上快速体验与访问

* 🔗 **生产环境部署地址**：[`https://mnijc19-netizen.github.io/-/`](https://mnijc19-netizen.github.io/-/)
* 📘 **完整架构与交接白皮书**：请直接查阅根目录下的 [`PROJECT_SPEC_AND_HANDOVER.md`](./PROJECT_SPEC_AND_HANDOVER.md)（记录了从项目立项至今的所有用户需求、底层代码架构、Action 协议与后续接力指引）。

---

## 🌟 核心特性与创新突破

### 1. 🤖 斌斌 AI 财务全能管家 (Full-Spectrum System Controller)
- **多模态批量看图开账**：支持一次性上传微信、支付宝、京东白条、美团月付、抖音月付、花呗、银行卡与证券持仓截图，秒级识别多平台与金额。
- **可直接在卡片内现场编辑的人工确认工作流**：识别后先呈现可编辑确认卡片，现场修改平台名、切换分类、修改金额、增删条目，确认无误后一键入库。
- **直连智谱 GLM-4.6V / 4.5-Air**：使用新用户专享 600万 GLM-4.6V 资源包与 1200万 4.5-Air 资源包。

### 2. 🐕 现代消费信贷与互联网月付体系
- 全面纳入 **京东白条、美团月付、抖音月付、蚂蚁花呗、借呗、微信分付、信用卡**。
- 净资产科学公式：$\text{真实净资产} = \text{总资产} - \text{全部消费信贷待还负债}$。

### 3. 🎨 1024px 高清官方正版 App 图标矩阵
- 1:1 还原各主流软件手机桌面的正版 App 图标（美团长耳袋鼠、京东 Joy 小白狗、微信笑脸双气泡、支付宝书法支字、抖音 3D 霓虹双色音符、各大银行徽标、华泰证券钻石标）。

### 4. ⚡ 端侧毫秒级双线性图片压缩引擎
- 15ms 内等比缩放至 1280px 超清 JPEG，体积缩减 98.5%（10MB ➔ 150KB），网络传输提速 20 倍。

### 5. 📱 iPhone 硬件级一键自动化记账
- 支持 iPhone 操作按钮 (Action Button) 或轻点背面触发，通过 `?text=[URL编码]` 实现 0 步自动记账。

---

## 🚀 极速启动与本地开发

### 前端开发 (Vite + React 19 + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
构建与类型检查：
```bash
npm run build
```

---

## 📚 详细文档索引
- 📄 [完整设计架构与交接白皮书 (PROJECT_SPEC_AND_HANDOVER.md)](./PROJECT_SPEC_AND_HANDOVER.md)
- 📊 [数据类型定义 (frontend/src/types/index.ts)](./frontend/src/types/index.ts)
- 🤖 [AI 动作协议中枢 (frontend/src/services/aiAgent.ts)](./frontend/src/services/aiAgent.ts)
