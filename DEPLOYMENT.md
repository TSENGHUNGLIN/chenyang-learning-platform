# 晨陽學習成長評核分析系統 - Render 部署文件

## 部署資訊

### 應用程式 URL
**https://chenyang-learning-platform.onrender.com**

### 部署平台
- **平台**: Render.com (免費方案)
- **區域**: Singapore (Southeast Asia)
- **自動部署**: 已啟用 (GitHub master 分支)

### GitHub Repository
**https://github.com/TSENGHUNGLIN/chenyang-learning-platform**

---

## 技術架構

### 前端
- **框架**: React 18 + Vite
- **語言**: TypeScript
- **UI 框架**: Tailwind CSS + shadcn/ui
- **狀態管理**: TanStack Query (React Query)
- **路由**: Wouter
- **圖表**: Recharts

### 後端
- **框架**: Express.js
- **語言**: TypeScript
- **API**: tRPC
- **認證**: Passport.js + Google OAuth 2.0
- **Session**: express-session + connect-pg-simple

### 資料庫
- **類型**: PostgreSQL 18
- **ORM**: Drizzle ORM
- **主機**: Render PostgreSQL (免費方案)
- **連接**: SSL 加密連接
- **容量**: 1GB 儲存空間

### 建置工具
- **前端建置**: Vite
- **後端建置**: esbuild
- **套件管理**: pnpm

---

## 環境變數配置

### Render Web Service 環境變數

```bash
# 資料庫連接
DATABASE_URL=<從 Render PostgreSQL 服務取得>

# Google OAuth 設定
GOOGLE_CLIENT_ID=<從 Google Cloud Console 取得>
GOOGLE_CLIENT_SECRET=<從 Google Cloud Console 取得>
GOOGLE_CALLBACK_URL=https://chenyang-learning-platform.onrender.com/api/auth/google/callback

# Node 環境
NODE_ENV=production
```

---

## Google OAuth 設定

### Google Cloud Console 配置

**專案**: chenyang-learning-platform  
**OAuth 2.0 用戶端 ID**: <已在 Google Cloud Console 設定>

#### 已授權的 JavaScript 來源
- `https://chenyang-learning-platform.onrender.com`

#### 已授權的重新導向 URI
- `https://chenyang-learning-platform.onrender.com/api/auth/google/callback`

---

## 資料庫結構

### 資料表清單
- `users` - 使用者資料
- `employees` - 員工資料 (63 筆記錄)
- `exams` - 考試資料
- `exam_questions` - 考試題目
- `question_options` - 題目選項
- `assignments` - 考試指派
- `submissions` - 考試作答記錄
- `training_records` - 訓練記錄
- `session` - Session 儲存

### 資料庫遷移
使用 Drizzle Kit 進行 schema 管理：
```bash
pnpm drizzle-kit push
```

---

## 部署流程

### 自動部署
1. 推送程式碼到 GitHub master 分支
2. Render 自動偵測變更
3. 執行建置指令：`pnpm run build`
4. 啟動應用程式：`pnpm run start`

### 建置指令
```bash
# 安裝依賴
pnpm install

# 建置前端和後端
pnpm run build

# 啟動生產環境
pnpm run start
```

---

## 功能特色

### 核心功能
- ✅ Google OAuth 2.0 身份驗證
- ✅ 考試管理系統
- ✅ 員工資料管理 (63 筆員工記錄)
- ✅ 考試成績分析
- ✅ 多維度圖表分析 (折線圖、長條圖、雷達圖)
- ✅ 響應式設計 (支援手機、平板、桌面)
- ✅ 深色模式支援

### 使用者角色
- **管理員 (admin)**: 完整系統權限
- **一般使用者 (user)**: 基本功能權限

---

## 效能與限制

### Render 免費方案限制
- **冷啟動時間**: 約 50 秒 (服務閒置 15 分鐘後自動休眠)
- **運算資源**: 0.1 CPU, 512 MB RAM
- **資料庫**: 1 GB 儲存空間
- **頻寬**: 100 GB/月

### 建議
- 首次訪問需等待服務喚醒
- 適合中小型團隊使用
- 如需升級效能，可考慮付費方案

---

## 維護與更新

### 程式碼更新
```bash
# 本地開發
git add .
git commit -m "更新描述"
git push origin master

# Render 會自動部署
```

### 資料庫遷移
```bash
# 本地執行 (需要 DATABASE_URL)
pnpm drizzle-kit push
```

### 查看日誌
在 Render Dashboard → chenyang-learning-platform → Logs

---

## 問題排除

### 常見問題

#### 1. 應用程式無法啟動
- 檢查 Render Logs 查看錯誤訊息
- 確認環境變數設定正確
- 確認資料庫連接正常

#### 2. Google OAuth 登入失敗
- 確認 Google Cloud Console 的重新導向 URI 設定正確
- 檢查 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET 是否正確
- 確認 GOOGLE_CALLBACK_URL 與實際部署 URL 一致

#### 3. 資料庫連接錯誤
- 確認 DATABASE_URL 包含 `?sslmode=require` 參數
- 檢查 PostgreSQL 服務是否正常運作
- 確認資料庫憑證正確

#### 4. 冷啟動時間過長
- 這是免費方案的正常行為
- 可考慮升級到付費方案以獲得持續運行

---

## 安全性考量

### 已實施的安全措施
- ✅ SSL/TLS 加密連接
- ✅ Google OAuth 2.0 認證
- ✅ Session 加密儲存
- ✅ 環境變數保護敏感資訊
- ✅ PostgreSQL SSL 連接

### 建議的額外措施
- 定期更新依賴套件
- 實施 CORS 政策
- 添加 rate limiting
- 定期備份資料庫

---

## 聯絡資訊

**開發者**: 曾富銓  
**Email**: tsenghunglin384438443844@gmail.com  
**GitHub**: TSENGHUNGLIN

---

## 更新歷史

### 2025-11-24
- ✅ 完成 Render.com 部署
- ✅ 配置 Google OAuth 2.0 認證
- ✅ 修正資料庫 SSL 連接問題
- ✅ 修正前端登入流程
- ✅ 成功執行資料庫遷移
- ✅ 驗證 Google OAuth 登入流程

---

## Checkpoint 資訊

**Checkpoint ID**: a5fc8895  
**包含內容**:
- 完整應用程式原始碼
- 資料庫 schema 定義
- 63 筆員工資料
- 所有功能模組
- 部署配置檔案

**恢復指令**:
```bash
manus-restore-checkpoint a5fc8895
```
