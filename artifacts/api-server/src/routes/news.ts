import YahooFinance from "yahoo-finance2";
import { Router } from "express";

const router = Router();
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface NewsItem {
  src: string;
  title: string;
  tag: "bull" | "bear" | "neutral";
  age: string;
  impact: string;
  url?: string;
}

function relativeAge(publishedMs: number): string {
  let ts = publishedMs;
  // Yahoo sometimes already sends milliseconds.
  if (ts > 0 && ts < 1e12) ts *= 1000;
  const diff = Date.now() - ts;
  if (!Number.isFinite(diff) || diff < 0) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days > 400) return "";
  return `${days}d`;
}

function guessTag(title: string): "bull" | "bear" | "neutral" {
  const t = title.toLowerCase();
  const bullWords = [
    "surge", "soar", "rally", "gain", "record", "beat", "rise", "jump",
    "high", "boost", "profit", "growth", "strong", "optimis", "recover",
    "upturn", "bullish", "expan", "up ", "climbs", "advances", "hits new",
    "all-time", "rebounds", "outperform", "upgrade",
  ];
  const bearWords = [
    "fall", "drop", "crash", "decline", "loss", "miss", "slump", "tumble",
    "sink", "low", "weak", "concern", "risk", "warn", "cut", "layoff",
    "recession", "bearish", "contract", "sell-off", "plunge", "slide",
    "retreat", "downgrade", "fear", "debt", "deficit", "default",
  ];
  const bullScore = bullWords.filter((w) => t.includes(w)).length;
  const bearScore = bearWords.filter((w) => t.includes(w)).length;
  if (bullScore > bearScore) return "bull";
  if (bearScore > bullScore) return "bear";
  return "neutral";
}

// Maps keywords in a title to the sectors/assets actually affected
const ENTITY_MAP: Array<[RegExp, string]> = [
  [/\bfed\b|federal reserve|fomc|interest rate/i, "Federal Reserve & rate-sensitive sectors"],
  [/\binflation\b|cpi\b|pce\b|consumer price/i, "Inflation & bond markets"],
  [/\bbitcoin\b|\bbtc\b/i, "Bitcoin & crypto market"],
  [/\bethereum\b|\beth\b/i, "Ethereum & DeFi sector"],
  [/\bcrypto\b|blockchain/i, "Crypto market broadly"],
  [/\bnvidia\b|\bnvda\b/i, "Nvidia & semiconductor stocks"],
  [/\bapple\b|\baapl\b/i, "Apple & consumer tech"],
  [/\bmicrosoft\b|\bmsft\b/i, "Microsoft & cloud sector"],
  [/\btesla\b|\btsla\b/i, "Tesla & EV sector"],
  [/\bamazon\b|\bamzn\b/i, "Amazon & e-commerce"],
  [/\bgoogle\b|\balphabet\b|\bgoogl\b/i, "Alphabet & digital advertising"],
  [/\bmeta\b|\bfacebook\b/i, "Meta & social media stocks"],
  [/\boil\b|crude|opec|petroleum/i, "Oil prices & energy sector"],
  [/\bnatural gas\b/i, "Natural gas & utilities"],
  [/\bgold\b|\bxau\b/i, "Gold & precious metals"],
  [/\bsilver\b/i, "Silver & industrial metals"],
  [/\bchina\b|chinese|pbc\b|pboc\b/i, "China exposure & emerging markets"],
  [/\beurope\b|ecb\b|euro\b/i, "European markets & EUR/USD"],
  [/\bjapan\b|boj\b|yen\b/i, "Japanese markets & USD/JPY"],
  [/\btech\b|technology|ai\b|artificial intelligence/i, "Technology & AI sector"],
  [/\bbank\b|jpmorgan|goldman|morgan stanley|citigroup/i, "Banking & financial sector"],
  [/\bearnings\b|revenue\b|eps\b|quarterly results/i, "Equity valuations & sector rotation"],
  [/\bdollar\b|usd\b|forex\b|currency/i, "US Dollar & FX markets"],
  [/\btreasur\b|10.year|bond\b|yield\b/i, "Bond yields & fixed income"],
  [/\bhousing\b|real estate\b|mortgage/i, "Real estate & mortgage rates"],
  [/\bsemiconductor\b|chip\b/i, "Semiconductor supply chain"],
  [/\bsp 500\b|s&p 500\b|\bgspc\b/i, "S&P 500 & broad US equities"],
  [/\bnasdaq\b/i, "Nasdaq & growth stocks"],
  [/\btariff\b|trade war\b|import\b/i, "Trade policy & export stocks"],
  [/\brecession\b|gdp\b|economic growth/i, "Broader economy & cyclical stocks"],
];

function extractImpact(title: string): string {
  const found: string[] = [];
  for (const [pattern, label] of ENTITY_MAP) {
    if (pattern.test(title) && !found.includes(label)) {
      found.push(label);
      if (found.length >= 2) break;
    }
  }
  if (found.length > 0) return found.join(" · ");
  return "Broader market sentiment";
}

router.get("/news", async (req, res) => {
  const countParam = parseInt(String(req.query.count ?? "15"), 10);
  const articleLimit = [10, 15, 20].includes(countParam) ? countParam : 15;
  const queries = [
    "stock market today",
    "finance economy news",
    "crypto bitcoin ethereum",
    "federal reserve inflation",
    "earnings revenue results",
  ];

  try {
    const allNews: { item: NewsItem; ts: number }[] = [];
    const seen = new Set<string>();

    const results = await Promise.allSettled(
      queries.map((q) =>
        yf.search(q, { newsCount: 10, quotesCount: 0, enableNavLinks: false }, { validateResult: false })
      )
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      const data = r.value as {
        news?: Array<{
          title?: string;
          publisher?: string;
          providerPublishTime?: number;
          link?: string;
        }>;
      };
      if (!data?.news) continue;

      for (const n of data.news) {
        if (!n.title || seen.has(n.title)) continue;
        seen.add(n.title);
        const rawTs = n.providerPublishTime ?? 0;
        const ts = rawTs > 0 && rawTs < 1e12 ? rawTs * 1000 : rawTs;
        allNews.push({
          ts,
          item: {
            src: n.publisher ?? "News",
            title: n.title,
            tag: guessTag(n.title),
            age: ts > 0 ? relativeAge(ts) : "",
            impact: extractImpact(n.title),
            url: n.link,
          },
        });
      }
    }

    // Sort newest first, then cap at requested limit
    allNews.sort((a, b) => b.ts - a.ts);
    const final = allNews.slice(0, articleLimit).map((x) => x.item);

    res.json({ news: final });
  } catch (err) {
    req.log?.debug({ err }, "Failed to fetch news");
    res.json({ news: [] });
  }
});

export default router;
