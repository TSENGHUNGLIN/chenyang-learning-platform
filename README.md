# 晨陽學習成長評核分析系統

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TSENGHUNGLIN/chenyang-learning-platform)

## 📋 系統簡介

晨陽學習成長評核分析系統是一個功能完整的線上考試管理平台，提供從出題、考試、評分到分析的一站式解決方案。

### 核心功能

- 🔐 **使用者認證**：Google OAuth 登入，邀請制存取控制
- 👥 **權限管理**：管理員、編輯者、訪客、考生四種角色
- 📚 **題庫管理**：單選題、複選題、問答題，支援分類與標籤
- 📝 **考試管理**：線上考試、人工評分、考試監控
- 📊 **成績分析**：統計報表、圖表分析（折線圖、長條圖、雷達圖）
- 🤖 **AI 輔助**：自動分析出題，減少教師工作量
- 🌙 **深色模式**：支援淺色/深色主題切換
- 📱 **響應式設計**：完美支援手機、平板、桌面裝置

### 最新更新（v1.1.0）

- ✨ 新增成績分析圖表系統
- 📱 完善響應式設計
- 🌙 新增深色模式支援

## 🚀 快速開始

### 環境需求

- Node.js 18+
- pnpm 8+

### 安裝步驟

```bash
# 安裝依賴
pnpm install

# 初始化資料庫
pnpm db:push

# 啟動開發伺服器
pnpm dev
```

開發伺服器會在 http://localhost:3000 啟動。

### 環境變數

建立 `.env` 檔案並設定以下變數：

```env
DATABASE_URL=file:./data.db
OAUTH_SERVER_URL=https://oauth.manus.im
OWNER_NAME=您的名稱
OWNER_OPEN_ID=您的 OpenID
```

## 📦 部署

### Vercel 部署（推薦）

1. 點擊上方的「Deploy with Vercel」按鈕
2. 連接您的 GitHub 帳號
3. 配置環境變數
4. 點擊「Deploy」

### 手動部署

```bash
# 建置專案
pnpm build

# 啟動生產伺服器
pnpm start
```

## 🛠️ 技術架構

### 前端

- **框架**：React 18 + TypeScript
- **路由**：Wouter
- **狀態管理**：tRPC + React Query
- **UI 元件**：shadcn/ui
- **圖表**：Recharts
- **樣式**：Tailwind CSS

### 後端

- **框架**：Express + tRPC
- **ORM**：Drizzle ORM
- **資料庫**：SQLite
- **認證**：Manus OAuth (Google)

## 📁 專案結構

```
chenyang-learning-platform/
├── client/              # 前端程式碼
│   ├── src/
│   │   ├── components/  # React 元件
│   │   ├── pages/       # 頁面元件
│   │   ├── contexts/    # Context API
│   │   └── hooks/       # 自訂 Hooks
├── server/              # 後端程式碼
│   ├── routers.ts       # tRPC 路由
│   ├── db.ts            # 資料庫查詢
│   └── examChartData.ts # 圖表資料處理
├── drizzle/             # 資料庫結構
│   └── schema.ts        # 資料表定義
└── shared/              # 共用程式碼
    └── permissions.ts   # 權限定義
```

## 📖 文件

- [第一階段改進說明](./PHASE1_IMPROVEMENTS.md)
- [完整功能清單](./FEATURES_COMPLETE.md)
- [待辦事項](./todo.md)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

本系統為晨陽設計公司內部使用系統，版權所有。

## 📞 聯絡方式

- Email：tsenghunglin384438443844@gmail.com
- 技術支援：https://help.manus.im

---

**版本**：v1.1.0  
**最後更新**：2024年11月24日  
**維護者**：TSENGHUNGLIN
