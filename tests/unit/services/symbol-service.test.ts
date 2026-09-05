import { describe, it, expect, beforeEach } from 'vitest';
import { SymbolService } from '../../../src/services/symbol-service';

describe('SymbolService (Offline Search)', () => {
  let service: SymbolService;

  beforeEach(() => {
    service = new SymbolService();
  });

  it('should find stocks by exact symbol', () => {
    const results = service.search('2330');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('2330');
    expect(results[0].name).toBe('台積電');
    expect(results[0].instrumentType).toBe('stock');
  });

  it('should find stocks by symbol prefix', () => {
    const results = service.search('23');
    const symbols = results.map((r) => r.symbol);
    expect(symbols).toContain('2330');
    expect(symbols).toContain('2317');
  });

  it('should find stocks by full name and name prefix', () => {
    const full = service.search('台積電');
    expect(full.length).toBeGreaterThan(0);
    expect(full[0].symbol).toBe('2330');

    const prefix = service.search('台積');
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix[0].symbol).toBe('2330');
  });

  it('should correctly classify ETFs', () => {
    const etf0050 = service.getBySymbol('0050');
    expect(etf0050).not.toBeNull();
    expect(etf0050?.instrumentType).toBe('etf');

    const etf0056 = service.getBySymbol('0056');
    expect(etf0056?.instrumentType).toBe('etf');
  });

  it('should return empty array for non-matching queries', () => {
    const results = service.search('XYZ999999');
    expect(results).toEqual([]);
  });
});
