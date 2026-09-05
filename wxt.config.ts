import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'StockLion（股力獅）',
    description: 'Taiwan Stock Market Browser Companion - 在任何網頁快速查看台股、自選股、市場異動與快速資訊卡',
    version: '0.1.0',
    permissions: ['storage', 'notifications', 'alarms'],
    host_permissions: [
      'https://openapi.twse.com.tw/*',
      'https://www.tpex.org.tw/*',
    ],
    optional_host_permissions: [
      'https://api.fugle.tw/*',
    ],
  },
});
