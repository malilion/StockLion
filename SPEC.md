# StockLion（股力獅）v2.1 Implementation Spec

> 版本：v2.1（2026-09）  
> 文件類型：Implementation Spec / 可直接交付 Codex 實作  
> v2.1 重點：**即時行情強制 Key Gate**、資料模型與型別契約、Background Message Protocol、Storage Schema、WXT 目錄、錯誤模型、快取策略、測試策略、Phase 驗收條件與 Codex TASK。
> 延續 v2 原則：資料來源授權策略、Provider 分層架構、BYO Key 憑證設計、MV3 技術限制。

## 1. 專案概述

**專案名稱：** StockLion（股力獅）
**英文名稱：** Taiwan Stock Market Browser Companion
**產品定位：** 台股快速看盤、自選股、快速資訊卡、異動雷達與通知型瀏覽器套件；**盤中即時行情必須由使用者設定自己的行情 API Key 才能啟用**。

### 一句話定位

> 在任何網頁快速查看台股、自選股、籌碼、重大訊息與市場異動，不必一直切到券商 App。

StockLion 不只是把股票報價塞進瀏覽器 Popup，而是打造一個「瀏覽網頁時隨時可叫出的台股情報中心」。

### 核心設計原則

本專案有三條不可妥協的原則，所有技術決策都以此為準：

1. **No backend** — 第一版不架任何伺服器，不做資料轉發
2. **No account** — 不需註冊、不需登入即可使用完整核心功能
3. **BYO Key** — 所有需要金鑰的服務，一律由使用者自行申請並存於本機
4. **Realtime requires a valid Key** — 任何標示為「即時」的行情、日內走勢與即時 Alert，都必須由具備 `quote:realtime` / `chart:intraday` 能力且已驗證成功的 Provider 提供；沒有 Key 時禁止用盤後資料冒充即時

這四條共同約束成本、隱私、資料授權與 UI 誠實性（詳見第 4～6、28～35 章）。

---

## 2. 專案目標

### MVP 目標

第一版先完成：

- 上市、上櫃股票搜尋
- 股票快速資訊卡
- 自選股 Watchlist
- 大盤資訊
- 股價走勢
- PE / PB / 殖利率
- 注意股 / 處置股提示
- 網頁股票代號與公司名稱 Hover Card

### 長期目標

後續逐步加入：

- 三大法人
- 月營收
- 股利資訊
- 價格提醒
- 爆量雷達
- 法人連買雷達
- 重大訊息
- AI 新聞摘要
- AI 個股摘要
- 跨裝置同步
- 投資組合
- 行情資料 Provider 切換

### 2.1 即時行情硬性規則（v2.1）

StockLion 在 v2.1 將「即時」視為一種**需要憑證解鎖的 capability**，而不是預設能力。

| 狀態 | 可顯示資料 | UI 標示 | 是否允許寫「即時」 |
|---|---|---|---|
| 未設定行情 Key | TWSE / TPEx Open Data、盤後 / 前一交易日資料 | `○ 09/04 收盤`、`盤後` | **否** |
| Key 尚未驗證 | 同上 | `尚未啟用即時行情` | **否** |
| Key 驗證失敗 | 同上 | `行情 Key 無效` | **否** |
| Key 驗證成功 + Provider 支援 | 盤中行情 | `● 即時` | **是** |
| Provider 429 / 暫時不可用 | 使用最後一次成功值或降級盤後資料 | `暫時延遲` / `盤後` | **否** |

**不可妥協的實作規則：**

1. `Quote.freshness === 'realtime'` 只能由宣告 `quote:realtime` capability 的 Provider 回傳。
2. `Quote.freshness === 'realtime'` 時必須同時具有有效 `source`、`asOf` 與 `receivedAt`。
3. OpenDataProvider 永遠不得回傳 `freshness: 'realtime'`。
4. UI 不自行判斷資料是否即時，只讀 Domain Model 的 `freshness`。
5. 未設定 Key 時，Watchlist、Stock Detail、Stock Peek 仍可完整運作，但報價一律標為盤後 / 前一交易日。
6. Price Alert 若規則要求即時價格，未啟用行情 Key 時不得建立；應顯示設定引導。

---

## 3. 核心功能

## 3.1 市場首頁

瀏覽器右上角點擊 StockLion Icon 後，顯示快速市場資訊。

```text
┌──────────────────────────┐
│ 🦁 StockLion      🔍 2330 │
├──────────────────────────┤
│ 加權指數                 │
│ 24,568 ▲ 1.32%           │
│ ███████████████▌         │
├──────────────────────────┤
│ ⭐ 我的自選               │
│                          │
│ 2330 台積電      +1.8%   │
│ 2317 鴻海        -0.4%   │
│ 2454 聯發科      +2.1%   │
│ 0050 元大台灣50  +0.7%   │
├──────────────────────────┤
│ 🔥 今日異動               │
│ 爆量 │ 漲停 │ 跌停 │ 處置 │
└──────────────────────────┘
```

### 主要分頁

| 分頁 | 功能 |
|---|---|
| 市場 | 大盤、上櫃、漲跌家數、成交量 |
| 自選 | 自選股票行情 |
| 雷達 | 爆量、漲跌幅、注意股、處置股 |
| 搜尋 | 股票代號 / 公司名稱快速搜尋 |

### 報價狀態標示

報價來源只有兩條合法路徑：**已驗證行情 API Key → 可顯示即時；未設定 / 未驗證 Key → 只能顯示盤後或前一交易日資料**。每個報價區塊都必須明確標示資料狀態：

```text
2330 台積電  $1,105 ▲ 1.8%   ● 即時
2330 台積電  $1,085 ▲ 0.9%   ○ 09/04 收盤
```

不可以讓使用者誤以為看到的是即時價格。

---

## 3.2 股票搜尋

支援：

- 股票代號
- 公司名稱
- 模糊搜尋
- 上市 / 上櫃分類
- ETF

例如：

```text
搜尋：台積

2330 台積電
2330R 台積電相關商品
```

股票清單來自交易所公開的證券編碼資料，定期更新後存於本機，搜尋完全離線進行。

---

## 3.3 股票快速資訊卡

點選個股後顯示：

```text
2330 台積電

$XXXX
▲ XX + X.XX%

開盤    XXX
最高    XXX
最低    XXX
成交量  XX,XXX

PE      XX.X
PB      X.X
殖利率  X.XX%

⭐ 加入自選
→ 查看詳細資訊
```

---

## 3.4 Stock Peek

StockLion 最具特色的功能之一，**同時也是技術風險最高的功能**。

當使用者瀏覽 Threads、新聞網站、PTT、Dcard、Google 搜尋、財經文章時，Content Script 自動辨識股票名稱與股票代號，滑鼠 Hover 後顯示資訊卡：

```text
┌──────────────────────────┐
│ 2330 台積電               │
│                          │
│ $1,XXX       ▲ X.XX%     │
│                          │
│ 開 XXX   高 XXX           │
│ 低 XXX   量 XX,XXX        │
│                          │
│ PE       XX.X             │
│ PB       X.X              │
│ 殖利率   X.XX%            │
│                          │
│ ⭐ 加入自選   → 詳細資訊   │
└──────────────────────────┘
```

### ⚠️ 誤判問題（MVP 必須限縮）

原始構想是「全網頁文字掃描 + Dictionary 比對」，但實務上會產生大量誤判：

**代號誤判**
四位數字在網頁上隨處可見：年份、價格、樓層、電話、訂單編號、統編。`2330` 與 `2024` 在純數字比對下無法區分，會讓整個頁面佈滿假的 highlight。

**名稱誤判**
「聯電」「台塑」「中華電」在一般文章中常指公司而非股票；短名稱如「大同」「統一」「東元」誤判更嚴重。

**效能問題**
`<all_urls>` + 全文 TreeWalker 掃描，在 Threads、Dcard 這類大型 SPA 會明顯拖慢頁面。

### MVP 限縮策略

| 項目 | MVP | V2 |
|---|---|---|
| 適用範圍 | 財經網站白名單 | 使用者可自行新增網域 |
| 觸發條件 | 代號 + 鄰近財經關鍵字 | 放寬 |
| 名稱辨識 | 僅完整公司名 | 加入常用簡稱 |

**白名單初期範圍**：PTT Stock 板、Yahoo 股市、鉅亨網、工商時報、經濟日報、Threads。

**Context 判斷**：觸發前檢查鄰近文字是否含「股 / 漲 / 跌 / 收盤 / 元 / 台幣 / $ / 買 / 賣」等關鍵字，否則不 highlight。

**效能防護**：
- `IntersectionObserver` 只掃可視區
- `requestIdleCallback` 分批處理
- `MutationObserver` 加 debounce
- 跳過 `input / textarea / contenteditable / script / style / code / pre`
- 單頁掃描節點數設上限，超過即停止

---

## 3.5 個股詳細頁

```text
2330 台積電
台灣積體電路製造

$XXXX
▲ XX + X.XX%

[1D] [5D] [1M] [3M] [1Y]

      ╭──╮
   ╭──╯  ╰╮
───╯       ╰──────
```

### 基本面

- 本益比 PE
- 股價淨值比 PB
- 殖利率
- 市值
- 每股盈餘 EPS
- 月營收

### 法人

- 外資
- 投信
- 自營商
- 三大法人合計

### 市場狀態

- 正常交易
- 注意股
- 處置股
- 漲停
- 跌停

### 最新資訊

- 重大訊息
- 月營收
- 財報
- 除權息

---

## 3.6 Stock Radar 台股雷達

```text
🔥 Stock Radar

爆量排行
━━━━━━━━━━━━
3017 奇鋐       245%
2382 廣達       198%
3231 緯創       187%

法人連買
━━━━━━━━━━━━
2330 台積電      5 日
2454 聯發科      4 日
2308 台達電      3 日

⚠️ 注意
━━━━━━━━━━━━
XXXX ○○科技    注意股
XXXX △△科技    處置股
```

### 雷達分類

- 今日漲幅
- 今日跌幅
- 成交量排行
- 爆量排行
- 漲停股
- 跌停股
- 注意股
- 處置股
- 法人連買
- 法人連賣

> Radar 全部使用交易所公開資料（盤後更新），**不需要 API Key**。這是「免設定也完整可用」的重要組成。

---

## 3.7 自選股 Watchlist

支援：

- 加入自選股
- 移除
- 拖曳排序
- 分組
- 快速查看漲跌幅

範例：

```text
⭐ AI / 半導體

2330 台積電
2454 聯發科
3443 創意

⭐ ETF

0050 元大台灣50
006208 富邦台50
```

---

## 3.8 Price Alert

使用者可以設定：

```text
2330 台積電

價格
☑ >= 1500
☐ <= 1300

漲跌幅
☐ +5%
☐ -5%

成交量
☐ > 5 日均量 2 倍
```

Browser Notification：

```text
🦁 StockLion

2330 台積電
已突破 $1,500

今日 +3.21%
```

### ⚠️ 觸發粒度限制

受 Manifest V3 Service Worker 生命週期限制（詳見第 13 章），Alert 實際是**分鐘級**而非秒級：

- Service Worker 閒置 30 秒即被回收
- `chrome.alarms` 最小間隔為 30 秒（Chrome 120+）

因此 Alert 必須定位為「到價提醒」而非「即時觸發」，README 與設定頁都要明確說明，避免使用者誤認為 bug。

後續可以加入：

- 注意股通知
- 處置股通知
- 法人連買通知
- 月營收公布
- 財報公布
- 除權息提醒

---

## 4. 資料來源與授權策略

> **這是本專案最關鍵的一章。** 技術難題都有解法，授權問題沒解好會讓整個產品無法發布。

### 4.1 交易所資料的授權現況

臺灣證券交易所的使用條款明確規範：

- **禁止**透過自動化裝置、指令碼、爬蟲程式或擷取程式等方式下載本網站之軟體或資料
- **例外**：已授權「政府資料開放平臺」提供公眾使用之資料不在此限
- 集中市場交易資訊之智慧財產權屬證交所所有，**加值後提供傳輸、傳播或供他人使用者，均應取得同意並簽訂書面契約**
- 即時股價指數資訊需另行申請，依收費標準計費

### 4.2 各資料來源評估

| 來源 | 內容 | 授權狀態 | 採用 |
|---|---|---|---|
| `openapi.twse.com.tw` | 前一交易日 / 前月資料、PE/PB/殖利率、注意處置、法人、月營收 | ✅ Open Data，明確排除在禁止範圍外 | **預設來源** |
| TPEx OpenAPI | 上櫃對應資料 | ✅ Open Data | **預設來源** |
| `mis.twse.com.tw` | 盤中即時報價 | ❌ 非 Open Data，屬網站內部 API；限流 5 秒 3 次 | 不採用 |
| 富果 Fugle 行情 API | 盤中即時報價、快照、歷史 | ✅ 由時報資訊與 Fugle 提供，資料源為證交所 / 櫃買 / 期交所 | **即時來源** |
| 永豐 Shioaji | 即時報價 | ✅ 授權正當，但 Python only、需開戶憑證、禁止盤中輪詢 snapshots | 不適用 |
| FinMind | 即時報價、多種資料集 | ⚠️ 本身亦為彙整取得，授權地位未優於自行抓取 | 僅開發備援 |
| Yahoo Finance / yfinance | 報價、歷史 | ❌ 官方 API 已於 2017 關閉；現存端點為逆向工程，需 cookie + crumb，依 IP 限流；且 Yahoo 台股資料係向精誠資訊取得授權，再抓取等同二次違約 | 僅本機開發用 |

### 4.3 為什麼不能自己架 Proxy

一個常見的想法是「我申請一把 key，架後端 proxy 統一供應」。**這是最糟的選擇**：

1. **法律上直接踩線** — 把取得的行情資料轉發給不特定第三人，正是「不得將交易資訊轉接至他處」所禁止的行為。原本乾淨的授權鏈會被這一層 proxy 弄髒。
2. **成本失控** — Rate limit 是綁在 key 上的全體共用額度，使用者一多必然需要升級付費方案，且永遠追不上。
3. **責任上身** — 你要負責 uptime、濫用防治、資料正確性。

繞一圈之後，反而回到原本想避開的問題。

### 4.4 結論：BYO Key

**所有需要金鑰的服務，一律由使用者自行申請。**

這讓 StockLion 在法律上的定位是「一個代使用者呼叫他自己帳號 API 的 client 工具」，與一般 REST client 無異。這是最安全也最標準的做法。

| | 開發者提供 key + proxy | 使用者自備 key |
|---|---|---|
| Rate limit | 全體共用，必然耗盡 | 每人各自享有完整額度 |
| 月費 | NT$1,499 ~ 2,999 起 | 0 |
| 後端 | 需架設維運 | 不需要 |
| 授權關係 | 開發者 → 轉發他人（禁止） | 使用者 ↔ 供應商（直接） |
| 產品定位 | 資訊轉接商 | Client 工具 |

### 4.5 富果 Fugle 行情 API 說明

**申請門檻：不需開立證券戶。** 註冊富果會員（手機號碼或 email）即可免費申請行情 API Key。

> 注意：網路上多數教學仍寫「需玉山證券富果帳戶」，那是舊規則，已不適用。

申請流程：登入富果帳號 → 開發者文件「行情」頁 → 右上角「金鑰申請」 → 取得 token。亦可先用 demo token 試打端點。

**免費方案（基本用戶）額度**

| 項目 | 免費 | 開發者 NT$1,499/月 | 進階 NT$2,999/月 |
|---|---|---|---|
| 日內行情 API | 60 次/分 | 600/min | 2000/min |
| WebSocket | 5 訂閱 / 1 連線 | 300 訂閱 / 2 連線 | 2000 訂閱 / 2 連線 |
| 行情快照 | ✘ | ✔ | ✔ |
| 盤後籌碼 | ✘ | ✔ | ✔ |

**架構決策：走 REST 輪詢，不走 WebSocket。**
免費層僅 5 個訂閱數，自選股超過 5 檔就會失效。改用 REST 每 5 秒輪詢一次僅消耗 12 次/分，在 60 次/分額度內有充足餘裕。

**風險備註**：富果「交易 API」已於 2025/11 停止更新（下單需求轉往合作券商 SDK）。「行情 API」是不同產品且持續維護中，但單一供應商風險仍需靠 Provider 抽象層來隔離。

---

## 5. Provider 分層架構

### 5.1 分層設計

```text
OpenDataProvider   預設，零設定
  └── openapi.twse / TPEx OpenAPI
      前日收盤、PE / PB / 殖利率
      注意股 / 處置股、三大法人、月營收
      Radar 全部資料

FugleProvider      使用者填入 API Key 後解鎖
  └── 盤中即時報價、日內快照、日內走勢

MockProvider       開發測試用
  └── 本機 JSON fixture
```

### 5.2 Capability 導向

功能宣告自己需要什麼**能力**，而非需要哪個 **provider**。這樣未來換供應商時 UI 完全不用改動。

```ts
type Capability =
  | 'quote:eod'        // 前日收盤 — OpenData 提供，永遠可用
  | 'quote:realtime'   // 盤中即時 — 需 Fugle key
  | 'chart:intraday'   // 分時走勢 — 需 Fugle key
  | 'ai:summary'       // AI 摘要 — 需 LLM key

interface QuoteProvider {
  readonly id: string
  readonly capabilities: readonly Capability[]
  getQuote(symbol: string): Promise<Quote>
  getQuotes(symbols: string[]): Promise<Quote[]>
}
```

### 5.3 UI 層自動降級

```vue
<RequiresCapability cap="quote:realtime">
  <RealtimeQuote :symbol="symbol" />
  <template #fallback>
    <EodQuote :symbol="symbol" />
    <SetupHint capability="quote:realtime" />
  </template>
</RequiresCapability>
```

`SetupHint` 向 registry 查詢「哪些 provider 能提供此 capability」，顯示對應的申請引導。日後新增行情商只需註冊進 registry，所有相關 UI 自動出現新選項。

### 5.4 免 Key 路徑必須是完整產品

**這不是試用版，是一條要能永久使用的路徑。**

未設定任何 Key 的使用者仍可完整使用：

- ✅ 股票搜尋
- ✅ 自選股 Watchlist（顯示前一交易日收盤）
- ✅ 個股基本面（PE / PB / 殖利率 / EPS / 月營收）
- ✅ 注意股 / 處置股狀態
- ✅ Stock Radar 全功能
- ✅ Stock Peek Hover Card
- ✅ 三大法人資料
- ⭕ 報價為前一交易日，明確標示

僅以下功能需要 Key：

- 盤中即時報價
- 日內分時走勢
- 即時觸發的 Price Alert
- AI 摘要（V3）

---

## 6. BYO Key 與 Credential 設計

> 本章的實作建議抽成共用 package，供 Malilion Browser Tools 系列其他套件（如 ContextLion）重複使用。

### 6.1 CredentialSpec

```ts
interface CredentialSpec {
  id: string
  label: string
  fields: {
    name: string
    label: string
    secret: boolean
    placeholder?: string
  }[]
  applyUrl: string                          // 申請教學連結
  capabilities: Capability[]
  validate(creds: Credentials): Promise<ValidateResult>
}
```

### 6.2 AI 供應商：只支援 OpenAI-compatible

不要為 OpenAI / Anthropic / Gemini 各寫一套 SDK。只收三個欄位：

```text
Base URL:  https://api.openai.com/v1
API Key:   sk-...
Model:     gpt-4o-mini
```

一組介面即可支援 OpenAI、OpenRouter、Groq、DeepSeek，以及本機的 Ollama 與 LM Studio。對開發者受眾特別合適，且大幅降低維護成本。

### 6.3 安全實作要點

**Key 絕對不進 Content Script**
Stock Peek 的 Hover Card 一律透過 `sendMessage` 請 Background 代為請求。Content Script 注入在任意網頁上，即使有 isolated world 隔離，把憑證放在那裡仍是不必要的暴露面。

**存 `chrome.storage.local`，不使用 `sync`**
`sync` 會同步至 Google 帳號，增加暴露面，且有 8KB/item、100KB 總量限制。

**存檔前先驗證**
使用者按下儲存時，立即呼叫最低成本的端點（如 `/intraday/ticker/2330`）驗證。401 當場攔截並提示，不要讓使用者以為設定成功、隔天開盤才發現空白。

**嚴格區分 401 與 429**

| 狀態 | 處理 |
|---|---|
| 401 / 403 | 標記金鑰失效 → 顯示一次性通知 → 停止輪詢 |
| 429 | 指數退避重試，**不標記失效** |

兩者混用是常見 bug，會讓使用者誤以為 key 損壞而重新申請。

**匯出設定預設排除金鑰**
提供「包含 API Key」選項，但預設關閉。

### 6.4 設定頁引導文案

```text
盤中即時報價需要富果行情 API Key（免費，不需開戶）

1. 前往 fugle.tw 註冊富果會員
2. 登入後至開發者文件 → 行情 → 金鑰申請
3. 將 token 貼在下方

不設定也能正常使用 StockLion，
報價將顯示前一交易日收盤價。
```

---

## 7. 技術架構

```text
StockLion
│
├── Chrome Extension
│   ├── WXT
│   ├── Vue 3
│   ├── TypeScript
│   ├── Pinia
│   └── Tailwind CSS
│
├── Popup
│   ├── Market
│   ├── Watchlist
│   ├── Radar
│   ├── Search
│   └── Settings（Credential 管理）
│
├── Content Script
│   ├── 股票名稱辨識
│   ├── 股票代號辨識
│   ├── Context 過濾
│   └── Hover Card（不持有 Key）
│
├── Background Worker
│   ├── Credential Store
│   ├── Provider Registry
│   ├── 股票 API（唯一對外請求出口）
│   ├── Alert
│   ├── Notification
│   └── Cache
│
├── Storage
│   ├── chrome.storage.local
│   └── chrome.storage.sync（僅小型偏好設定）
│
└── Data Layer
    ├── OpenDataProvider（TWSE / TPEx OpenAPI）
    ├── FugleProvider（BYO Key）
    └── MockProvider
```

---

## 8. 技術選型

### Frontend

- Vue 3
- TypeScript
- Pinia
- Tailwind CSS

### Extension

- **WXT**（原規劃為 CRXJS，已變更）
- Manifest V3
- Chrome Extension API

> **變更理由**：Malilion Browser Tools 系列已統一採用 WXT。CRXJS 維護狀況較不穩定，WXT 的多瀏覽器 build 支援也較完整。統一工具鏈可直接重用既有模板與 CI，六個 extension 亦可抽出共用 package（UI kit、storage wrapper、message bus、credential store）。

### Charts

推薦：**Lightweight Charts**

原因：適合股票走勢、輕量、效能佳、TradingView 生態。

備選：Apache ECharts、Chart.js。

> 若想省下歷史資料處理成本，個股詳細頁亦可考慮直接嵌入 TradingView Widget（合法嵌入，但無法取得原始數據，不能用於 Alert 與 Radar 計算）。

---

## 9. Storage 設計

### chrome.storage.local

適合：

- 自選股與分組
- API Credentials
- UI 設定
- Alert 設定
- 最近搜尋
- 股票清單快取
- 日 K 快取

### chrome.storage.sync

**僅適合小型偏好設定**：

- Theme
- 漲跌色模式（Taiwan / Global）
- 顯示密度

> ⚠️ `sync` 有 8KB/item、100KB 總量與每小時寫入次數限制。**Watchlist 不可放 sync**，分組較多的使用者容易超標。Credentials 亦不放 sync。

### IndexedDB

**第一版不使用。**

`chrome.storage.local` 目前配額為 10MB，存放日 K 與 API 快取綽綽有餘。IndexedDB 待實際遇到瓶頸再導入，避免過度設計。

第一版不需要後端資料庫。

---

## 10. API Layer

```text
src/services/

stock/
├── quote.ts
├── stock.ts
├── market.ts
├── fundamental.ts
├── institutional.ts
├── alert.ts
└── radar.ts
```

Provider：

```text
src/providers/

quote/
├── QuoteProvider.ts        # interface + Capability
├── ProviderRegistry.ts
├── OpenDataProvider.ts     # TWSE + TPEx OpenAPI
├── FugleProvider.ts        # BYO Key
└── MockProvider.ts

credentials/
├── CredentialSpec.ts
├── CredentialStore.ts
└── specs/
    ├── fugle.ts
    └── openaiCompatible.ts
```

---

## 11. Extension 架構

```text
src/

├── popup/
│   ├── App.vue
│   ├── views/
│   │   ├── Market.vue
│   │   ├── Watchlist.vue
│   │   ├── Radar.vue
│   │   ├── Search.vue
│   │   └── Settings.vue
│   │
│   └── components/
│       ├── RequiresCapability.vue
│       └── SetupHint.vue
│
├── content/
│   ├── stockDetector.ts
│   ├── contextFilter.ts
│   ├── hoverCard.ts
│   └── content.ts
│
├── background/
│   ├── worker.ts
│   ├── messageRouter.ts
│   ├── alert.ts
│   └── notification.ts
│
├── stores/
│   ├── stock.ts
│   ├── watchlist.ts
│   ├── credentials.ts
│   └── settings.ts
│
├── services/
│
├── providers/
│
├── components/
│
└── types/
```

---

## 12. Stock Entity Detector

頁面解析流程：

```text
Web Page
   ↓
白名單網域檢查
   ↓
Content Script
   ↓
可視區節點掃描（IntersectionObserver）
   ↓
股票名稱 / 代號 Dictionary 比對
   ↓
Context 關鍵字過濾
   ↓
Highlight
   ↓
Hover
   ↓
sendMessage → Background 取報價
   ↓
Stock Peek
```

股票 Dictionary：

```ts
{
  "2330": "台積電",
  "2317": "鴻海",
  "2454": "聯發科"
}
```

可以定期從官方股票清單更新。

---

## 13. Manifest V3 技術限制與因應

### 13.1 Service Worker 生命週期

| 限制 | 影響 | 因應 |
|---|---|---|
| 閒置 30 秒被回收 | 全域變數消失 | 所有狀態寫入 `chrome.storage`，不依賴記憶體 |
| `chrome.alarms` 最小 30 秒 | Alert 無法秒級觸發 | 定位為分鐘級到價提醒，文件說明清楚 |
| 無法維持長連線 | WebSocket 串流不穩 | 採 REST 輪詢，本來就符合免費層額度 |

### 13.2 CORS

**MV3 的 Content Script 不再繼承 extension 的跨域豁免。**

因此：

- 所有 `fetch` 一律在 Background Service Worker 執行
- Content Script 透過 `sendMessage` 取得資料
- 這條規則同時解決了「Key 不進 Content Script」的安全需求

### 13.3 輪詢策略

- 一次請求涵蓋整個 Watchlist，不要每檔一支請求
- 節流 ≥ 5 秒
- **僅在 Popup 開啟時輪詢**，關閉即停止
- 判斷交易時段（平日 09:00–13:30），盤後直接讀快取
- 非交易日完全不發請求

---

## 14. UI 設計方向

### 風格

```text
Dark Finance
+
Lion Branding
+
Glassmorphism
```

主色方向：

- 深藍
- 黑色
- 金色
- 暖黃

### 漲跌色

支援台股習慣：

```text
紅色 = 上漲
綠色 = 下跌
```

並提供設定：

```text
Taiwan Mode
Global Mode
```

避免海外使用者不習慣。

---

## 15. MVP 開發階段

> **順序已調整**：Stock Peek 是最大差異化功能，同時也是最大技術風險，因此將其技術驗證提前。避免完成四個 Phase 後才發現核心賣點做不好。

## Phase 1：Extension Skeleton

- [ ] 建立 WXT + Vue 3 Extension
- [ ] Manifest V3
- [ ] Popup
- [ ] Background Worker
- [ ] Content Script
- [ ] Chrome Storage
- [ ] Message Router

---

## Phase 1.5：Stock Peek Spike（新增｜throwaway）

**目的：在投入主要開發前，驗證核心賣點是否可行。**

- [ ] 最陽春的 detector（代號 + 完整公司名）
- [ ] 在 PTT Stock 板實測誤判率
- [ ] 在 Threads 實測誤判率與頁面效能影響
- [ ] 決定 Context 過濾規則
- [ ] 決定白名單初始範圍

**驗收標準**：誤判率可接受、頁面無明顯卡頓。
若不通過，重新評估 Stock Peek 的產品定位再繼續。

---

## Phase 2：Stock Data（OpenData）

- [ ] TWSE OpenAPI
- [ ] TPEx OpenAPI
- [ ] 股票清單與離線搜尋
- [ ] 大盤資訊
- [ ] MockProvider
- [ ] Provider Registry + Capability 機制

---

## Phase 3：Watchlist

- [ ] 新增 / 移除自選
- [ ] Watchlist UI
- [ ] Storage
- [ ] 排序與分組

---

## Phase 4：Stock Detail

- [ ] 股票資訊
- [ ] PE / PB / 殖利率
- [ ] Chart（日 K）
- [ ] 市場狀態（注意 / 處置）

---

## Phase 5：Stock Radar（免 Key Beta 完整化）

- [ ] 漲幅 / 跌幅排行
- [ ] 爆量排行
- [ ] 注意股 / 處置股
- [ ] 所有 Radar 卡片標示資料交易日

**Phase 5 完成後即可發布 No-Key Beta。** 此時使用者不需任何帳號或 Key，即可使用搜尋、Watchlist、Stock Detail、Stock Radar 與盤後資料。

---

## Phase 6：Stock Peek 正式版

- [ ] 股票名稱 Detector
- [ ] 股票代碼 Detector
- [ ] Context 過濾
- [ ] 白名單管理
- [ ] Hover Card
- [ ] Add Watchlist
- [ ] Detail Link
- [ ] Hover Card 僅依 `Quote.freshness` 顯示即時 / 盤後狀態

---

## Phase 7：Credential + 即時報價（Key Gate）

- [ ] CredentialStore
- [ ] Settings 設定頁與申請引導
- [ ] FugleProvider
- [ ] 存檔前驗證
- [ ] 401 / 429 分流處理
- [ ] `RequiresCapability` 降級元件
- [ ] `RealtimeGate` 元件
- [ ] 報價狀態標示（即時 / 收盤 / 延遲）
- [ ] **未驗證 Key 時任何 UI 不得顯示「即時」**

---

## Phase 8：Alert

- [ ] Price Alert
- [ ] Percentage Alert
- [ ] Volume Alert
- [ ] Chrome Notification
- [ ] 分鐘級觸發說明文件
- [ ] 即時型 Alert 建立前強制檢查 `quote:realtime` capability + valid credential

---

## 16. V2

### 市場資料

- [ ] 三大法人
- [ ] 月營收
- [ ] EPS
- [ ] 股利
- [ ] 除權息
- [ ] 財報

### Alert

- [ ] 法人連買 / 連賣
- [ ] 爆量
- [ ] 注意股 / 處置股
- [ ] 月營收公布

### Radar

- [ ] 法人排行
- [ ] 外資連買
- [ ] 投信連買
- [ ] 月營收 YoY / MoM

### Stock Peek

- [ ] 使用者自訂網域
- [ ] 常用簡稱辨識

---

## 17. V3：StockLion AI

加入 AI 摘要，採 **BYO LLM Key**（OpenAI-compatible）。

### AI 個股摘要

```text
🦁 StockLion AI

2330 台積電

今日股價上漲 2.3%

可能相關因素：

• 半導體族群走強
• 外資連續買超
• AI 伺服器需求相關消息
```

注意：

AI 不直接產生：

```text
買入
賣出
目標價
```

而以資訊整理為主。

---

## 18. V4：同步策略（原「帳號系統」，已調整）

> **調整理由**：帳號系統本質上無法 BYO——不能要求一般使用者自行開設 Supabase。原規劃與「No backend / No account」原則衝突，因此改為漸進式路徑。

依序評估：

1. **匯出 / 匯入 JSON** — V1 即可實作，零基礎設施，解決多數搬移需求
2. **`chrome.storage.sync`** — 免 Key 的輕量同步，但需注意配額限制，Watchlist 須壓縮存放，重度使用者仍可能超標
3. **自架選項** — 進階使用者填入自己的 Supabase URL + anon key（仍屬 BYO，對開發者受眾成立）
4. **託管服務** — 涉及營運成本與資料授權，待有營收後再評估

---

## 19. V5：投資組合

```text
Portfolio
```

功能：

- 成本
- 股數
- 報酬率
- 股息
- 已實現損益
- 未實現損益

> 全部為使用者自行輸入的資料，存於本機，不涉及授權問題。

---

## 20. Browser Permissions

```json
{
  "permissions": [
    "storage",
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "https://openapi.twse.com.tw/*",
    "https://www.tpex.org.tw/*"
  ],
  "optional_host_permissions": [
    "https://api.fugle.tw/*"
  ]
}
```

Content Script：

```json
{
  "content_scripts": [
    {
      "matches": [
        "https://www.ptt.cc/bbs/Stock/*",
        "https://tw.stock.yahoo.com/*",
        "https://www.cnyes.com/*",
        "https://www.threads.com/*"
      ],
      "js": ["content.js"]
    }
  ]
}
```

### Chrome Web Store 審核考量

- **避免 `<all_urls>`**。金融類 extension 搭配全網域 content script 是高審核風險組合，可能被要求補權限說明或直接退件。
- 改用**白名單 + `optional_host_permissions`**，讓使用者自行決定要在哪些網站啟用。這同時解決效能與誤判問題。
- `api.fugle.tw` 列為 optional，未設定 Key 的使用者不會被要求授權。

---

## 21. 開源策略

GitHub Repository：

```text
stocklion
```

Description：

```text
🦁 A Taiwan stock market browser companion.
Quick quotes, watchlists, stock radar and in-page stock insights.
No backend. No account. Your keys stay in your browser.
```

Topics：

```text
taiwan-stock
chrome-extension
vue3
typescript
stock-market
twse
tpex
browser-extension
finance
wxt
```

授權：MIT

---

## 22. README 建議架構

```text
# StockLion

Screenshot

Features

Demo

Installation

Setup（Optional API Key）

Data Sources & Licensing

Architecture

Roadmap

Development

Privacy

Disclaimer

License
```

**Data Sources & Licensing 段落必須說明**：

- 預設使用交易所公開資料（Open Data）
- 即時報價由使用者自行申請富果行情 API Key，資料授權關係存在於使用者與供應商之間
- StockLion 不轉發、不快取於任何伺服器

---

## 23. 隱私設計

第一版：

- 不需要登入
- 不收集使用者資料
- 不含任何 telemetry
- 自選股存在本機
- Alert 存本機
- **API Key 存在本機，永不傳送至任何第三方伺服器**
- 不需要券商帳號

README 明確聲明：

```text
No backend. No account. No telemetry.
Your API keys never leave your browser.

StockLion does not collect brokerage credentials
or personal financial information.
```

> 在充斥著「請先註冊 / 請先綁定帳號」的財經工具市場中，這段聲明本身就是差異化賣點。

---

## 24. Disclaimer

建議顯示：

> StockLion 提供之資訊僅供資訊整理與學習用途，不構成任何投資建議。市場資料可能存在延遲，實際交易資訊應以交易所與券商資料為準。

**放置位置**：不只 README，Popup 內也需可見（設定頁或 About 區塊）。

---

## 25. 成功指標

MVP 完成條件：

- [ ] Extension 可以正常安裝
- [ ] **未設定任何 API Key 即可完整使用核心功能**
- [ ] 可以搜尋台股
- [ ] 可以加入自選
- [ ] 可以顯示個股資訊
- [ ] 可以查看基本面
- [ ] 可以顯示注意 / 處置狀態
- [ ] 報價來源狀態明確標示
- [ ] 網頁可以辨識股票（白名單範圍內）
- [ ] Hover 可以顯示 Stock Peek
- [ ] Stock Radar 可以正常使用
- [ ] **未設定 / 未驗證 Fugle Key 時，不存在任何「即時」行情路徑**
- [ ] 設定並驗證 Fugle Key 後才可解鎖即時報價與日內資料
- [ ] Key 驗證與錯誤處理正確
- [ ] README 與 Screenshot 完成
- [ ] 通過 Chrome Web Store 審核

---

## 26. 待確認事項

- [ ] **去信富果技術客服**（tech.support@fugle.tw）確認：在第三方開源應用中，由使用者填入自身 API Key 的使用方式是否符合服務條款。BYO Key 通常無虞，但取得書面確認很便宜，順利的話還可能取得官方背書與曝光。
- [ ] 確認 TPEx OpenAPI 各端點的實際欄位與更新時間
- [ ] 確認 Chrome Web Store 對金融類 extension 的最新政策
- [ ] Phase 1.5 Spike 結果 → 決定 Stock Peek 的最終範圍

---

## 27. 最終產品定位

StockLion 不應只是：

> Yahoo 股市縮小版

而應定位成：

> **Taiwan Stock Market Browser Copilot**

核心差異：

```text
瀏覽器原生
+
Stock Peek
+
自選股
+
台股雷達
+
Alert
+
AI Summary
+
No backend / No account / BYO Key
```

最終可以形成：

```text
StockLion
│
├── Market
├── Watchlist
├── Stock Peek
├── Stock Radar
├── Alert
└── StockLion AI
```

讓使用者在瀏覽任何網站時，都能快速取得台股資訊。

### 誠實的取捨

BYO Key 的代價是**轉換漏斗會變窄**。一般投資人不會去申請 API Key，願意的多半是開發者與進階使用者。

但這與 Malilion Browser Tools 的整體定位一致——這個系列本來就是開發者工具。因此這個取捨成立，前提是必須做到兩件事：

1. **免 Key 路徑是完整產品，不是試用版。** 就算使用者永遠不填 Key，StockLion 仍值得留在瀏覽器裡。
2. **把「不需帳號、不需後端」寫成賣點，而非限制。**

---

# Part II — v2.1 Implementation Spec

> 本 Part 將前述產品規劃轉換為工程契約。若 Part I 的描述與 Part II 的型別 / 規則衝突，**v2.1 實作以 Part II 為準**；但資料授權與 BYO Key 原則仍以第 4～6 章為最高約束。

## 28. 實作範圍與 Non-Goals

### 28.1 v2.1 必做

- WXT + Vue 3 + TypeScript Extension Skeleton
- Manifest V3 Background Service Worker
- Popup：Market / Watchlist / Radar / Search / Settings
- OpenDataProvider
- ProviderRegistry + Capability Resolution
- 股票 Dictionary 與離線搜尋
- Watchlist 本機儲存
- Stock Detail（日 K / 基本面 / 市場狀態）
- Stock Radar
- Stock Peek Spike + 正式版
- CredentialStore
- FugleProvider（BYO Key）
- **RealtimeGate：即時功能必須由有效 Key 解鎖**
- Browser Notification + 分鐘級 Alert
- Unit Test / Integration Test / Extension E2E 基礎
- README / Privacy / Disclaimer / Data Source 說明

### 28.2 v2.1 不做

- 券商登入
- 下單
- 自動交易
- 代管 API Key
- 共用行情 Proxy
- 伺服器資料庫
- 使用者帳號系統
- 投資建議 / 目標價
- 任何宣稱保證獲利的功能
- 秒級交易觸發器

---

## 29. Domain Model

所有 UI 與 Provider 必須共用同一組 Domain Types。**Provider 回來的原始 JSON 不得直接進 Vue Component。**

### 29.1 基本型別

```ts
export type Market = 'TWSE' | 'TPEx'
export type InstrumentType = 'stock' | 'etf' | 'other'

export interface StockSymbol {
  symbol: string
  name: string
  fullName?: string
  market: Market
  instrumentType: InstrumentType
  isin?: string
}
```

### 29.2 Data Freshness

```ts
export type DataFreshness =
  | 'realtime'
  | 'delayed'
  | 'eod'
  | 'stale'

export interface DataStamp {
  source: string
  freshness: DataFreshness
  /** Provider 所宣告的資料時間 */
  asOf: string
  /** Extension 實際收到資料的時間 */
  receivedAt: string
  /** 若為盤後資料，必須填交易日 YYYY-MM-DD */
  tradingDate?: string
}
```

### 29.3 Quote

```ts
export interface Quote extends DataStamp {
  symbol: string
  name: string
  market: Market

  price: number | null
  previousClose: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null

  change: number | null
  changePercent: number | null
}
```

**Invariant：**

```ts
if (quote.freshness === 'realtime') {
  // 必須由 valid realtime provider 產生
  assert(provider.capabilities.includes('quote:realtime'))
  assert(credentialState === 'valid')
}
```

UI 不可使用「現在是否交易時間」來猜測 `realtime`；交易時間只用於決定是否值得發出請求。

### 29.4 FundamentalSnapshot

```ts
export interface FundamentalSnapshot extends DataStamp {
  symbol: string
  pe: number | null
  pb: number | null
  dividendYield: number | null
  eps: number | null
  marketCap?: number | null
  monthlyRevenue?: number | null
  revenueYoY?: number | null
  revenueMoM?: number | null
}
```

### 29.5 MarketStatus

```ts
export interface MarketStatus extends DataStamp {
  symbol: string
  isAttention: boolean
  isDisposition: boolean
  isLimitUp?: boolean
  isLimitDown?: boolean
}
```

### 29.6 Watchlist

```ts
export interface WatchlistGroup {
  id: string
  name: string
  order: number
  symbols: string[]
  createdAt: string
  updatedAt: string
}
```

### 29.7 Alert

```ts
export type AlertRule =
  | {
      id: string
      symbol: string
      type: 'price-above'
      threshold: number
      requires: ['quote:realtime']
      enabled: boolean
    }
  | {
      id: string
      symbol: string
      type: 'price-below'
      threshold: number
      requires: ['quote:realtime']
      enabled: boolean
    }
  | {
      id: string
      symbol: string
      type: 'percent-change'
      threshold: number
      direction: 'up' | 'down'
      requires: ['quote:realtime']
      enabled: boolean
    }
  | {
      id: string
      symbol: string
      type: 'volume-ratio'
      threshold: number
      requires: ['quote:realtime']
      enabled: boolean
    }
```

v2.1 的 Price Alert 一律屬於即時行情功能，因此 **沒有 valid realtime key 就不能建立 / 啟用**。

---

## 30. Provider Contract

### 30.1 Capability

```ts
export type Capability =
  | 'symbol:list'
  | 'quote:eod'
  | 'quote:realtime'
  | 'chart:daily'
  | 'chart:intraday'
  | 'fundamental:valuation'
  | 'fundamental:revenue'
  | 'institutional:daily'
  | 'market:attention'
  | 'market:disposition'
  | 'radar:eod'
  | 'ai:summary'
```

### 30.2 Provider Base

```ts
export interface ProviderContext {
  now: Date
  signal?: AbortSignal
}

export interface ProviderMeta {
  id: string
  label: string
  capabilities: readonly Capability[]
  credentialId?: string
}

export interface QuoteProvider {
  meta: ProviderMeta

  getQuote(
    symbol: string,
    ctx: ProviderContext,
  ): Promise<Quote>

  getQuotes(
    symbols: string[],
    ctx: ProviderContext,
  ): Promise<Quote[]>
}
```

### 30.3 OpenDataProvider Contract

OpenDataProvider 必須宣告：

```ts
const capabilities = [
  'symbol:list',
  'quote:eod',
  'chart:daily',
  'fundamental:valuation',
  'fundamental:revenue',
  'institutional:daily',
  'market:attention',
  'market:disposition',
  'radar:eod',
] as const
```

**禁止：**

```ts
'quote:realtime'
'chart:intraday'
```

OpenDataProvider 正規化後的 Quote：

```ts
{
  source: 'twse-open-data',
  freshness: 'eod',
  tradingDate: '2026-09-04',
  asOf: '2026-09-04T13:30:00+08:00',
  receivedAt: '2026-09-05T...',
}
```

### 30.4 Realtime Provider Contract

Realtime Provider 只有在 CredentialStore 回報 `valid` 時才能被 Registry 選中。

```ts
export interface RealtimeQuoteProvider extends QuoteProvider {
  meta: ProviderMeta & {
    credentialId: string
  }
}
```

若 Key 不存在、未驗證或失效：

```ts
registry.resolve('quote:realtime') // => null
```

**不得自動偷回退成 EOD 然後仍把 capability 判定為成功。**

---

## 31. Provider Registry 與 Resolution

```ts
export interface ProviderRegistry {
  register(provider: ProviderMeta): void
  list(): ProviderMeta[]
  supports(capability: Capability): ProviderMeta[]
  resolve(capability: Capability): ProviderMeta | null
}
```

Resolution 順序：

```text
功能提出 Capability
        ↓
Registry 找 provider
        ↓
是否需要 credential？
   ├─ 否 → 使用 provider
   └─ 是
       ↓
CredentialStore === valid ?
   ├─ 是 → 使用 provider
   └─ 否 → 回傳 capability unavailable
```

### 31.1 UI Gate

```vue
<RequiresCapability cap="quote:realtime">
  <RealtimeQuote />

  <template #fallback>
    <EodQuote />
    <SetupRealtimeProviderButton />
  </template>
</RequiresCapability>
```

另外提供更嚴格的：

```vue
<RealtimeGate>
  <CreatePriceAlertButton />
</RealtimeGate>
```

`RealtimeGate` fallback 不只是顯示 EOD，而是**禁止建立需要即時行情的功能**。

---

## 32. Credential State Machine

```ts
export type CredentialStatus =
  | 'missing'
  | 'unverified'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'rate-limited'
  | 'temporary-error'
```

### 32.1 State Transition

```text
missing
  ↓ 使用者輸入
unverified
  ↓ Validate
validating
  ├─ 2xx → valid
  ├─ 401/403 → invalid
  ├─ 429 → rate-limited
  └─ 5xx/network → temporary-error
```

### 32.2 重要規則

- `rate-limited` **不清除 Key**。
- `temporary-error` **不清除 Key**。
- `invalid` 不自動刪除 Key，但停止即時輪詢。
- `valid` 才可提供 `quote:realtime` / `chart:intraday`。
- UI 顯示 Key 時只顯示 masked value，例如 `fugle_••••••8x2Q`。
- 匯出設定預設排除 secrets。

### 32.3 Storage Record

```ts
export interface StoredCredential {
  id: string
  providerId: string
  fields: Record<string, string>
  status: CredentialStatus
  validatedAt?: string
  lastErrorCode?: string
}
```

---

## 33. Background Message Protocol

Content Script、Popup 與 Background 之間禁止傳遞 Provider 原始 response。

### 33.1 Request Envelope

```ts
export interface ExtensionRequest<TType extends string, TPayload> {
  id: string
  type: TType
  payload: TPayload
}

export interface ExtensionSuccess<T> {
  id: string
  ok: true
  data: T
}

export interface ExtensionFailure {
  id: string
  ok: false
  error: AppError
}
```

### 33.2 v2.1 Message Types

```ts
export type AppRequest =
  | ExtensionRequest<'quote:get', { symbol: string; preferRealtime: boolean }>
  | ExtensionRequest<'quote:getMany', { symbols: string[]; preferRealtime: boolean }>
  | ExtensionRequest<'stock:search', { query: string; limit?: number }>
  | ExtensionRequest<'stockPeek:get', { symbol: string }>
  | ExtensionRequest<'credential:validate', { credentialId: string }>
  | ExtensionRequest<'provider:capabilities', Record<string, never>>
  | ExtensionRequest<'alert:evaluate', Record<string, never>>
```

### 33.3 quote:get Resolution

`preferRealtime` 代表「若 capability 可用則使用」，不是「強制假裝即時」。

```text
quote:get(preferRealtime=true)
        ↓
resolve quote:realtime
   ├─ provider + valid key → realtime Quote
   └─ unavailable → resolve quote:eod → eod Quote
```

回傳資料仍由 `Quote.freshness` 決定 UI 標示。

### 33.4 Stock Peek Boundary

```text
Content Script
    │ 只送 symbol
    ▼
Background
    │ 讀 credential / provider / cache
    ▼
Normalized Quote
    │
    ▼
Content Script Hover Card
```

API Key 永遠不會進入 Content Script message payload。

---

## 34. Error Model

```ts
export type AppErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'CREDENTIAL_INVALID'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'PROVIDER_UNAVAILABLE'
  | 'DATA_UNAVAILABLE'
  | 'DATA_STALE'
  | 'SYMBOL_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'UNKNOWN'

export interface AppError {
  code: AppErrorCode
  message: string
  retryable: boolean
  providerId?: string
  cause?: string
}
```

### 34.1 UI Mapping

| Error | UI | 行為 |
|---|---|---|
| `PROVIDER_NOT_CONFIGURED` | 設定行情 Key | 不重試 |
| `CREDENTIAL_INVALID` | Key 無效，請重新確認 | 停止 realtime polling |
| `RATE_LIMITED` | 行情服務忙碌，稍後重試 | exponential backoff |
| `NETWORK_ERROR` | 網路異常 | 可手動重試 |
| `DATA_STALE` | 資料可能延遲 | 顯示時間戳 |
| `SYMBOL_NOT_FOUND` | 找不到股票 | 不重試 |

---

## 35. Realtime / EOD Resolution Spec

這是 v2.1 最重要的執行規格。

### 35.1 Quote Service

```ts
export async function getBestQuote(
  symbol: string,
  options: { preferRealtime: boolean },
): Promise<Quote> {
  if (options.preferRealtime) {
    const realtime = registry.resolve('quote:realtime')

    if (realtime) {
      try {
        return await realtime.getQuote(symbol, createContext())
      } catch (error) {
        // 僅做安全降級；不得把 fallback 標成 realtime
        handleProviderError(error)
      }
    }
  }

  const eod = registry.resolve('quote:eod')
  if (!eod) throw appError('DATA_UNAVAILABLE')

  return eod.getQuote(symbol, createContext())
}
```

### 35.2 UI Badge

```ts
export function quoteBadge(quote: Quote): string {
  switch (quote.freshness) {
    case 'realtime':
      return '● 即時'
    case 'delayed':
      return '◐ 延遲'
    case 'eod':
      return `○ ${quote.tradingDate ?? ''} 收盤`
    case 'stale':
      return '⚠ 資料較舊'
  }
}
```

### 35.3 禁止案例

以下都必須由測試攔住：

```ts
// ❌ OpenDataProvider 回 realtime
freshness: 'realtime'

// ❌ 沒 Key 但 UI 寫「即時」
const badge = isTradingHours ? '即時' : '收盤'

// ❌ realtime provider 401 後沿用舊值但仍標即時
{ ...lastQuote, freshness: 'realtime' }
```

正確做法：

```ts
{ ...lastQuote, freshness: 'stale' }
```

---

## 36. Cache Strategy

### 36.1 Cache Key

```text
stock:symbols:v1
quote:eod:{symbol}:{tradingDate}
quote:realtime:{symbol}
fundamental:{symbol}:{period}
radar:{tradingDate}:{category}
market-status:{symbol}:{tradingDate}
```

### 36.2 TTL 建議

| Data | TTL / 失效方式 |
|---|---|
| 股票清單 | 24 小時；可手動更新 |
| EOD Quote | 同交易日 immutable，下一交易日更新 |
| Realtime Quote | 5～15 秒；Popup 關閉後停止主動 refresh |
| 基本面 | 6～24 小時 |
| Radar | 同交易日盤後資料可長快取 |
| 注意 / 處置 | 每日刷新 |

### 36.3 Stale-While-Revalidate

Popup 打開時：

```text
Cache 有資料
  ↓
先立即 render
  ↓
Background refresh
  ↓
成功 → 更新 store
失敗 → 保留舊值 + freshness=stale
```

---

## 37. Storage Schema v1

所有 Storage Key 集中管理，不允許 Component 自己硬編字串。

```ts
export const STORAGE_KEYS = {
  schemaVersion: 'app:schema-version',
  watchlistGroups: 'watchlist:groups',
  credentials: 'credentials:v1',
  settings: 'settings:v1',
  stockSymbols: 'stock:symbols:v1',
  alerts: 'alerts:v1',
} as const
```

### 37.1 Settings

```ts
export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  priceColorMode: 'taiwan' | 'global'
  density: 'comfortable' | 'compact'
  preferredRealtimeProvider?: string
  stockPeekEnabled: boolean
  stockPeekDomains: string[]
}
```

### 37.2 Schema Migration

```ts
export interface StorageMigration {
  from: number
  to: number
  run(): Promise<void>
}
```

Extension 啟動時：

```text
讀 schema version
  ↓
逐版 migration
  ↓
成功後再啟動 stores / providers
```

---

## 38. WXT 專案目錄（落地版）

```text
stocklion/
├── entrypoints/
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── App.vue
│   ├── background.ts
│   └── content.ts
│
├── src/
│   ├── components/
│   │   ├── QuoteBadge.vue
│   │   ├── StockCard.vue
│   │   ├── RequiresCapability.vue
│   │   ├── RealtimeGate.vue
│   │   └── SetupHint.vue
│   │
│   ├── views/
│   │   ├── MarketView.vue
│   │   ├── WatchlistView.vue
│   │   ├── RadarView.vue
│   │   ├── SearchView.vue
│   │   ├── StockDetailView.vue
│   │   └── SettingsView.vue
│   │
│   ├── domain/
│   │   ├── stock.ts
│   │   ├── quote.ts
│   │   ├── fundamental.ts
│   │   ├── alert.ts
│   │   ├── capability.ts
│   │   └── errors.ts
│   │
│   ├── providers/
│   │   ├── registry.ts
│   │   ├── open-data/
│   │   │   ├── provider.ts
│   │   │   ├── twse.ts
│   │   │   ├── tpex.ts
│   │   │   └── normalizers.ts
│   │   ├── fugle/
│   │   │   ├── provider.ts
│   │   │   ├── client.ts
│   │   │   └── normalizers.ts
│   │   └── mock/
│   │       └── provider.ts
│   │
│   ├── credentials/
│   │   ├── types.ts
│   │   ├── store.ts
│   │   ├── validate.ts
│   │   └── specs/
│   │       └── fugle.ts
│   │
│   ├── services/
│   │   ├── quote-service.ts
│   │   ├── stock-service.ts
│   │   ├── radar-service.ts
│   │   ├── alert-service.ts
│   │   └── cache-service.ts
│   │
│   ├── messaging/
│   │   ├── protocol.ts
│   │   ├── router.ts
│   │   └── client.ts
│   │
│   ├── stock-peek/
│   │   ├── detector.ts
│   │   ├── context-filter.ts
│   │   ├── scanner.ts
│   │   ├── hover-card.ts
│   │   └── domain-policy.ts
│   │
│   ├── stores/
│   │   ├── market.ts
│   │   ├── watchlist.ts
│   │   ├── radar.ts
│   │   ├── credentials.ts
│   │   └── settings.ts
│   │
│   ├── storage/
│   │   ├── keys.ts
│   │   ├── repository.ts
│   │   └── migrations/
│   │
│   └── utils/
│       ├── trading-time.ts
│       ├── number.ts
│       └── retry.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── e2e/
│
├── public/
│   └── icons/
│
├── wxt.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 39. State Ownership

### Popup Store 負責

- 目前選擇的 tab
- 目前股票
- Watchlist UI state
- Settings form state
- Provider / credential status 的顯示

### Background 負責

- ProviderRegistry
- CredentialStore 真實資料
- 外部 API 呼叫
- Cache
- Alert evaluation
- Notification

### Content Script 負責

- DOM 掃描
- Stock Entity Detection
- Hover Card render
- 送出 symbol 查詢

### 禁止

- Popup 直接呼叫 Fugle / TWSE
- Content Script 直接讀 credential
- Component 直接解析 Provider JSON
- Pinia store 保存明文 Key 作為長期狀態

---

## 40. Stock Peek Implementation Contract

### 40.1 Detector Pipeline

```text
Domain allowlist
  ↓
Visible nodes
  ↓
Candidate extraction
  ↓
Exact symbol / company-name match
  ↓
Context score
  ↓
Threshold pass
  ↓
Annotation / Hover target
```

### 40.2 Context Score

v2.1 Spike 可先採簡單權重：

```ts
const KEYWORDS = {
  strong: ['股票', '股價', '漲停', '跌停', '收盤', '開盤'],
  medium: ['漲', '跌', '成交', '外資', '投信', '買超', '賣超'],
  weak: ['元', '台幣', '$'],
}
```

建議：

- Exact symbol + strong keyword → pass
- Full company name + medium keyword → pass
- 只有四位數字 → fail
- short company alias → MVP fail

### 40.3 Performance Budget

- 初始掃描不可阻塞主執行緒超過約一個 frame 的長工作
- 分批處理 DOM
- SPA mutation 必須 debounce
- Hover Quote 需要 cache，禁止每次 mouseenter 都重打 API
- 同 symbol 在短時間內只允許一個 in-flight request

### 40.4 Stock Peek 與 Realtime

Stock Peek 本身**不要求 Key**：

```text
無 Key → 顯示 EOD + 收盤 Badge
有效 Key → 可顯示 realtime + 即時 Badge
```

這是 `preferRealtime=true` + fallback 的典型使用場景。

---

## 41. Alert Engine Implementation

### 41.1 建立 Alert

```text
User clicks Add Alert
      ↓
Requires quote:realtime ?
      ↓ yes
Realtime provider available + credential valid ?
  ├─ no → 阻止建立 + SetupHint
  └─ yes → save alert
```

### 41.2 Evaluate

```ts
export async function evaluateAlerts(): Promise<void> {
  const alerts = await alertRepo.listEnabled()
  if (!alerts.length) return

  const realtime = registry.resolve('quote:realtime')
  if (!realtime) return

  const symbols = [...new Set(alerts.map(a => a.symbol))]
  const quotes = await quoteService.getRealtimeQuotes(symbols)

  // evaluate rules + de-duplicate notifications
}
```

### 41.3 Notification De-duplication

每個 Alert 記錄：

```ts
export interface AlertState {
  alertId: string
  lastTriggeredAt?: string
  lastObservedSide?: 'above' | 'below'
}
```

只有「跨越門檻」才通知，不可每次 alarm 都重複通知。

---

## 42. Trading Time Policy

`trading-time.ts` 只負責**是否值得刷新即時資料**，不負責判定 Quote 是否即時。

```ts
export interface TradingSessionState {
  isWeekday: boolean
  isRegularSession: boolean
  session: 'preopen' | 'regular' | 'closed'
}
```

注意：

- 假日 / 休市日之完整判斷需要交易日曆資料；若 v2.1 尚未接入，不得只靠 weekday 宣稱市場開市。
- 無法確定時，寧可不主動輪詢，使用手動 refresh + cached data。

---

## 43. UI Information Architecture

```text
StockLion Popup
│
├── Market
│   ├── Market Summary
│   ├── Quote freshness
│   └── Quick movers
│
├── Watchlist
│   ├── Groups
│   ├── QuoteBadge
│   └── Quick actions
│
├── Radar
│   ├── Gainers
│   ├── Losers
│   ├── Volume
│   ├── Attention
│   └── Disposition
│
├── Search
│   ├── Offline symbol search
│   └── Stock detail
│
└── Settings
    ├── Market Data Provider
    │   ├── Fugle key
    │   ├── Validate
    │   └── Status
    ├── Stock Peek
    ├── Appearance
    ├── Privacy
    └── About / Disclaimer
```

### 43.1 QuoteBadge 必須全域共用

所有顯示價格的位置一律使用同一顆 `QuoteBadge`：

- Market
- Watchlist
- Search Result
- Stock Detail
- Stock Peek
- Alert preview

避免某個頁面忘記標示即時 / 收盤。

---

## 44. UI States

每個 data-driven component 至少支援：

```ts
type AsyncState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'stale'
```

### 44.1 Realtime Setup CTA

未設定 Key：

```text
盤中即時行情尚未啟用
目前顯示最近交易日收盤資料。

[設定行情 API Key]
```

不要使用：

```text
功能不可用
```

因為免 Key 路徑仍是完整產品。

---

## 45. Security Requirements

### MUST

- API Key 僅存在 `chrome.storage.local`
- 所有外部行情 request 從 Background 發出
- Content Script 永遠拿不到 credential
- Logs 不輸出完整 Key
- Error telemetry 不存在（v2.1 No telemetry）
- Export 預設不包含 secrets
- Settings 顯示 masked Key
- Host permission 最小化

### MUST NOT

- `console.log(apiKey)`
- Query string 帶 secret（除非 Provider 官方 API 明確要求且無替代）
- 把 Key 放入 DOM dataset
- 把 Key 放入 Pinia persisted state
- 把 Key 傳給 Content Script
- 把使用者行情資料回傳到 Malilion 自有伺服器

---

## 46. Testing Strategy

### 46.1 Unit Tests

至少覆蓋：

- Provider normalizers
- `Quote.freshness` invariant
- Provider capability resolution
- Credential state transition
- 401 vs 429
- `quoteBadge()`
- Watchlist repository
- Alert threshold crossing
- Stock detector context scoring

### 46.2 Integration Tests

使用 MockProvider：

```text
Popup → Message Client → Background Router
      → ProviderRegistry → MockProvider
      → normalized Quote → Store → UI
```

### 46.3 Realtime Key Gate 必測案例

```text
1. No credential
   → resolve quote:realtime = null
   → UI shows EOD
   → UI does NOT contain 即時

2. Invalid credential
   → credential status invalid
   → realtime polling stops
   → EOD fallback

3. 429
   → key remains stored
   → status rate-limited
   → no credential invalidation

4. Valid credential
   → realtime provider selected
   → Quote freshness realtime
   → badge = 即時

5. Realtime provider fails after success
   → cached quote becomes stale / delayed
   → badge must not remain 即時
```

### 46.4 Extension E2E

至少做：

- 安裝 extension
- 打開 Popup
- 搜尋 2330
- 加入 Watchlist
- 關閉再打開仍存在
- 無 Key 顯示盤後 badge
- 填入 Mock valid key 後切 realtime badge
- Stock Peek 在測試 fixture page 出現
- Alert 沒 Key 時無法建立

---

## 47. Mock Fixtures

開發期間不要依賴真實 API 才能跑 UI。

```text
tests/fixtures/
├── symbols.json
├── quote-eod-2330.json
├── quote-realtime-2330.json
├── fundamentals-2330.json
├── radar.json
├── attention.json
└── disposition.json
```

MockProvider 支援情境：

```ts
type MockScenario =
  | 'eod-success'
  | 'realtime-success'
  | 'credential-invalid'
  | 'rate-limited'
  | 'network-error'
  | 'stale-cache'
```

---

## 48. Performance Budget

MVP 先用可驗證的工程目標，而非追求極端微優化：

- Popup 首屏使用 cache 時應立即可見 skeleton / cached content
- Watchlist 不做 N 檔 N requests；必須 batch / aggregate
- Popup 關閉後停止 UI 導向 polling
- Stock Peek 同頁掃描必須有節流與上限
- Provider response 只 normalize 一次
- Chart data 與 stock dictionary 避免每次開 Popup 重抓

若實測效能不佳，再引入 IndexedDB；v2.1 不預先增加複雜度。

---

## 49. Logging Policy

開發版可以有 structured logger：

```ts
logger.info('provider.request', {
  providerId,
  capability,
  symbol,
})
```

禁止記錄：

- API Key
- Authorization header
- 完整 credential object
- 使用者投資組合（未來 V5）

Production 預設只保留必要錯誤 log；No telemetry。

---

## 50. Phase Definition of Done + Codex TASK

以下每一 Phase 都可直接拆成 Codex 工作批次。**Codex 不可跨 Phase 偷做後續功能。**

### Phase 1 — Extension Skeleton

**TASK**

- [ ] 初始化 WXT + Vue 3 + TypeScript
- [ ] 建立 Popup / Background / Content Script entrypoints
- [ ] 建立 Pinia
- [ ] 建立 StorageRepository
- [ ] 建立 Message Protocol + Router
- [ ] 建立共用 AppError
- [ ] 設定 lint / typecheck / unit test

**DoD**

- [ ] Extension 可載入 Chrome
- [ ] Popup 可打開
- [ ] Background request/response round-trip 測試通過
- [ ] `pnpm typecheck` 無錯誤
- [ ] `pnpm test` 通過

### Phase 1.5 — Stock Peek Spike

**TASK**

- [ ] 建立 stock dictionary fixture
- [ ] Candidate extractor
- [ ] Context filter
- [ ] Mutation / visible node scan
- [ ] Hover Card mock
- [ ] PTT / Threads 測試紀錄

**DoD**

- [ ] 四位數字不會大面積誤判
- [ ] SPA 滾動無明顯卡頓
- [ ] 同一股票不重複插入大量節點
- [ ] 產出 `docs/stock-peek-spike.md`

### Phase 2 — OpenData

**TASK**

- [ ] Domain Types
- [ ] Capability Types
- [ ] OpenDataProvider
- [ ] TWSE / TPEx adapter
- [ ] Normalizers
- [ ] Symbol repository
- [ ] Offline search
- [ ] Cache
- [ ] MockProvider

**DoD**

- [ ] 無任何 API Key 可搜尋股票
- [ ] 無任何 API Key 可取得 EOD Quote
- [ ] OpenData Quote 永遠不是 `realtime`
- [ ] TWSE / TPEx normalized model 一致

### Phase 3 — Watchlist

**TASK**

- [ ] Watchlist repository
- [ ] 分組
- [ ] 排序
- [ ] Add / Remove
- [ ] WatchlistView
- [ ] QuoteBadge

**DoD**

- [ ] Reload 後資料仍存在
- [ ] 無 Key 使用完全正常
- [ ] 每一價格均顯示 freshness badge

### Phase 4 — Stock Detail

**TASK**

- [ ] Detail route / state
- [ ] EOD quote card
- [ ] Fundamental cards
- [ ] Daily chart
- [ ] Attention / disposition state
- [ ] Loading / empty / error / stale states

**DoD**

- [ ] 2330 等 fixture 可完整 render
- [ ] Chart 可讀 cache
- [ ] 不直接使用 Provider raw JSON

### Phase 5 — Stock Radar

**TASK**

- [ ] Radar service
- [ ] Gainers / Losers
- [ ] Volume / unusual volume
- [ ] Attention / disposition
- [ ] RadarView

**DoD**

- [ ] 完全不需要 Key
- [ ] 明確顯示 trading date
- [ ] Phase 5 完成即可做 No-Key Beta build

### Phase 6 — Stock Peek Production

**TASK**

- [ ] 導入正式 symbol dictionary
- [ ] Domain allowlist
- [ ] Detector optimization
- [ ] Background quote message
- [ ] Hover Card QuoteBadge
- [ ] Add Watchlist
- [ ] Detail navigation

**DoD**

- [ ] Content Script 無 credential
- [ ] 無 Key → EOD
- [ ] 有 valid Key → 可 realtime
- [ ] Hover cache 生效

### Phase 7 — Credential + Realtime

**TASK**

- [ ] CredentialSpec
- [ ] CredentialStore
- [ ] Credential state machine
- [ ] Settings UI
- [ ] Validate flow
- [ ] FugleProvider
- [ ] ProviderRegistry credential resolution
- [ ] `RequiresCapability`
- [ ] `RealtimeGate`
- [ ] realtime cache / polling
- [ ] 401 / 429 / 5xx handling

**DoD**

- [ ] **沒有 valid Key 時 `registry.resolve('quote:realtime') === null`**
- [ ] **沒有 valid Key 時全產品不顯示任何 realtime badge**
- [ ] valid Key 才能得到 `freshness: 'realtime'`
- [ ] 401 停止 polling
- [ ] 429 不刪 Key
- [ ] Provider failure 後舊值改標 stale / delayed

### Phase 8 — Alert

**TASK**

- [ ] Alert schema
- [ ] Alert repository
- [ ] RealtimeGate
- [ ] chrome.alarms
- [ ] Batch realtime quote fetch
- [ ] Threshold crossing
- [ ] Notification de-dup

**DoD**

- [ ] 無 realtime key 無法建立 realtime alert
- [ ] valid key 可建立
- [ ] 同一 crossing 不重複通知
- [ ] README 明示分鐘級而非秒級

---

## 51. Git Workflow 建議

Branch：

```text
main
└── feat/phase-1-extension-skeleton
└── spike/stock-peek
└── feat/open-data-provider
└── feat/watchlist
└── feat/stock-detail
└── feat/stock-radar
└── feat/stock-peek
└── feat/realtime-provider
└── feat/alerts
```

每個 Phase 優先一個 PR，不把所有功能塞進單一巨大 PR。

Commit 建議：

```text
feat(provider): add capability registry
feat(quote): normalize eod quote model
feat(credentials): add local credential store
feat(realtime): gate realtime quotes behind valid credential
fix(realtime): never label fallback eod quote as realtime
test(realtime): cover missing and invalid credential states
```

---

## 52. CI Gate

PR merge 前至少跑：

```text
install
  ↓
typecheck
  ↓
lint
  ↓
unit test
  ↓
build extension
```

Phase 6 後增加：

```text
extension e2e smoke test
```

Release 前：

- [ ] Chrome build 成功
- [ ] Manifest permissions diff review
- [ ] 無 secret 打包進產物
- [ ] Privacy / Disclaimer 存在
- [ ] Data source 說明存在
- [ ] 無 Key smoke test
- [ ] Valid Mock Key realtime smoke test

---

## 53. Release Milestones

### v0.1.0 — Skeleton

Extension 可安裝、架構完成。

### v0.2.0 — Open Data Alpha

搜尋 + EOD Quote + 基本面。

### v0.3.0 — No-Key Beta

Watchlist + Stock Detail + Radar。**不設定任何 Key 就有完整使用價值。**

### v0.4.0 — Stock Peek Beta

白名單網站支援 Stock Peek。

### v0.5.0 — Realtime BYO Key Beta

加入 Credential + Realtime Provider。**從此版本開始，只有 Valid Key 才能出現「即時」。**

### v0.6.0 — Alert Beta

分鐘級 Price Alert。

### v1.0.0 — Chrome Web Store

- 權限說明完成
- Privacy / Disclaimer 完成
- 資料授權確認完成
- E2E 完成
- 錯誤處理與降級完成

---

## 54. Codex 啟動 Prompt

以下可直接作為第一輪 Codex 指令：

```text
You are implementing StockLion, a Taiwan stock-market browser extension.

Read this Implementation Spec completely before changing code.

Hard product constraints:
1. No backend in v2.1.
2. No account is required.
3. BYO Key: credentials belong to the user and stay in chrome.storage.local.
4. Realtime market data MUST require a valid user-provided market-data API key.
5. Without a valid realtime key, the product must fall back to Open Data / EOD data and MUST NOT label any quote as realtime.
6. Content scripts must never receive API credentials.
7. Provider raw responses must be normalized into shared domain models before reaching UI.
8. Do not implement trading or brokerage actions.

Start with Phase 1 only.
Do not implement future phases early.

For Phase 1:
- initialize WXT + Vue 3 + TypeScript
- create popup, background, and content entrypoints
- set up Pinia
- create shared AppError types
- create the extension request/response protocol
- create a background message router
- create a typed storage repository and schema version key
- add typecheck, lint, and unit test scripts
- add one round-trip background messaging test

Before finishing:
- run typecheck
- run tests
- run the extension build
- summarize files changed
- report any assumptions without silently changing this spec
```

---

## 55. v2.1 驗收總表

### Product

- [ ] 無 Key 能使用 Search / Watchlist / Detail / Radar / Stock Peek（EOD）
- [ ] 即時行情只有 valid user key 才能啟用
- [ ] UI 永遠顯示資料 freshness
- [ ] Price Alert 需要 realtime capability

### Architecture

- [ ] WXT + Vue 3 + TypeScript
- [ ] ProviderRegistry
- [ ] Capability-based resolution
- [ ] CredentialStore
- [ ] Background-only network boundary
- [ ] Domain normalization
- [ ] Versioned storage

### Security

- [ ] Credential 不進 Content Script
- [ ] Credential 不進 sync
- [ ] Credential 不進 log
- [ ] No telemetry
- [ ] No backend proxy

### Quality

- [ ] Unit tests
- [ ] Integration tests
- [ ] Realtime Key Gate tests
- [ ] Extension E2E smoke tests
- [ ] Build CI

### Release

- [ ] README
- [ ] Data Sources & Licensing
- [ ] Privacy
- [ ] Disclaimer
- [ ] Chrome Web Store permission review
- [ ] 富果第三方 BYO Key 使用方式完成書面確認

---

## 56. v2.1 最終工程原則

```text
No Key does not mean broken.
No Key means EOD / Open Data.

Valid Key unlocks realtime.
Realtime is never inferred.
Realtime is never faked.
```

工程上所有行情畫面都應遵循同一條鏈：

```text
Capability
    ↓
Credential Status
    ↓
Provider Resolution
    ↓
Normalized Domain Model
    ↓
Data Freshness
    ↓
UI Badge
```

StockLion 的核心不是「盡可能顯示一個價格」，而是：

> **讓使用者永遠知道自己現在看到的是什麼資料、資料來自哪裡，以及它到底是不是即時。**
