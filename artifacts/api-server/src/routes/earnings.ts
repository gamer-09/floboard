import { Router } from "express";

const router = Router();

interface EarningItem {
  sym: string;
  name: string;
  date: string;
  epsEst: number | null;
  revenueEst: number | null;
  price: number | null;
  changePct: number | null;
}

function parseEps(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[$,]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function weekdays(from: Date, days: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let i = 0; i < days && out.length < 40; i++) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function fetchNasdaqDay(iso: string): Promise<EarningItem[]> {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${iso}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: { rows?: Array<{ symbol?: string; name?: string; epsForecast?: string }> };
  };
  const rows = json.data?.rows ?? [];
  const items: EarningItem[] = [];
  for (const row of rows) {
    const sym = String(row.symbol || "").trim().toUpperCase();
    if (!sym) continue;
    items.push({
      sym,
      name: String(row.name || sym).trim(),
      date: `${iso}T20:00:00.000Z`,
      epsEst: parseEps(row.epsForecast),
      revenueEst: null,
      price: null,
      changePct: null,
    });
  }
  return items;
}

router.get("/earnings", async (req, res) => {
  const weeksRaw = Number(req.query.weeks);
  const weeks = weeksRaw >= 1 && weeksRaw <= 52 ? weeksRaw : 4;
  const filter = typeof req.query.symbols === "string"
    ? new Set(req.query.symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))
    : null;

  try {
    const days = weekdays(new Date(), weeks * 7 + 3);
    const chunks: EarningItem[][] = [];
    for (let i = 0; i < days.length; i += 5) {
      const slice = days.slice(i, i + 5);
      chunks.push(await Promise.all(slice.map((d) => fetchNasdaqDay(d).catch(() => [] as EarningItem[]))).then((x) => x.flat()));
    }
    let earnings = chunks.flat();
    if (filter && filter.size) earnings = earnings.filter((e) => filter.has(e.sym));
    earnings.sort((a, b) => a.date.localeCompare(b.date) || a.sym.localeCompare(b.sym));
    res.json({ earnings: earnings.slice(0, 80) });
  } catch (err) {
    req.log?.debug({ err }, "Earnings lookup failed");
    res.json({ earnings: [] });
  }
});

export default router;
