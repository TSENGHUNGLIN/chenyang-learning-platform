# macOS 風格設計系統

## 設計理念
參考 macOS Big Sur / Ventura 的設計語言，打造簡潔、優雅、精緻的使用者介面。

---

## 配色方案

### 主色調（淺色模式）
```css
--background: 0 0% 98%;           /* 淺灰白色背景 #FAFAFA */
--foreground: 0 0% 15%;           /* 深灰色文字 #262626 */

--card: 0 0% 100%;                /* 純白色卡片 #FFFFFF */
--card-foreground: 0 0% 15%;      /* 深灰色文字 */

--popover: 0 0% 100%;             /* 純白色彈出層 */
--popover-foreground: 0 0% 15%;   /* 深灰色文字 */

--primary: 211 100% 50%;          /* 蘋果藍 #007AFF */
--primary-foreground: 0 0% 100%;  /* 白色文字 */

--secondary: 0 0% 96%;            /* 淺灰色 #F5F5F5 */
--secondary-foreground: 0 0% 15%; /* 深灰色文字 */

--muted: 0 0% 96%;                /* 靜音灰 #F5F5F5 */
--muted-foreground: 0 0% 45%;     /* 中灰色文字 #737373 */

--accent: 0 0% 96%;               /* 強調灰 #F5F5F5 */
--accent-foreground: 0 0% 15%;    /* 深灰色文字 */

--destructive: 0 84% 60%;         /* 蘋果紅 #FF3B30 */
--destructive-foreground: 0 0% 100%; /* 白色文字 */

--border: 0 0% 90%;               /* 淺灰色邊框 #E5E5E5 */
--input: 0 0% 90%;                /* 淺灰色輸入框邊框 */
--ring: 211 100% 50%;             /* 蘋果藍 focus ring */
```

### 輔助色
```css
--success: 142 76% 36%;           /* 蘋果綠 #34C759 */
--warning: 35 91% 62%;            /* 蘋果橙 #FF9500 */
--info: 211 100% 50%;             /* 蘋果藍 #007AFF */
```

---

## 字體系統

### 字體家族
使用 **Inter** 字體（最接近 SF Pro 的開源字體）

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

### 字體大小
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### 字重
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 圓角

### 圓角大小
```css
--radius-sm: 0.375rem;   /* 6px - 小元素（按鈕、標籤） */
--radius-md: 0.5rem;     /* 8px - 中等元素（輸入框、卡片） */
--radius-lg: 0.75rem;    /* 12px - 大元素（對話框、面板） */
--radius-xl: 1rem;       /* 16px - 特大元素 */
--radius-2xl: 1.5rem;    /* 24px - 超大元素 */
```

---

## 陰影

### 陰影層級
```css
/* 輕微陰影 - 懸浮元素 */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* 標準陰影 - 卡片 */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* 中等陰影 - 彈出層 */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* 深度陰影 - 對話框 */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* 超深陰影 - 模態框 */
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

---

## 間距系統

### 間距規範
```css
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
```

---

## 毛玻璃效果（Frosted Glass）

### 背景模糊
```css
backdrop-filter: blur(20px) saturate(180%);
background-color: rgba(255, 255, 255, 0.72);
```

### 應用場景
- 側邊欄
- 對話框背景
- 彈出選單
- 頂部導航列

---

## 動畫與過渡

### 過渡時間
```css
--transition-fast: 150ms;
--transition-base: 200ms;
--transition-slow: 300ms;
```

### 緩動函數
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 常用過渡
```css
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 組件樣式規範

### Button
- 圓角：`--radius-md` (8px)
- 陰影：hover時 `--shadow-sm`
- 過渡：200ms
- 高度：36px (medium), 32px (small), 40px (large)
- 內距：12px 16px

### Card
- 圓角：`--radius-lg` (12px)
- 陰影：`--shadow-md`
- 背景：白色 `--card`
- 邊框：1px solid `--border`
- 內距：24px

### Input
- 圓角：`--radius-md` (8px)
- 邊框：1px solid `--input`
- Focus ring：2px `--ring`
- 高度：40px
- 內距：8px 12px

### Dialog
- 圓角：`--radius-xl` (16px)
- 陰影：`--shadow-2xl`
- 背景模糊：backdrop-filter: blur(20px)
- 最大寬度：500px (small), 700px (medium), 900px (large)

### Table
- 邊框：1px solid `--border`
- 交替行：`--muted` (偶數行)
- Hover：`--accent`
- 標題背景：`--secondary`
- 圓角：`--radius-lg` (12px)

---

## 佈局規範

### 側邊欄
- 寬度：260px
- 背景：毛玻璃效果
- 陰影：`--shadow-lg`
- 內距：24px

### 頁面容器
- 最大寬度：1400px
- 內距：32px
- 間距：24px

### 卡片間距
- 垂直間距：24px
- 水平間距：24px

---

## 圖標系統
使用 Lucide Icons（簡潔、現代、符合macOS風格）

---

## 響應式斷點
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

