import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Shared mock functions so every route file that constructs a YahooFinance
// instance (market, chat, news, earnings) uses the same controllable stubs.
const { quoteMock, chartMock, searchMock, quoteSummaryMock } = vi.hoisted(() => ({
  quoteMock: vi.fn(),
  chartMock: vi.fn(),
  searchMock: vi.fn(),
  quoteSummaryMock: vi.fn(),
}));

vi.mock('yahoo-finance2', () => ({
  default: class MockYahooFinance {
    quote = quoteMock;
    chart = chartMock;
    search = searchMock;
    quoteSummary = quoteSummaryMock;
  },
}));

// Import after mocking so the routers pick up the stubbed class
const { default: app } = await import('../app');

function makeQuote(symbol: string, overrides: Record<string, unknown> = {}) {
  return {
    symbol,
    shortName: `${symbol} Inc.`,
    quoteType: 'EQUITY',
    currency: 'USD',
    regularMarketPrice: 150.25,
    regularMarketChangePercent: 1.25,
    regularMarketChange: 1.85,
    regularMarketPreviousClose: 148.4,
    regularMarketOpen: 149.0,
    regularMarketDayHigh: 151.0,
    regularMarketDayLow: 148.9,
    regularMarketVolume: 1234567,
    fiftyTwoWeekHigh: 200.0,
    fiftyTwoWeekLow: 100.0,
    marketCap: 2_500_000_000_000,
    ...overrides,
  };
}

describe('GET /api/market', () => {
  it('returns 400 when the symbols query param is missing', async () => {
    const res = await request(app).get('/api/market');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('symbols');
  });

  it('returns an empty results array when symbols is blank', async () => {
    const res = await request(app).get('/api/market?symbols=,,,');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ results: [] });
  });

  it('returns the correct response shape with one result per requested symbol', async () => {
    quoteMock.mockResolvedValue(makeQuote('AAPL'));

    const res = await request(app).get('/api/market?symbols=AAPL');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(1);

    const q = res.body.results[0];
    expect(q.symbol).toBe('AAPL');
    expect(typeof q.regularMarketPrice).toBe('number');
    expect(typeof q.regularMarketChangePercent).toBe('number');
    expect(typeof q.regularMarketPreviousClose).toBe('number');
    expect(typeof q.marketCap).toBe('number');
  });

  it('stamps each result with the *requested* symbol even if Yahoo normalises it', async () => {
    // Yahoo often returns "BRK.B" for the requested "BRK-B"
    quoteMock.mockResolvedValue(makeQuote('BRK.B'));

    const res = await request(app).get('/api/market?symbols=BRK-B');
    expect(res.status).toBe(200);
    expect(res.body.results[0].symbol).toBe('BRK-B');
  });

  it('omits a symbol when Yahoo Finance fails instead of inventing a price', async () => {
    quoteMock.mockRejectedValue(new Error('Yahoo Finance rate limited'));

    const res = await request(app).get('/api/market?symbols=AAPL,MSFT');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('returns only live quotes when some lookups fail', async () => {
    quoteMock
      .mockResolvedValueOnce(makeQuote('AAPL'))
      .mockRejectedValueOnce(new Error('boom'));

    const res = await request(app).get('/api/market?symbols=AAPL,NVDA');
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);

    const aapl = res.body.results.find((r: { symbol: string }) => r.symbol === 'AAPL');
    const nvda = res.body.results.find((r: { symbol: string }) => r.symbol === 'NVDA');
    expect(aapl.regularMarketPrice).toBe(150.25);
    expect(nvda).toBeUndefined();
  });

  it('caps the number of symbols at 200', async () => {
    quoteMock.mockResolvedValue(makeQuote('X'));
    const symbols = Array.from({ length: 250 }, (_, i) => `S${i}`);
    const res = await request(app).get(`/api/market?symbols=${symbols.join(',')}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(200);
  });

  it('resolves symbol aliases (e.g. XAU/USD -> GC=F) before querying Yahoo', async () => {
    quoteMock.mockResolvedValue(makeQuote('GC=F'));
    await request(app).get('/api/market?symbols=XAU/USD');
    expect(quoteMock).toHaveBeenCalledWith(
      'GC=F',
      expect.anything(),
      expect.anything()
    );
  });
});
