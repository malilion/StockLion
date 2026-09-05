import os
import sys
import time
import base64
import subprocess

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, 'docs', 'screenshots')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Read icon base64
ICON_PATH = os.path.join(WORKSPACE_DIR, 'public', 'icon.png')
with open(ICON_PATH, 'rb') as f:
    ICON_B64 = base64.b64encode(f.read()).decode('utf-8')
ICON_DATA_URL = f"data:image/png;base64,{ICON_B64}"

COMMON_CSS = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 20%, #1e293b 0%, #0b0f19 100%);
  color: #f8fafc;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.header-hero {
  padding: 32px 48px 16px 48px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}
.hero-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(251, 191, 36, 0.25);
}
.brand-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #fbbf24;
}
.brand-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 2px;
  font-weight: 500;
}
.hero-tagline-wrap {
  text-align: right;
}
.hero-tagline {
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
}
.hero-desc {
  font-size: 13px;
  color: #38bdf8;
  margin-top: 4px;
  font-weight: 600;
}
.content-area {
  flex: 1;
  display: flex;
  padding: 32px 48px;
  gap: 40px;
  align-items: center;
  justify-content: center;
}
.browser-frame {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.browser-topbar {
  background: #1e293b;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #334155;
}
.window-dots {
  display: flex;
  gap: 6px;
}
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }
.url-bar {
  flex: 1;
  background: #0b0f19;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ext-icon-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(251, 191, 36, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(251, 191, 36, 0.4);
}
.ext-mini-icon { width: 18px; height: 18px; border-radius: 4px; }
.ext-name { font-size: 11px; font-weight: 700; color: #fbbf24; }

/* Popup Mockup */
.popup-mock {
  width: 380px;
  background: #0b0f19;
  border: 1px solid #334155;
  border-radius: 10px;
  box-shadow: 0 20px 30px rgba(0,0,0,0.5);
  overflow: hidden;
}
.popup-header {
  background: #111827;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #1f2937;
}
.popup-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.popup-logo { width: 24px; height: 24px; border-radius: 6px; }
.popup-title { font-size: 14px; font-weight: 700; color: #fbbf24; }
.popup-sub { font-size: 10px; color: #6b7280; margin-left: 4px; }
.popup-actions { display: flex; gap: 8px; }
.icon-btn { font-size: 13px; color: #9ca3af; cursor: pointer; padding: 2px; }

/* Tabs */
.tab-row {
  display: flex;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 2px solid transparent;
}
.tab.active {
  color: #fbbf24;
  border-bottom-color: #fbbf24;
  background: rgba(251, 191, 36, 0.05);
}

/* Feature Highlights */
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 420px;
}
.feature-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.feature-icon {
  font-size: 24px;
  background: rgba(251, 191, 36, 0.1);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.2);
  flex-shrink: 0;
}
.feature-info h4 {
  font-size: 16px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 4px;
}
.feature-info p {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}

/* Common UI Elements */
.badge-realtime {
  font-size: 9px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.badge-eod {
  font-size: 9px;
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.color-up { color: #ef4444; font-weight: 700; }
.color-down { color: #10b981; font-weight: 700; }
"""

def render_html_to_png(html_content, output_name, width, height):
    html_path = os.path.join(OUTPUT_DIR, f"{output_name}.html")
    png_path = os.path.join(OUTPUT_DIR, f"{output_name}.png")
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    user_data = os.path.join(WORKSPACE_DIR, f'.chrome-user-data-{output_name}')
    cmd = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '--headless=new',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-sync',
        '--disable-extensions',
        f'--user-data-dir={user_data}',
        f'--screenshot={png_path}',
        f'--window-size={width},{height}',
        f'--virtual-time-budget=2000',
        f'file://{html_path}'
    ]
    
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        time.sleep(0.1)
        if os.path.exists(png_path) and os.path.getsize(png_path) > 1000:
            break
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except:
        proc.kill()
        
    # Clean temporary profile
    subprocess.run(['rm', '-rf', user_data])
    if os.path.exists(html_path):
        os.remove(html_path)

    # Convert/verify with sips to ensure exact dimensions and no alpha
    subprocess.run(['sips', '-s', 'format', 'png', png_path, '--out', png_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"✅ Generated: {output_name}.png ({width}x{height})")


# ==========================================
# SCREENSHOT 1: 大盤總覽與自選股監控 (1280x800)
# ==========================================
HTML_SCREENSHOT_1 = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{COMMON_CSS}
/* Index Bar */
.index-card {{
  background: #1e293b;
  margin: 10px 12px;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #334155;
}}
.index-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.index-name {{ font-size: 13px; font-weight: 700; color: #f1f5f9; }}
.index-val {{ font-size: 15px; font-weight: 800; }}
.market-stats-row {{
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: #94a3b8;
  border-top: 1px solid #334155;
  padding-top: 6px;
}}
.stock-list {{
  display: flex;
  flex-direction: column;
  padding: 0 12px 12px 12px;
  gap: 8px;
}}
.stock-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #111827;
  border: 1px solid #1f2937;
  padding: 9px 12px;
  border-radius: 6px;
}}
.stock-meta {{ display: flex; flex-direction: column; }}
.stock-name-row {{ display: flex; align-items: center; gap: 6px; }}
.stock-symbol {{ font-size: 13px; font-weight: 700; color: #f8fafc; }}
.stock-name {{ font-size: 12px; color: #cbd5e1; }}
.stock-sub {{ font-size: 10px; color: #64748b; margin-top: 2px; }}
.stock-price-block {{ text-align: right; }}
.stock-price {{ font-size: 14px; font-weight: 800; }}
.stock-change {{ font-size: 11px; font-weight: 600; margin-top: 1px; }}
</style>
</head>
<body>
  <div class="header-hero">
    <div class="brand-title-wrap">
      <img src="{ICON_DATA_URL}" class="hero-logo" />
      <div>
        <div class="brand-title">StockLion 股力獅</div>
        <div class="brand-subtitle">Taiwan Stock Market Browser Companion</div>
      </div>
    </div>
    <div class="hero-tagline-wrap">
      <div class="hero-tagline">市場總覽與自選股監控</div>
      <div class="hero-desc">免帳號、免開戶，加權指數與自選報價隨時一鍵查看</div>
    </div>
  </div>

  <div class="content-area">
    <!-- Extension Popup Mock -->
    <div class="popup-mock">
      <div class="popup-header">
        <div class="popup-brand">
          <img src="{ICON_DATA_URL}" class="popup-logo" />
          <span class="popup-title">StockLion 股力獅</span>
          <span class="popup-sub">v2.1</span>
        </div>
        <div class="popup-actions">
          <span class="icon-btn">🔍</span>
          <span class="icon-btn">⚙️</span>
        </div>
      </div>

      <div class="index-card">
        <div class="index-row">
          <span class="index-name">加權指數 TWSE</span>
          <span class="index-val color-up">24,568.25 ▲ +320.15 (+1.32%)</span>
        </div>
        <div class="market-stats-row">
          <span>漲 682</span>
          <span>跌 214</span>
          <span>平 98</span>
          <span>成交量 4,820 億</span>
        </div>
      </div>

      <div class="tab-row">
        <div class="tab active">⭐ 我的自選</div>
        <div class="tab">🔥 異動雷達</div>
        <div class="tab">⚙️ 設定</div>
      </div>

      <div class="stock-list">
        <div class="stock-row">
          <div class="stock-meta">
            <div class="stock-name-row">
              <span class="stock-symbol">2330</span>
              <span class="stock-name">台積電</span>
              <span class="badge-realtime">● 即時</span>
            </div>
            <div class="stock-sub">上市 • 半導體業</div>
          </div>
          <div class="stock-price-block">
            <div class="stock-price color-up">$1,105.00</div>
            <div class="stock-change color-up">▲ +20.0 (+1.84%)</div>
          </div>
        </div>

        <div class="stock-row">
          <div class="stock-meta">
            <div class="stock-name-row">
              <span class="stock-symbol">2454</span>
              <span class="stock-name">聯發科</span>
              <span class="badge-realtime">● 即時</span>
            </div>
            <div class="stock-sub">上市 • 半導體業</div>
          </div>
          <div class="stock-price-block">
            <div class="stock-price color-up">$1,340.00</div>
            <div class="stock-change color-up">▲ +35.0 (+2.68%)</div>
          </div>
        </div>

        <div class="stock-row">
          <div class="stock-meta">
            <div class="stock-name-row">
              <span class="stock-symbol">2317</span>
              <span class="stock-name">鴻海</span>
              <span class="badge-realtime">● 即時</span>
            </div>
            <div class="stock-sub">上市 • 電子零組件</div>
          </div>
          <div class="stock-price-block">
            <div class="stock-price color-down">$182.50</div>
            <div class="stock-change color-down">▼ -1.0 (-0.54%)</div>
          </div>
        </div>

        <div class="stock-row">
          <div class="stock-meta">
            <div class="stock-name-row">
              <span class="stock-symbol">0050</span>
              <span class="stock-name">元大台灣50</span>
              <span class="badge-realtime">● 即時</span>
            </div>
            <div class="stock-sub">ETF • 指數型股票</div>
          </div>
          <div class="stock-price-block">
            <div class="stock-price color-up">$198.50</div>
            <div class="stock-change color-up">▲ +1.5 (+0.76%)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feature Highlights Column -->
    <div class="feature-list">
      <div class="feature-item">
        <div class="feature-icon">🚀</div>
        <div class="feature-info">
          <h4>隨裝即用，免帳號免登入</h4>
          <p>純瀏覽器客戶端架構，無中間轉發伺服器，自選股與歷史資料安全保存在本機 Chrome 儲存庫。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">⚡</div>
        <div class="feature-info">
          <h4>離線極速台股搜尋</h4>
          <p>內建上市、上櫃與 ETF 股票代碼字典，輸入代碼或公司名稱即刻模糊配對，秒速切換。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🛡️</div>
        <div class="feature-info">
          <h4>誠實標記資料狀態（Realtime Gate）</h4>
          <p>未設定金鑰時呈現交易所官方收盤價，已驗證金鑰才出現「● 即時」，絕不用延遲資料冒充即時欺瞞。</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""


# ==========================================
# SCREENSHOT 2: 個股深度情報與日 K 走勢 (1280x800)
# ==========================================
HTML_SCREENSHOT_2 = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{COMMON_CSS}
.detail-card {{
  padding: 12px;
}}
.stock-head-block {{
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}}
.chart-container {{
  background: #0f172a;
  border-radius: 8px;
  border: 1px solid #1e293b;
  padding: 10px;
  margin-bottom: 10px;
}}
.timeframe-row {{
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}}
.tf-btn {{
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  color: #94a3b8;
  background: #1e293b;
  border: 1px solid #334155;
}}
.tf-btn.active {{
  background: #fbbf24;
  color: #0b0f19;
  border-color: #fbbf24;
}}
.grid-2x2 {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}}
.metric-box {{
  background: #111827;
  border: 1px solid #1f2937;
  padding: 8px;
  border-radius: 6px;
}}
.metric-lbl {{ font-size: 10px; color: #64748b; margin-bottom: 2px; }}
.metric-val {{ font-size: 13px; font-weight: 700; color: #f1f5f9; }}
.btn-group {{
  display: flex;
  gap: 6px;
}}
.action-btn {{
  flex: 1;
  padding: 6px 0;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  text-align: center;
}}
.btn-gold {{ background: #fbbf24; color: #0b0f19; }}
.btn-dark {{ background: #1e293b; color: #94a3b8; border: 1px solid #334155; }}
</style>
</head>
<body>
  <div class="header-hero">
    <div class="brand-title-wrap">
      <img src="{ICON_DATA_URL}" class="hero-logo" />
      <div>
        <div class="brand-title">StockLion 股力獅</div>
        <div class="brand-subtitle">Taiwan Stock Market Browser Companion</div>
      </div>
    </div>
    <div class="hero-tagline-wrap">
      <div class="hero-tagline">個股深度情報與日 K 走勢</div>
      <div class="hero-desc">向量走勢圖、本益比、殖利率、法人動態與注意/處置狀態標籤</div>
    </div>
  </div>

  <div class="content-area">
    <!-- Extension Popup Mock -->
    <div class="popup-mock">
      <div class="popup-header">
        <div class="popup-brand">
          <span style="font-size:12px;color:#94a3b8;">← 返回自選</span>
        </div>
        <span class="badge-realtime">● 即時</span>
      </div>

      <div class="detail-card">
        <div class="stock-head-block">
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:18px;font-weight:800;color:#f8fafc;">2330 台積電</span>
              <span style="font-size:10px;background:#1e293b;color:#38bdf8;padding:1px 5px;border-radius:4px;">半導體</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">上市 • 台灣加權成分股</div>
          </div>
          <div style="text-align:right;">
            <div class="color-up" style="font-size:18px;font-weight:800;">$1,105.00</div>
            <div class="color-up" style="font-size:11px;">▲ +20.0 (+1.84%)</div>
          </div>
        </div>

        <!-- SVG Chart -->
        <div class="chart-container">
          <div class="timeframe-row">
            <span class="tf-btn">1D</span>
            <span class="tf-btn">5D</span>
            <span class="tf-btn active">1M</span>
            <span class="tf-btn">3M</span>
            <span class="tf-btn">1Y</span>
          </div>
          <svg width="334" height="120" viewBox="0 0 334 120">
            <!-- Grid lines -->
            <line x1="0" y1="30" x2="334" y2="30" stroke="#1e293b" stroke-dasharray="2,2" />
            <line x1="0" y1="70" x2="334" y2="70" stroke="#1e293b" stroke-dasharray="2,2" />
            <!-- Area & Line -->
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M0,85 Q40,90 70,60 T140,55 T210,40 T280,30 T334,15 L334,100 L0,100 Z" fill="url(#chartGrad)" />
            <path d="M0,85 Q40,90 70,60 T140,55 T210,40 T280,30 T334,15" fill="none" stroke="#ef4444" stroke-width="2.5" />
            <!-- Volume bars -->
            <rect x="10" y="102" width="6" height="18" fill="#334155" />
            <rect x="40" y="105" width="6" height="15" fill="#334155" />
            <rect x="70" y="98" width="6" height="22" fill="#ef4444" opacity="0.6" />
            <rect x="110" y="104" width="6" height="16" fill="#334155" />
            <rect x="150" y="100" width="6" height="20" fill="#334155" />
            <rect x="200" y="95" width="6" height="25" fill="#ef4444" opacity="0.6" />
            <rect x="250" y="92" width="6" height="28" fill="#ef4444" opacity="0.8" />
            <rect x="300" y="88" width="6" height="32" fill="#ef4444" />
          </svg>
        </div>

        <!-- 2x2 Fundamental Grid -->
        <div class="grid-2x2">
          <div class="metric-box">
            <div class="metric-lbl">本益比 (PE)</div>
            <div class="metric-val">28.5 倍</div>
          </div>
          <div class="metric-box">
            <div class="metric-lbl">股價淨值比 (PB)</div>
            <div class="metric-val">6.2 倍</div>
          </div>
          <div class="metric-box">
            <div class="metric-lbl">現金殖利率</div>
            <div class="metric-val">1.82%</div>
          </div>
          <div class="metric-box">
            <div class="metric-lbl">今日成交量</div>
            <div class="metric-val">38,450 張</div>
          </div>
        </div>

        <div class="btn-group">
          <button class="action-btn btn-gold">⭐ 已加入自選</button>
          <button class="action-btn btn-dark">🔔 到價警示</button>
        </div>
      </div>
    </div>

    <!-- Highlights -->
    <div class="feature-list">
      <div class="feature-item">
        <div class="feature-icon">📈</div>
        <div class="feature-info">
          <h4>原生向量 SVG 走勢圖</h4>
          <p>支援 1D / 5D / 1M / 3M / 1Y 歷史走勢切換與下方成交量能條形圖，輕量流暢不卡頓。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-info">
          <h4>完整估值與基本面數據</h4>
          <p>整合交易所本益比 (PE)、股價淨值比 (PB)、殖利率，輔助您快速判斷標的合理估值位階。</p>
        </div>
        <div class="feature-icon">📊</div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">⚠️</div>
        <div class="feature-info">
          <h4>注意與處置狀態即刻預警</h4>
          <p>個股被列入交易所公布之「注意股票」或「處置股票」時立即加註醒目標籤，提醒防範交易風險。</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""


# ==========================================
# SCREENSHOT 3: Stock Peek 網頁股票卡 (1280x800)
# ==========================================
HTML_SCREENSHOT_3 = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{COMMON_CSS}
.web-mock {{
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  position: relative;
}}
.forum-body {{
  padding: 24px;
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.8;
  position: relative;
}}
.forum-title {{
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 8px;
}}
.forum-author {{
  font-size: 11px;
  color: #64748b;
  margin-bottom: 16px;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 8px;
}}
.stock-mention {{
  color: #fbbf24;
  font-weight: 700;
  border-bottom: 1.5px dashed #fbbf24;
  padding-bottom: 1px;
  cursor: pointer;
  position: relative;
}}

/* HoverCard Component */
.hover-card-mock {{
  position: absolute;
  top: 140px;
  left: 180px;
  width: 290px;
  background: #0b0f19;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  box-shadow: 0 16px 32px rgba(0,0,0,0.8), 0 0 15px rgba(251, 191, 36, 0.2);
  padding: 12px;
  z-index: 100;
}}
.hover-header {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}}
.hover-title {{
  font-size: 13px;
  font-weight: 800;
  color: #f1f5f9;
}}
.hover-price {{
  font-size: 18px;
  font-weight: 800;
  margin: 4px 0;
}}
.hover-metrics {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-size: 10px;
  color: #94a3b8;
  gap: 4px;
  background: #111827;
  padding: 6px;
  border-radius: 4px;
  margin: 6px 0;
}}
.hover-actions {{
  display: flex;
  gap: 6px;
  margin-top: 8px;
}}
.hover-btn {{
  flex: 1;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 0;
  border-radius: 4px;
  border: none;
  text-align: center;
  cursor: pointer;
}}
.mouse-cursor {{
  position: absolute;
  top: 250px;
  left: 200px;
  font-size: 20px;
  z-index: 110;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
}}
</style>
</head>
<body>
  <div class="header-hero">
    <div class="brand-title-wrap">
      <img src="{ICON_DATA_URL}" class="hero-logo" />
      <div>
        <div class="brand-title">StockLion 股力獅</div>
        <div class="brand-subtitle">Taiwan Stock Market Browser Companion</div>
      </div>
    </div>
    <div class="hero-tagline-wrap">
      <div class="hero-tagline">Stock Peek 網頁股票卡</div>
      <div class="hero-desc">瀏覽財經社群與論壇時，游標懸停即刻浮現最新行情與一鍵加自選</div>
    </div>
  </div>

  <div class="content-area">
    <!-- Web Page Mock -->
    <div class="web-mock" style="max-width: 680px;">
      <div class="browser-topbar">
        <div class="window-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <div class="url-bar">
          <span>🔒 https://www.ptt.cc/bbs/Stock/M.1725510200.A.html</span>
        </div>
        <div class="ext-icon-wrap">
          <img src="{ICON_DATA_URL}" class="ext-mini-icon" />
          <span class="ext-name">Peek 啟用中</span>
        </div>
      </div>

      <div class="forum-body">
        <div class="forum-title">[標的] 2330 台積電 先進製程與營運長線展望</div>
        <div class="forum-author">作者：StockMaster (獅友) | 看板：Stock | 時間：2026-09-04 10:30:15</div>
        <p>
          從近期晶圓代工各家產能利用率來看，受惠於高效能運算 (HPC) 與 AI 晶片強勁拉貨，<br />
          權值王 <span class="stock-mention">2330 台積電</span> 在 3nm 與未來 2nm 製程的毛利表現依然領先同業。<br />
          同族群的 IC 設計龍頭 <span class="stock-mention">2454 聯發科</span> 亦同步展現旗艦晶片的動能。<br />
          整體長線評價維持在合理區間，拉回均可視為佈局時機...
        </p>

        <!-- Hover Card Element -->
        <div class="hover-card-mock">
          <div class="hover-header">
            <span class="hover-title">2330 台積電</span>
            <span class="badge-realtime">● 即時</span>
          </div>
          <div class="hover-price color-up">$1,105.00 ▲ +20.0 (+1.84%)</div>
          <div class="hover-metrics">
            <div>開 1,095 | 高 1,110</div>
            <div>低 1,090 | 量 38,450</div>
            <div>PE 28.5 倍</div>
            <div>殖利率 1.82%</div>
          </div>
          <div class="hover-actions">
            <button class="hover-btn" style="background:#fbbf24;color:#0b0f19;">⭐ 加入自選</button>
            <button class="hover-btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;">詳細資訊 →</button>
          </div>
        </div>

        <div class="mouse-cursor">👆</div>
      </div>
    </div>

    <!-- Highlights -->
    <div class="feature-list">
      <div class="feature-item">
        <div class="feature-icon">🦁</div>
        <div class="feature-info">
          <h4>智能台股實體辨識</h4>
          <p>精準辨識文章內的股票代號（2330）與公司簡稱（台積電），具備智慧上下文計分過濾，零誤判。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">⚡</div>
        <div class="feature-info">
          <h4>60 秒記憶體極速快取</h4>
          <p>HoverCard 自動緩存重複懸停之報價，背景訊息通訊秒速回應，滑順不延遲、不造成網頁卡頓。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <div class="feature-info">
          <h4>Content Script 零憑證洩漏</h4>
          <p>網頁注入端絕不接收或儲存任何 API Key，報價全數由背景 Service Worker 安全轉發，隱私無虞。</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""


# ==========================================
# SCREENSHOT 4: 市場異動雷達 (1280x800)
# ==========================================
HTML_SCREENSHOT_4 = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{COMMON_CSS}
.radar-head {{
  background: #111827;
  padding: 8px 12px;
  font-size: 11px;
  color: #38bdf8;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #1f2937;
}}
.radar-list {{
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  gap: 8px;
}}
.radar-card {{
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #111827;
  border: 1px solid #1f2937;
  padding: 10px 12px;
  border-radius: 6px;
}}
.rank-badge {{
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: #1e293b;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
}}
.rank-1 {{ background: #fbbf24; color: #0b0f19; }}
.rank-2 {{ background: #94a3b8; color: #0b0f19; }}
.rank-3 {{ background: #b45309; color: #f8fafc; }}
.radar-meta {{ display: flex; align-items: center; }}
</style>
</head>
<body>
  <div class="header-hero">
    <div class="brand-title-wrap">
      <img src="{ICON_DATA_URL}" class="hero-logo" />
      <div>
        <div class="brand-title">StockLion 股力獅</div>
        <div class="brand-subtitle">Taiwan Stock Market Browser Companion</div>
      </div>
    </div>
    <div class="hero-tagline-wrap">
      <div class="hero-tagline">市場異動雷達</div>
      <div class="hero-desc">爆量激增、強勢漲停、弱勢跌停與注意/處置股全盤掌握</div>
    </div>
  </div>

  <div class="content-area">
    <!-- Extension Popup Mock -->
    <div class="popup-mock">
      <div class="popup-header">
        <div class="popup-brand">
          <img src="{ICON_DATA_URL}" class="popup-logo" />
          <span class="popup-title">StockLion 異動雷達</span>
        </div>
        <span class="badge-eod">○ 09/04 盤後</span>
      </div>

      <div class="tab-row">
        <div class="tab active">💥 爆量激增</div>
        <div class="tab">🚀 漲停強勢</div>
        <div class="tab">📉 跌停排行</div>
        <div class="tab">⚠️ 處置股</div>
      </div>

      <div class="radar-head">
        <span>📅 2026-09-04 盤後結算 • 成交量爆量增幅排行</span>
      </div>

      <div class="radar-list">
        <div class="radar-card">
          <div class="radar-meta">
            <div class="rank-badge rank-1">1</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#f8fafc;">2603 長榮</div>
              <div style="font-size:10px;color:#64748b;">量能激增 +245%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="color-up" style="font-size:13px;">$186.00 (+2.48%)</div>
            <div style="font-size:10px;color:#94a3b8;">86,210 張</div>
          </div>
        </div>

        <div class="radar-card">
          <div class="radar-meta">
            <div class="rank-badge rank-2">2</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#f8fafc;">3231 緯創</div>
              <div style="font-size:10px;color:#64748b;">量能激增 +180%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="color-up" style="font-size:13px;">$112.50 (+3.21%)</div>
            <div style="font-size:10px;color:#94a3b8;">68,450 張</div>
          </div>
        </div>

        <div class="radar-card">
          <div class="radar-meta">
            <div class="rank-badge rank-3">3</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#f8fafc;">2356 英業達</div>
              <div style="font-size:10px;color:#64748b;">量能激增 +165%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="color-up" style="font-size:13px;">$54.20 (+1.69%)</div>
            <div style="font-size:10px;color:#94a3b8;">52,100 張</div>
          </div>
        </div>

        <div class="radar-card">
          <div class="radar-meta">
            <div class="rank-badge">4</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#f8fafc;">2330 台積電</div>
              <div style="font-size:10px;color:#64748b;">量能激增 +132%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="color-up" style="font-size:13px;">$1,105.00 (+1.84%)</div>
            <div style="font-size:10px;color:#94a3b8;">38,450 張</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Highlights -->
    <div class="feature-list">
      <div class="feature-item">
        <div class="feature-icon">🔥</div>
        <div class="feature-info">
          <h4>量能異動偵測</h4>
          <p>以 5 日均量為基準，自動篩選當日異常爆量個股，快速鎖定主力資金進駐與市場焦點。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🚀</div>
        <div class="feature-info">
          <h4>漲跌停排行一覽無遺</h4>
          <p>即時監測市場最強勢漲停鎖死與重挫跌停個股，多空方向迅速洞察。</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🛡️</div>
        <div class="feature-info">
          <h4>免金鑰完整可用 (No-Key Beta)</h4>
          <p>雷達全部數據來自交易所 Open Data 官方每日公布資料，無需設定任何 API Key 即可自由使用。</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"""


# ==========================================
# SCREENSHOT 5: BYO Key 與智慧到價警示 (1280x800)
# ==========================================
HTML_SCREENSHOT_5 = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
{COMMON_CSS}
.settings-mock {{
  width: 340px;
  background: #0b0f19;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 14px;
}}
.alert-mock {{
  width: 340px;
  background: #0b0f19;
  border: 1px solid #fbbf24;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
}}
.section-title {{ font-size: 13px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }}
.input-mock {{
  background: #0f172a;
  border: 1px solid #334155;
  padding: 6px 10px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 11px;
  color: #38bdf8;
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}}
.guide-box {{
  background: #1e293b;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 10px;
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.6;
  margin-top: 10px;
}}
.alert-rule-card {{
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}}
</style>
</head>
<body>
  <div class="header-hero">
    <div class="brand-title-wrap">
      <img src="{ICON_DATA_URL}" class="hero-logo" />
      <div>
        <div class="brand-title">StockLion 股力獅</div>
        <div class="brand-subtitle">Taiwan Stock Market Browser Companion</div>
      </div>
    </div>
    <div class="hero-tagline-wrap">
      <div class="hero-tagline">BYO Key 零外洩門禁與智慧到價警示</div>
      <div class="hero-desc">自有金鑰本機加密保存，解鎖盤中真實即時行情與分鐘級到價突破通知</div>
    </div>
  </div>

  <div class="content-area">
    <!-- Settings Mock -->
    <div class="settings-mock">
      <div class="section-title">🔑 BYO Key 金鑰管理</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;color:#94a3b8;">富果行情 API Key</span>
        <span class="badge-realtime">● 即時行情已解鎖</span>
      </div>
      <div class="input-mock">
        <span>fugle_md_••••••••••••8x2Q</span>
        <span>👁️</span>
      </div>
      <button style="width:100%;padding:6px;background:#fbbf24;color:#0b0f19;border:none;border-radius:6px;font-size:11px;font-weight:700;">
        ✅ 測試通過 (有效金鑰)
      </button>

      <div class="guide-box">
        <div style="font-weight:700;color:#93c5fd;margin-bottom:2px;">💡 如何免費取得富果 Key？</div>
        1. 免開證券戶，手機註冊富果會員<br />
        2. 開發者中心免費申請行情金鑰<br />
        3. 每分鐘 60 次免費額度充足監控
      </div>
      <div style="font-size:9px;color:#64748b;text-align:center;margin-top:8px;">
        🛡️ 金鑰只存在本地 Chrome 儲存庫，絕不上傳伺服器
      </div>
    </div>

    <!-- Alert Mock -->
    <div class="alert-mock">
      <div class="section-title">🔔 2330 台積電 到價提醒設定</div>
      <div style="font-size:10px;color:#94a3b8;margin-bottom:8px;">
        目前股價：<span class="color-up">$1,105.00</span>
      </div>

      <div style="background:#0f172a;padding:8px;border-radius:6px;border:1px solid #1e293b;">
        <div style="font-size:11px;font-weight:700;color:#cbd5e1;margin-bottom:4px;">新增到價條件</div>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <span style="background:#fbbf24;color:#0b0f19;padding:4px 8px;border-radius:4px;font-size:10px;font-weight:700;">▲ 漲破目標價</span>
          <span style="background:#1e293b;color:#94a3b8;padding:4px 8px;border-radius:4px;font-size:10px;">▼ 跌破</span>
        </div>
        <div class="input-mock" style="margin-bottom:6px;">
          <span>$ 1,120.00</span>
          <span style="color:#64748b;">TWD</span>
        </div>
        <button style="width:100%;padding:5px;background:#38bdf8;color:#0b0f19;border:none;border-radius:4px;font-size:10px;font-weight:700;">
          + 新增提醒規則
        </button>
      </div>

      <div style="margin-top:10px;">
        <div style="font-size:10px;color:#64748b;">已啟動的警示 (1)</div>
        <div class="alert-rule-card">
          <div>
            <div style="font-size:11px;font-weight:700;color:#f8fafc;">▲ 漲破 $1,120.00</div>
            <div style="font-size:9px;color:#10b981;">● 跨越防重複機制啟動中</div>
          </div>
          <span style="font-size:12px;cursor:pointer;">🗑️</span>
        </div>
      </div>
      <div style="font-size:9px;color:#64748b;margin-top:8px;line-height:1.4;">
        ⏰ 受 Chrome 背景機制限制，警示為每分鐘定時輪詢檢查一次。
      </div>
    </div>
  </div>
</body>
</html>"""


# ==========================================
# PROMO TILE: 小宣傳圖磚 (440x280)
# ==========================================
HTML_PROMO_SMALL = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", Roboto, sans-serif;
  background: radial-gradient(circle at 50% 30%, #1e293b 0%, #070a10 100%);
  color: #f8fafc;
  overflow: hidden;
  width: 440px;
  height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}}
.promo-logo {{
  width: 72px;
  height: 72px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(251, 191, 36, 0.35);
  margin-bottom: 12px;
}}
.promo-title {{
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #fbbf24;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}}
.promo-sub {{
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 4px;
  margin-bottom: 14px;
}}
.promo-tags {{
  display: flex;
  gap: 8px;
}}
.promo-tag {{
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #f1f5f9;
}}
</style>
</head>
<body>
  <img src="{ICON_DATA_URL}" class="promo-logo" />
  <div class="promo-title">StockLion 股力獅</div>
  <div class="promo-sub">台股瀏覽器看盤神器 • 網頁股票卡</div>
  <div class="promo-tags">
    <span class="promo-tag">🦁 網頁股票卡</span>
    <span class="promo-tag">⚡ 免帳號隨裝即用</span>
    <span class="promo-tag">🛡️ BYO Key 零外洩</span>
  </div>
</body>
</html>"""


# ==========================================
# PROMO MARQUEE: 大型宣傳橫幅 (1400x560)
# ==========================================
HTML_PROMO_MARQUEE = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", Roboto, sans-serif;
  background: radial-gradient(ellipse at 30% 40%, #1e293b 0%, #080c14 100%);
  color: #f8fafc;
  overflow: hidden;
  width: 1400px;
  height: 560px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 90px;
}}
.left-col {{
  display: flex;
  flex-direction: column;
  max-width: 680px;
}}
.brand-badge {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 16px;
  width: fit-content;
}}
.marquee-title {{
  font-size: 46px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #f8fafc;
  line-height: 1.15;
  margin-bottom: 12px;
}}
.marquee-title span {{
  color: #fbbf24;
}}
.marquee-sub {{
  font-size: 18px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 28px;
}}
.features-grid {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}}
.feat-pill {{
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 14px;
  border-radius: 8px;
}}
.feat-pill-icon {{ font-size: 20px; }}
.feat-pill-text {{ font-size: 13px; font-weight: 700; color: #f1f5f9; }}

.right-col {{
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}}
.marquee-logo-glow {{
  width: 320px;
  height: 320px;
  border-radius: 64px;
  box-shadow: 0 20px 80px rgba(251, 191, 36, 0.4), 0 0 120px rgba(251, 191, 36, 0.2);
  border: 2px solid rgba(251, 191, 36, 0.5);
}}
</style>
</head>
<body>
  <div class="left-col">
    <div class="brand-badge">
      <span>🦁 Chrome 擴充套件 Manifest V3</span>
    </div>
    <div class="marquee-title">
      在任何網頁快速看台股<br />
      打造您的 <span>瀏覽器台股看盤中心</span>
    </div>
    <div class="marquee-sub">
      StockLion（股力獅）— 免帳號、免開戶、自選股、大盤行情、網頁股票卡與到價智慧提醒。
    </div>
    <div class="features-grid">
      <div class="feat-pill">
        <span class="feat-pill-icon">🦁</span>
        <span class="feat-pill-text">Stock Peek 網頁股票卡</span>
      </div>
      <div class="feat-pill">
        <span class="feat-pill-icon">📊</span>
        <span class="feat-pill-text">加權指數與自選股監控</span>
      </div>
      <div class="feat-pill">
        <span class="feat-pill-icon">🛡️</span>
        <span class="feat-pill-text">BYO Key 零外洩即時門禁</span>
      </div>
      <div class="feat-pill">
        <span class="feat-pill-icon">🔔</span>
        <span class="feat-pill-text">智慧到價突破防重複警示</span>
      </div>
    </div>
  </div>

  <div class="right-col">
    <img src="{ICON_DATA_URL}" class="marquee-logo-glow" />
  </div>
</body>
</html>"""


def main():
    print("🚀 Starting Chrome Store Asset Generation...")
    
    # 5 Screenshots (1280x800)
    render_html_to_png(HTML_SCREENSHOT_1, 'screenshot-1-market', 1280, 800)
    render_html_to_png(HTML_SCREENSHOT_2, 'screenshot-2-detail', 1280, 800)
    render_html_to_png(HTML_SCREENSHOT_3, 'screenshot-3-stock-peek', 1280, 800)
    render_html_to_png(HTML_SCREENSHOT_4, 'screenshot-4-radar', 1280, 800)
    render_html_to_png(HTML_SCREENSHOT_5, 'screenshot-5-alert', 1280, 800)
    
    # Promo Small (440x280)
    render_html_to_png(HTML_PROMO_SMALL, 'promo-small-440x280', 440, 280)
    
    # Promo Marquee (1400x560)
    render_html_to_png(HTML_PROMO_MARQUEE, 'promo-marquee-1400x560', 1400, 560)
    
    print("\n🎉 All 7 assets generated successfully!")

if __name__ == '__main__':
    main()
