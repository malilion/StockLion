import { describe, it, expect } from 'vitest';
import { domainPolicy } from '../../../src/stock-peek/domain-policy';

describe('DomainPolicy', () => {
  it('should allow whitelisted domains', () => {
    expect(domainPolicy.isAllowed('https://tw.stock.yahoo.com/quote/2330')).toBe(true);
    expect(domainPolicy.isAllowed('https://www.cnyes.com/twstock/2330')).toBe(true);
    expect(domainPolicy.isAllowed('https://www.threads.net/@user/post/123')).toBe(true);
    expect(domainPolicy.isAllowed('https://money.udn.com/money/story/5607/8000')).toBe(true);
  });

  it('should strictly verify PTT Stock board path', () => {
    expect(domainPolicy.isAllowed('https://www.ptt.cc/bbs/Stock/M.123.A.html')).toBe(true);
    // Non-Stock board in PTT should NOT be allowed
    expect(domainPolicy.isAllowed('https://www.ptt.cc/bbs/Gossiping/M.123.A.html')).toBe(false);
  });

  it('should reject non-whitelisted domains', () => {
    expect(domainPolicy.isAllowed('https://www.facebook.com')).toBe(false);
    expect(domainPolicy.isAllowed('https://www.google.com')).toBe(false);
    expect(domainPolicy.isAllowed('https://shopee.tw')).toBe(false);
  });
});
