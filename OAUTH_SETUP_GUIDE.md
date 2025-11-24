# Manus OAuth 設定指南

## 📋 設定步驟

### 步驟 1：註冊 Manus 帳號並創建應用程式

1. 訪問 **https://manus.im** 註冊帳號
2. 登入後，進入「應用程式管理」或「Dashboard」
3. 點擊「創建新應用程式」
4. 填寫應用程式資訊：
   - **應用程式名稱**：晨陽學習成長評核分析系統
   - **回調 URL**：`https://chenyang-learning-platform.onrender.com/api/oauth/callback`
5. 創建完成後，記下您的 **APP_ID**

---

### 步驟 2：在 Render 設定環境變數

1. 登入 Render Dashboard：https://dashboard.render.com
2. 選擇您的 Web Service：**chenyang-learning-platform**
3. 點擊左側選單的 **"Environment"**
4. 點擊 **"Add Environment Variable"** 添加以下變數：

#### 必需的環境變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `OAUTH_SERVER_URL` | `https://oauth.manus.im` | Manus OAuth 伺服器地址 |
| `VITE_APP_ID` | `您的 APP_ID` | 從 Manus 取得的應用程式 ID |
| `JWT_SECRET` | `nGpILB+1J8DSmIuMmjiFPmY94Xk7u5SQczqjl40FLzE=` | Session 簽署密鑰（已為您生成） |

#### 可選的環境變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `OWNER_OPEN_ID` | `您的 OpenID` | 設定後您會自動成為管理員 |

5. 點擊 **"Save Changes"**
6. Render 會自動重新部署您的應用程式

---

### 步驟 3：測試登入功能

1. 等待 Render 重新部署完成（約 2-3 分鐘）
2. 訪問 **https://chenyang-learning-platform.onrender.com**
3. 點擊「登入」按鈕
4. 選擇「使用 Google 登入」
5. 用您的 Google 帳號登入
6. 登入成功後會自動跳轉回系統首頁

---

## 🔑 如何取得 OWNER_OPEN_ID（可選）

如果您想讓自己自動成為管理員：

1. 先完成上述步驟 1-3，用 Google 登入一次
2. 登入後，在瀏覽器開發者工具（F12）的 Console 中執行：
   ```javascript
   document.cookie
   ```
3. 找到 `manus_session` cookie，複製其值
4. 使用 JWT 解碼工具（如 https://jwt.io）解碼這個 token
5. 在解碼後的 payload 中找到 `openId` 欄位
6. 將這個 `openId` 設定為 `OWNER_OPEN_ID` 環境變數
7. 重新部署後，您就會自動成為管理員

---

## ❓ 常見問題

### Q: 如果沒有 Manus 帳號怎麼辦？
A: 訪問 https://manus.im 免費註冊即可。

### Q: 同仁登入時會看到什麼？
A: 同仁會看到 Manus 的登入頁面，可以選擇用 Google、GitHub 等方式登入。

### Q: 登入後的權限如何管理？
A: 預設所有新用戶都是「考生」角色。您可以在系統中將特定用戶提升為「管理員」或「編輯者」。

### Q: 需要付費嗎？
A: Manus 提供免費方案，足夠一般使用。

---

## 📞 需要協助？

如果在設定過程中遇到任何問題，請隨時告訴我！
