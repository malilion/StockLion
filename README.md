# 🦁 StockLion（股力獅）

> **Taiwan Stock Market Browser Companion**  
> 在任何網頁快速查看台股、自選股、市場異動與快速資訊卡，不必頻繁切換看盤軟體。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![WXT](https://img.shields.io/badge/Built%20with-WXT-green.svg)](https://wxt.dev)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## 💡 核心設計原則

StockLion 遵守四條不妥協的技術與產品原則：

1. **No Backend** — 純 Chrome Manifest V3 前端架構，無中間轉發伺服器，不快取使用者資料。
2. **No Account** — 不需註冊、不需登入，安裝即可完整使用台股搜尋、自選股、個股詳情與雷達。
3. **BYO Key（Bring Your Own Key）** — 盤中即時行情金鑰由使用者自行填入，憑證僅儲存於瀏覽器本機儲存庫（`chrome.storage.local`），**絕不上傳任何伺服器，網頁 Content Script 也嚴格隔離無法讀取**。
4. **Realtime Key Gate（真實標示，拒絕偽即時）** — 
   - 未設定或未驗證金鑰時，系統顯示交易所公開盤後資訊，標示為 `○ 收盤` 或 `盤後`。
   - **只有當使用者填入並驗證有效金鑰時，系統才會標記為 `● 即時`**。
   - 絕不用延遲或盤後資料偽充即時資料欺瞞使用者。

---

## ✨ 主要功能

### 1. 📊 大盤首頁與快速行情
- 加權指數、櫃買指數即時/收盤數據、漲跌點數與百分比。
- 大盤上漲、下跌、平盤家數分布。
- 自選股即時監控列表。

### 2. 🔍 離線台股搜尋
- 支援股票代號（例如 `2330`）與公司名稱（例如 `台積電`、`聯發科`）即時模糊搜尋。
- 內建上市、上櫃與主要 ETF 股票代碼字典，搜尋完全離線進行，極速無延遲。

### 3. ⭐ 自選股（Watchlist）
- 一鍵將標的加入/移除自選。
- 即時狀態切換：有 Key 時自動啟用定時輪詢；無 Key 時呈現每日收盤價與漲跌。
- 自選資料完全存於本地 Chrome Storage。

### 4. 📈 個股深度資訊（Stock Detail）
- **即時/收盤行情**：開盤、最高、最低、收盤、成交量、漲跌幅。
- **基本面指標**：本益比 (PE)、股價淨值比 (PB)、現金殖利率。
- **籌碼與營收**：外資、投信、自營商三大法人買賣超統計、月營收及年增率。
- **風險標記**：注意股票、處置股票（加註警示標籤避免追高踩雷）。

### 5. 🔥 市場異動雷達（Stock Radar）
- **爆量股**：成交量較前日大幅放大之標的。
- **漲跌幅排行**：精選市場強勢漲停與弱勢跌停個股。
- **注意/處置股名單**：交易所最新公布之注意股與處置股彙整。

### 6. 🦁 網頁股票卡（Stock Peek）
- 在支援的財經與社群網站（PTT Stock 板、Yahoo 股市、鉅亨網、Threads、經濟日報、工商時報等）中瀏覽文章時，游標懸停在股票代號或名稱上即刻浮出卡片（HoverCard）。
- 卡片內可直接檢視最新報價、漲跌、PE/PB，並可直接點擊「⭐ 加入自選」或「查看詳細」。
- 具備 60 秒本地快取防重複請求，嚴格的上下文白名單與 DOM 防抖掃描機制。

### 7. 🔔 智慧到價警示（Price & Volume Alerts）
- 支援目標價突破/跌破、漲跌幅到達、爆量等多元條件。
- **門檻跨越防重複通知（Threshold Crossing De-dup）**：價格跨越門檻僅觸發一次，避免在門檻邊緣反覆跳出擾人通知。
- **重要提醒**：受 Chrome Manifest V3 擴充套件生命週期機制限制，背景警示檢查係透過 `chrome.alarms` 定時輪詢進行，為**分鐘級（約每分鐘檢查一次）**，並非秒級 WebSocket 連線，適合波段與重要價位防守提醒。

---

## 🔑 BYO Key 設定教學（免費取得富果 API Key）

StockLion 在**不填寫任何 API Key** 的情況下即可正常使用所有盤後與公開資訊功能。若您需要看盤時間的「盤中即時行情」，請透過富果官方管道取得免費 Token：

1. **前往註冊/登入**：前往 [富果開發者中心](https://developer.fugle.tw/marketdata/document/token)。
2. **免開證券戶**：只需手機門號或 Email 註冊富果帳號即可，**無需開設玉山證券戶**。
3. **申請金鑰**：在開發者中心點擊「行情 API 金鑰申請」，即可取得免費的個人 API Key（Token）。
4. **免費額度**：免費方案即享有 60 次/分鐘的請求額度，足夠個人自選股即時監看。
5. **填入套件**：點擊 StockLion 右上角設定圖示 ⚙️，將 API Key 貼上並點選「測試並儲存金鑰」，驗證成功後立即解鎖 `● 即時` 標示與即時到價警示。

---

## 🔒 隱私與安全性保證

```text
No backend. No account. No telemetry.
Your API keys never leave your browser.

StockLion does not collect brokerage credentials
or personal financial information.
```

- **零伺服器儲存**：StockLion 沒有任何後端伺服器，不儲存任何使用者自選清單、金鑰或瀏覽紀錄。
- **零分析與遙測**：完全無埋設 Google Analytics、Sentry 或任何第三方 Tracking 代碼。
- **權限嚴格控管**：
  - `storage`：僅儲存本地自選清單、警示規則與 API Key。
  - `alarms` & `notifications`：僅用於分鐘級背景警示輪詢與桌面通知推送。
  - `host_permissions`：僅允許連線至臺灣證交所與櫃買中心公開 API；富果 API 設為 `optional_host_permissions`。
  - **嚴格避免 `<all_urls>`**：Content Script 僅在指定財經社群網址生效。

---

## 📊 資料來源與授權條款（Data Sources & Licensing）

- **公開開放資料 (Open Data)**：
  - 臺灣證券交易所 (TWSE) 開放資料平台：`https://openapi.twse.com.tw/`
  - 證券櫃檯買賣中心 (TPEx) 資訊平台：`https://www.tpex.org.tw/`
  - 依政府資料開放授權條款（Open Government Data License）取得並於本機整理呈現。
- **即時行情資料 (Realtime Market Data)**：
  - 由使用者自行申請之富果行情 API (Fugle Market Data API) 提供。
  - 資料授權關係直接成立於使用者與富果資訊股份有限公司之間，StockLion 不轉發、不二次分發、不從中快取儲存。

---

## ⚖️ 免責聲明（Disclaimer）

> StockLion 提供之資訊僅供個人學習與資訊整理用途，不構成任何形式的投資建議、招攬或買賣邀約。
> 
> 金融市場資料可能受網路連線、交易所傳輸或資料源延遲影響而產生誤差，實際成交資訊與帳務明細請務必以臺灣證券交易所、證券櫃檯買賣中心及您的往來證券商官方系統公告為準。使用者依本套件資訊所為之任何投資決策與投資結果，須自行承擔全部損益與風險，開發者概不負任何法律與財務責任。

---

## 🛠️ 開發與建置（Development）

本專案採用現代化擴充套件架構 [WXT](https://wxt.dev) 開發：

```bash
# 安裝依賴套件
pnpm install

# 啟動開發熱重載模式 (Chrome MV3)
pnpm dev

# 型別檢查
pnpm typecheck

# 執行全套單元測試 (Vitest)
pnpm test

# 打包生產版本（產物輸出至 .output/chrome-mv3）
pnpm build
```

---

## 📄 License

[MIT License](LICENSE) © 2026 StockLion Contributors
