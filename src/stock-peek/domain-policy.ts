export const DEFAULT_ALLOWED_DOMAINS = [
  'ptt.cc',
  'tw.stock.yahoo.com',
  'cnyes.com',
  'threads.com',
  'threads.net',
  'money.udn.com',
  'ctee.com.tw',
];

export class DomainPolicy {
  private allowedDomains: Set<string>;

  constructor(domains: string[] = DEFAULT_ALLOWED_DOMAINS) {
    this.allowedDomains = new Set(domains.map((d) => d.toLowerCase()));
  }

  isAllowed(urlOrHostname: string): boolean {
    try {
      let hostname = urlOrHostname.toLowerCase();
      if (urlOrHostname.startsWith('http://') || urlOrHostname.startsWith('https://')) {
        const parsed = new URL(urlOrHostname);
        // 特殊檢查：PTT 必須在 Stock 板
        if (parsed.hostname.includes('ptt.cc')) {
          return parsed.pathname.includes('/bbs/Stock/');
        }
        hostname = parsed.hostname;
      }

      for (const domain of this.allowedDomains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const domainPolicy = new DomainPolicy();
