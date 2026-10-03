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

const FALLBACK_NEWS_SERVER: NewsItem[] = [
  { title: "Global Markets Rally as Tech Sector Surges on Strong AI Earnings", src: "Reuters", age: "1h", impact: "Positive for technology and growth-oriented equities globally.", tag: "bull" },
  { title: "Federal Reserve Signals Patience on Rate Cuts Amid Economic Resilience", src: "Bloomberg", age: "2h", impact: "Supports US Dollar strength and stabilizes treasury bond yields.", tag: "neutral" },
  { title: "Gold and Silver Edge Higher as Demand for Safe-Haven Assets Continues", src: "Financial Times", age: "3h", impact: "Bullish momentum for precious metals and commodity-linked currencies.", tag: "bull" },
  { title: "Bitcoin Holds Ground Above Major Support Levels After Recent Consolidation", src: "CoinDesk", age: "4h", impact: "Positive sentiment across digital asset markets and Layer-1 protocols.", tag: "bull" },
  { title: "Crude Oil Inventories Shift as OPEC+ Evaluates Global Demand Forecasts", src: "WSJ", age: "5h", impact: "Key driver for energy stocks and commodity-exporting forex pairs.", tag: "neutral" },
  { title: "Central Banks in Europe and Asia Adjust Forex Interventions to Manage Volatility", src: "Nikkei Asia", age: "6h", impact: "Increases cross-pair trading opportunities and stabilizes emerging market FX.", tag: "neutral" },
  { title: "Semiconductor Index Rises on Surge in Enterprise AI Infrastructure Orders", src: "Investor's Business Daily", age: "7h", impact: "Bullish for chipmakers including NVDA, AVGO, and AMD.", tag: "bull" },
  { title: "Treasury Yield Curve Stabilizes as Inflation Expectations Moderate", src: "Reuters", age: "8h", impact: "Constructive for sovereign bond markets and rate-sensitive sectors.", tag: "neutral" },
  { title: "Ethereum DeFi Value Locked Reaches Multi-Month High Ahead of Network Upgrade", src: "Decrypt", age: "9h", impact: "Positive for Ethereum ecosystem tokens and decentralized finance.", tag: "bull" },
  { title: "Retail Sector Guidance Mixed as Consumer Spending Shifts Toward Services", src: "WSJ", age: "10h", impact: "Neutral to slightly cautious for consumer discretionary equities.", tag: "neutral" },
  { title: "Copper and Aluminum Futures Advance on Expanded Clean Energy Projects", src: "Bloomberg", age: "11h", impact: "Positive for industrial metals and mining sector equities.", tag: "bull" },
  { title: "European Central Bank Assesses Wage Growth Trajectory for Next Monetary Step", src: "Financial Times", age: "12h", impact: "Influences Euro crosses and eurozone bond yields.", tag: "neutral" },
  { title: "Solana Network Volume Surges on Increased Decentralized Trading Activity", src: "CoinDesk", age: "13h", impact: "Bullish momentum for SOL and ecosystem applications.", tag: "bull" },
  { title: "Pharmaceutical Giants Outline Pipeline Milestones for Coming Fiscal Quarter", src: "Reuters", age: "14h", impact: "Constructive for healthcare and biotech sector ETFs.", tag: "bull" },
  { title: "Japanese Yen Consolidates as BoJ Monitors Currency and Price Dynamics", src: "Nikkei Asia", age: "15h", impact: "Key watch point for USD/JPY and Asian foreign exchange pairs.", tag: "neutral" },
  { title: "Natural Gas Supplies Rebound Following Seasonal Production Maintenance", src: "Bloomberg", age: "16h", impact: "Stabilizes energy commodity pricing across regional hubs.", tag: "neutral" },
  { title: "Cloud Software Equities Attract Institutional Inflows Following Steady Results", src: "WSJ", age: "17h", impact: "Supports software leaders including PLTR, CRM, and NOW.", tag: "bull" },
  { title: "Ondo Tokenized Real-World Asset Platform Sees Record Treasury Inflows", src: "Decrypt", age: "18h", impact: "Highlights expanding adoption of RWA protocols in crypto.", tag: "bull" },
  { title: "Global Housing Market Data Indicates Resilience Despite Mortgage Rate Plateau", src: "Financial Times", age: "19h", impact: "Constructive for lumber futures and residential real estate sectors.", tag: "neutral" },
  { title: "Automakers Accelerate EV and Hybrid Platform Transition Across Global Markets", src: "Reuters", age: "20h", impact: "Important catalyst for automotive leaders including TSLA and F.", tag: "bull" },
];

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
