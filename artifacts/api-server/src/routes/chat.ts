import { Router } from "express";
import YahooFinance from "yahoo-finance2";
import { rateLimit, sanitizeChatMessages, sanitizeExtraContext } from "../lib/security";

const router = Router();
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SERVER_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

function buildGeminiUrls(apiKey: string) {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    streamUrl: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
  };
}

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "N/A";
  if (Math.abs(n) >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) < 1) return `$${n.toFixed(6)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "N/A";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtVol(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "N/A";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

const KEYWORD_MAP: Array<[RegExp, string[]]> = [
  [/\bbtc\b|bitcoin/i, ["BTC-USD"]],
  [/\beth\b|ethereum/i, ["ETH-USD"]],
  [/\bbnb\b|binance/i, ["BNB-USD"]],
  [/\bsol\b|solana/i, ["SOL-USD"]],
  [/\bxrp\b|ripple/i, ["XRP-USD"]],
  [/\bdoge\b|dogecoin/i, ["DOGE-USD"]],
  [/\bada\b|cardano/i, ["ADA-USD"]],
  [/\bapple\b|\baapl\b/i, ["AAPL"]],
  [/\bmicrosoft\b|\bmsft\b/i, ["MSFT"]],
  [/\bgoogle\b|\bgoogl\b|\balphabet\b/i, ["GOOGL"]],
  [/\bamazon\b|\bamzn\b/i, ["AMZN"]],
  [/\btesla\b|\btsla\b/i, ["TSLA"]],
  [/\bnvidia\b|\bnvda\b/i, ["NVDA"]],
  [/\bmeta\b|\bfacebook\b/i, ["META"]],
  [/\bnetflix\b|\bnflx\b/i, ["NFLX"]],
  [/\bsp500\b|s&p 500|s&p500|s&p/i, ["^GSPC"]],
  [/\bnasdaq\b|\bixic\b/i, ["^IXIC"]],
  [/\bdow jones\b|\bdji\b/i, ["^DJI"]],
  [/\bgold\b/i, ["GC=F"]],
  [/\bsilver\b/i, ["SI=F"]],
  [/\boil\b|crude/i, ["CL=F"]],
  [/\binflation\b/i, ["^TNX", "TIP"]],
  [/\binterest rate/i, ["^TNX"]],
  [/\bbond\b/i, ["^TNX"]],
  [/\bmarket\b|movers|stocks today/i, ["^GSPC", "^IXIC"]],
  [/\bcrypto\b/i, ["BTC-USD", "ETH-USD"]],
];

function extractSymbols(query: string): string[] {
  const found: string[] = [];
  for (const [pattern, symbols] of KEYWORD_MAP) {
    if (pattern.test(query)) {
      for (const s of symbols) {
        if (!found.includes(s)) found.push(s);
      }
    }
  }
  return found;
}

async function fetchMarketContext(symbols: string[]): Promise<string> {
  if (symbols.length === 0) return "";
  try {
    const results = await Promise.allSettled(
      symbols.slice(0, 4).map((sym) =>
        yf.quoteSummary(sym, { modules: ["price", "summaryDetail", "financialData"] })
      )
    );
    const lines: string[] = ["LIVE MARKET DATA:"];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const d = r.value;
      const p = d.price;
      const sd = d.summaryDetail;
      const fd = d.financialData;
      if (!p) continue;
      const name = p.shortName || p.longName || symbols[i];
      const price = p.regularMarketPrice;
      const changePct = p.regularMarketChangePercent;
      const high52 = sd?.fiftyTwoWeekHigh;
      const low52 = sd?.fiftyTwoWeekLow;
      const mktCap = p.marketCap;
      const pe = sd?.trailingPE;
      const vol = p.regularMarketVolume;
      const avgVol = sd?.averageVolume;
      const target = fd?.targetMeanPrice;
      const rec = fd?.recommendationKey;

      let line = `${name} (${symbols[i]}): Price=${fmtPrice(price)}, Change=${fmtPct(changePct)}`;
      if (high52 && low52) line += `, 52wk=${fmtPrice(low52)}-${fmtPrice(high52)}`;
      if (mktCap) line += `, MarketCap=${fmtPrice(mktCap)}`;
      if (pe && pe > 0 && pe < 1000) line += `, P/E=${pe.toFixed(1)}`;
      if (vol && avgVol) line += `, Vol=${fmtVol(vol)} (avg ${fmtVol(avgVol)})`;
      if (target && price) line += `, AnalystTarget=${fmtPrice(target)} (${fmtPct(((target - price) / price) * 100)} upside)`;
      if (rec) line += `, Recommendation=${rec.replace(/_/g, " ")}`;
      lines.push(line);
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

async function fetchNewsContext(symbols: string[], query: string): Promise<string> {
  try {
    const searchTerm = symbols.length > 0 ? symbols[0] : query;
    const results = await yf.search(searchTerm, { quotesCount: 0, newsCount: 5 });
    const news = (results.news ?? []).slice(0, 5);
    if (news.length === 0) return "";
    const lines = ["RECENT NEWS HEADLINES:"];
    for (const n of news) {
      const title = (n as { title?: string }).title;
      if (title && !title.startsWith("http")) lines.push(`- ${title}`);
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

function buildSystemPrompt(clientSystemPrompt: string | undefined, marketContext: string, newsContext: string): string {
  const parts: string[] = [
    `You are FloAI, an expert financial advisor built into the FloBoard app. Today is ${new Date().toDateString()}.`,
    "",
    "Your role: provide clear, informative, and balanced financial analysis. Be educational and specific.",
    "Format responses well — use bullet points, sections, and clear structure where it helps readability.",
    "Always note that your answers are informational and not personal financial advice.",
    "Be thorough but concise. Don't pad with unnecessary disclaimers — one short reminder is enough.",
  ];

  if (marketContext) {
    parts.push("", marketContext);
  }

  if (newsContext) {
    parts.push("", newsContext);
  }

  if (clientSystemPrompt) {
    parts.push("", "ADDITIONAL CONTEXT FROM APP:", clientSystemPrompt);
  }

  return parts.join("\n");
}

// ── Server key status ─────────────────────────────────────────────────────
// Lets the mobile app know whether a server-side Gemini key is configured
// so it can unlock the chat UI without requiring users to supply their own.
router.get("/chat/status", (_req, res) => {
  res.json({ hasServerKey: !!SERVER_GEMINI_API_KEY });
});

router.post("/chat", rateLimit(8, 60_000), async (req, res) => {
  const messages = sanitizeChatMessages((req.body as { messages?: unknown })?.messages);
  const clientSystemPrompt = sanitizeExtraContext((req.body as { systemPrompt?: unknown })?.systemPrompt);

  if (!messages) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage?.content?.trim()) {
    res.status(400).json({ error: "No user message found" });
    return;
  }

  const userQuery = lastUserMessage.content.trim();

  // Never accept a client-supplied Gemini key — that would leak user secrets onto the server.
  const resolvedApiKey = SERVER_GEMINI_API_KEY;

  if (!resolvedApiKey) {
    res.status(503).json({ error: "No Gemini API key provided. Add your key in Settings → Gemini API Key." });
    return;
  }

  const { url: GEMINI_URL, streamUrl: GEMINI_STREAM_URL } = buildGeminiUrls(resolvedApiKey);

  // Fetch live market data and news in parallel
  const symbols = extractSymbols(userQuery);
  const [marketContext, newsContext] = await Promise.all([
    fetchMarketContext(symbols),
    fetchNewsContext(symbols, userQuery),
  ]);

  const systemPrompt = buildSystemPrompt(clientSystemPrompt, marketContext, newsContext);

  // Build Gemini conversation history
  // Gemini uses "user" and "model" roles (not "assistant")
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const isStreaming = req.query.stream !== "false";

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  if (!isStreaming) {
    // Non-streaming JSON response (used by native mobile)
    try {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!geminiRes.ok) {
        await geminiRes.text().catch(() => "");
        req.log.error({ status: geminiRes.status }, "Gemini API error");
        if (geminiRes.status === 429) {
          res.status(429).json({ error: "Gemini free tier quota reached for today. It resets every 24 hours — try again tomorrow, or upgrade your Gemini API plan at aistudio.google.com." });
        } else if (geminiRes.status === 400 || geminiRes.status === 401 || geminiRes.status === 403) {
          res.status(401).json({ error: "Invalid or expired Gemini API key. Please check your key in Settings." });
        } else {
          res.status(502).json({ error: "AI service error. Please try again." });
        }
        return;
      }

      const json = await geminiRes.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
      res.json({ content: text });
    } catch (err) {
      req.log.error({ err }, "Gemini fetch error");
      res.status(502).json({ error: "Failed to reach AI service. Please try again." });
    }
    return;
  }

  // SSE streaming response (used by web)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendChunk = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const geminiRes = await fetch(GEMINI_STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!geminiRes.ok || !geminiRes.body) {
      await geminiRes.text().catch(() => "");
      req.log.error({ status: geminiRes.status }, "Gemini stream error");
      if (geminiRes.status === 429) {
        sendChunk({ error: "Gemini free tier quota reached for today. It resets every 24 hours — try again tomorrow, or upgrade your Gemini API plan at aistudio.google.com." });
      } else if (geminiRes.status === 400 || geminiRes.status === 401 || geminiRes.status === 403) {
        sendChunk({ error: "Invalid or expired Gemini API key. Please check your key in Settings." });
      } else {
        sendChunk({ error: "AI service error. Please try again." });
      }
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) sendChunk({ content: text });
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Gemini streaming error");
    sendChunk({ error: "Connection to AI failed. Please try again." });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
