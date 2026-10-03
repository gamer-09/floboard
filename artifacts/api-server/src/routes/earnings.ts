import { Router } from "express";
import YahooFinance from "yahoo-finance2";

const router = Router();
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const DEFAULT_WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "NFLX",
  "JPM", "GS", "BAC", "V", "MA", "WMT", "XOM", "JNJ", "PG", "HD",
  "ORCL", "AMD", "INTC", "AVGO", "CRM", "UBER", "ABNB", "COIN",
  "UNH", "CVX", "DIS", "PYPL", "SHOP", "SNAP", "SPOT", "TSM",
];

router.get("/earnings", async (req, res) => {
  const rawSyms = typeof req.query.symbols === "string" ? req.query.symbols.split(",").map(s => s.trim()).filter(Boolean) : DEFAULT_WATCHLIST;
  const symbols = rawSyms.length > 0 ? rawSyms : DEFAULT_WATCHLIST;

  try {
    const results = await Promise.allSettled(
      symbols.map((sym) =>
        yf.quoteSummary(sym, { modules: ["calendarEvents", "price"] })
      )
    );

    const weeksRaw = Number(req.query.weeks);
    const weeks = weeksRaw >= 1 && weeksRaw <= 52 ? weeksRaw : 8;
    const now = Date.now();
    const past = now - 3 * 24 * 60 * 60 * 1000;
    const future = now + weeks * 7 * 24 * 60 * 60 * 1000;

    const earnings: Array<{
      sym: string;
      name: string;
      date: string;
      epsEst: number | null;
      revenueEst: number | null;
      price: number | null;
      changePct: number | null;
    }> = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const d = r.value;
      const p = d.price;
      const cal = d.calendarEvents;
      const dates = (cal as { earnings?: { earningsDate?: Date[] } })?.earnings?.earningsDate;
      if (!dates?.length) continue;

      const earningsDate = dates[0];
      if (!earningsDate) continue;
      const ts = new Date(earningsDate).getTime();
      if (ts < past || ts > future) continue;

      const cal2 = cal as {
        earnings?: {
          earningsAverage?: number | null;
          revenueAverage?: number | null;
        };
      };

      earnings.push({
        sym: symbols[i],
        name: (p?.shortName || p?.longName || symbols[i]) as string,
        date: new Date(earningsDate).toISOString(),
        epsEst: cal2.earnings?.earningsAverage ?? null,
        revenueEst: cal2.earnings?.revenueAverage ?? null,
        price: (p?.regularMarketPrice ?? null) as number | null,
        changePct: (p?.regularMarketChangePercent ?? null) as number | null,
      });
    }

    earnings.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({ earnings });
  } catch (err) {
    req.log?.debug({ err }, "Earnings lookup failed");
    res.json({ earnings: [] });
  }
});

export default router;
