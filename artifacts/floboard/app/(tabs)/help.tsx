import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

// ── Icons ─────────────────────────────────────────────────────────────────

function IconKey({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="8" cy="15" r="4" />
      <Path d="M11.7 11.7L20 4" />
      <Path d="M18 6l2 2" />
      <Path d="M15 9l2 2" />
    </Svg>
  );
}

function IconChart({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="10" width="4" height="11" rx="1" />
      <Rect x="10" y="4" width="4" height="17" rx="1" />
      <Rect x="17" y="7" width="4" height="14" rx="1" />
    </Svg>
  );
}

function IconBrain({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-3 2.5 2.5 0 0 1 1.11-4.72 2.5 2.5 0 0 1 2.42-2.32Z" />
      <Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-3 2.5 2.5 0 0 0-1.11-4.72A2.5 2.5 0 0 0 14.5 2Z" />
    </Svg>
  );
}

function IconStar({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

function IconBriefcase({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="7" width="20" height="14" rx="2" />
      <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </Svg>
  );
}

function IconNewspaper({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <Line x1="7" y1="9" x2="17" y2="9" />
      <Line x1="7" y1="13" x2="17" y2="13" />
      <Line x1="7" y1="17" x2="12" y2="17" />
    </Svg>
  );
}

function IconCircleDollar({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M9 8h5a2 2 0 0 1 0 4H9M9 12h5.5a2 2 0 0 1 0 4H9" />
      <Line x1="11" y1="6" x2="11" y2="8" />
      <Line x1="11" y1="16" x2="11" y2="18" />
    </Svg>
  );
}

function IconTrendUp({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline points="16 7 22 7 22 13" />
    </Svg>
  );
}

function IconCog({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

function IconShield({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// ── Help Section ──────────────────────────────────────────────────────────

interface HelpSection {
  id: string;
  icon: (color: string) => React.ReactNode;
  title: string;
  accentKey: 'gain' | 'blue' | 'amber' | 'loss';
  items: { q: string; a: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'gemini',
    icon: (c) => <IconKey color={c} size={18} />,
    title: 'Gemini AI (FloAI)',
    accentKey: 'amber',
    items: [
      {
        q: 'Do I need my own Gemini API Key?',
        a: 'No — the FloBoard server already has a Gemini key configured, so FloAI works out of the box without any setup from you. If you\'d prefer to use your own personal key (for example to avoid shared quota limits), you can add one in Settings → Gemini API Key and it will be used instead of the server\'s key.'
      },
      {
        q: 'How do I get a free key?',
        a: '1. Visit aistudio.google.com/apikey\n2. Sign in with your Google account\n3. Click "Create API Key"\n4. Copy the key (starts with "AIza…")\n5. Open FloBoard → Settings → Gemini API Key and paste it in',
      },
      {
        q: 'Is it really free?',
        a: 'Yes. Google\'s free tier is generous — more than enough for everyday use. You only need to upgrade if you send thousands of messages a day.',
      },
      {
        q: 'Is my key safe?',
        a: 'Your key is stored only on your device using encrypted local storage. It is never sent to any FloBoard servers. It goes directly to Google\'s Gemini API each time you send a message. If you don\'t add a personal key, the server\'s built-in key is used and your device never handles a key at all.'
      },
      {
        q: 'What happens without a personal key?',
        a: 'All market data tabs (Markets, Crypto, FX Pairs, News, Watchlist, Portfolio) work perfectly without a personal key. FloAI also works — the server uses its own configured Gemini key. You only need to add a personal key if you want to use your own Gemini quota instead of the shared server key.'
      },
    ],
  },
  {
    id: 'markets',
    icon: (c) => <IconChart color={c} size={18} />,
    title: 'Markets Tab',
    accentKey: 'gain',
    items: [
      {
        q: 'What does the Markets tab show?',
        a: 'Live prices and daily changes for global stock indices (S&P 500, Nasdaq, Dow Jones, FTSE 100, Nikkei 225, and more), commodities (Gold, Silver, Oil, Natural Gas), US Treasury yields, sector ETFs, and top stocks — all sourced from Yahoo Finance.',
      },
      {
        q: 'How current is the data?',
        a: 'Prices refresh automatically on the interval you set in Settings (default: every 90 seconds). The interval options are 30 s, 60 s, 90 s, and 5 min. During market off-hours you\'ll see the most recent closing price.',
      },
      {
        q: 'What do the colors mean?',
        a: 'Green = up on the day. Red = down. Amber = flat or near-unchanged. The percentage shown is the change from yesterday\'s closing price.',
      },
      {
        q: 'What are the Top Movers?',
        a: 'The Movers section on the Markets tab ranks the biggest gainers and losers of the day. You can use the filter tabs (All, Stocks, Crypto, Forex) to scan across the entire global universe or toggle asset classes separately.',
      },
      {
        q: 'What are the 7-day sparkline charts?',
        a: 'Each row in Markets, Crypto, and Watchlist shows a small 7-day price chart so you can see trend direction at a glance, not just today\'s number.',
      },
      {
        q: 'How do I view detailed charts and statistics for an asset?',
        a: 'Tap any symbol row in Watchlist, Crypto, or FX Pairs to expand an inline dropdown card showing a 7-day Sparkline trend chart and comprehensive market statistics including Open, Day High/Low, Volume, and 52-Week Range.',
      },
      {
        q: 'How do I change the color theme?',
        a: 'Go to Settings → DISPLAY → App theme. You can switch between Dark (Slate), Light, and OLED (Pure Black for AMOLED screens).',
      },
    ],
  },
  {
    id: 'crypto',
    icon: (c) => <IconCircleDollar color={c} size={18} />,
    title: 'Crypto Tab',
    accentKey: 'amber',
    items: [
      {
        q: 'What cryptocurrencies are tracked?',
        a: 'Major coins including Bitcoin (BTC), Ethereum (ETH), Solana (SOL), BNB, XRP, Cardano (ADA), Dogecoin (DOGE), Avalanche (AVAX), Polkadot (DOT), Chainlink (LINK), and more — all with live USD prices.',
      },
      {
        q: 'Why do prices sometimes show "—"?',
        a: 'This means the data hasn\'t loaded yet or Yahoo Finance returned an error for that symbol. Pull down to refresh, or wait for the next auto-refresh cycle.',
      },
      {
        q: 'Are crypto prices 24/7?',
        a: 'Yes — crypto markets never close, so prices update around the clock on every refresh cycle.',
      },
    ],
  },
  {
    id: 'fx',
    icon: (c) => <IconTrendUp color={c} size={18} />,
    title: 'FX Pairs Tab',
    accentKey: 'blue',
    items: [
      {
        q: 'What is the FX Pairs tab?',
        a: 'Foreign exchange (forex) rates — the price of one currency relative to another. For example, EUR/USD shows how many US dollars one Euro is worth right now.',
      },
      {
        q: 'Which pairs are shown?',
        a: 'Major pairs: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, USD/CNY, USD/INR, USD/MXN, USD/BRL, and several more emerging-market pairs. All sourced live from Yahoo Finance.',
      },
      {
        q: 'How do I read the change percentage?',
        a: 'The % shown is the change from the previous trading session\'s close. Forex runs 24/5 (Monday–Friday), so "previous close" refers to Friday\'s close on weekends.',
      },
      {
        q: 'What are Commodity Pairs and Exotic Pairs?',
        a: 'You can filter by Commodity Pairs (AUD/USD, USD/CAD, NZD/USD, and commodity crosses) or Exotic Pairs (USD/TRY, USD/MXN, USD/ZAR, etc.). When you select a tab, a Category Description Card appears explaining the group and its included pairs.',
      },
    ],
  },
  {
    id: 'news',
    icon: (c) => <IconNewspaper color={c} size={18} />,
    title: 'News Tab',
    accentKey: 'blue',
    items: [
      {
        q: 'Where does the news come from?',
        a: 'Live financial headlines sourced from Yahoo Finance. Each headline is automatically tagged as Bullish, Bearish, or Neutral based on its language, and shows an estimated market impact (e.g. "Technology & AI sector").',
      },
      {
        q: 'How many headlines load at once?',
        a: 'You can choose 10, 15, or 20 headlines in Settings → News. The list refreshes with the same interval as the market data.',
      },
      {
        q: 'What is the Earnings Calendar?',
        a: 'A section in the News tab showing upcoming earnings reports for major companies — date, EPS estimate, revenue estimate, and current price. You can set how far ahead to look (2, 4, or 8 weeks) in Settings → Earnings Window.',
      },
      {
        q: 'Can I tap a headline?',
        a: 'Yes — tapping any headline opens the full article in your browser.',
      },
    ],
  },
  {
    id: 'advisor',
    icon: (c) => <IconBrain color={c} size={18} />,
    title: 'FloAI Advisor Tab',
    accentKey: 'gain',
    items: [
      {
        q: 'What can FloAI do?',
        a: 'FloAI is a financial AI assistant powered by Google Gemini 2.5 Flash. It has access to live market data and can answer questions about stocks, crypto, indices, economic trends, earnings, and general investing concepts — with real numbers, not generic answers.',
      },
      {
        q: 'What is the Risk Profile?',
        a: 'Set your investor profile in Settings → Risk Profile (Conservative, Moderate, or Aggressive). FloAI uses this to tailor its responses — a conservative profile gets more focus on bonds, dividends, and capital preservation.',
      },
      {
        q: 'Is FloAI giving me real financial advice?',
        a: 'No. FloAI provides educational information and general market context only. It is not a licensed financial advisor. Always do your own research before making investment decisions.',
      },
      {
        q: 'How do I clear the chat history?',
        a: 'Tap "Clear" in the top-right corner of the Advisor tab, or go to Settings → Data & Privacy → Clear AI chat history.',
      },
      {
        q: 'What if FloAI says my quota is reached?',
        a: 'The free Gemini tier resets every 24 hours. If the server\'s key hits its quota, FloAI falls back to a built-in local analysis for common topics (gold, crypto, stocks, forex, general macro). If you\'re using your own personal key and hit the limit, wait until the next day, upgrade your Gemini plan at aistudio.google.com, or remove your personal key to switch back to the server key.'
      },
      {
        q: 'How does the Risk Profile affect FloAI?',
        a: 'Whether you use a Gemini API key or FloAI\'s fallback analysis, switching between Conservative, Moderate, and Aggressive in Settings immediately transforms FloAI\'s advice. Conservative focuses on capital preservation and treasury yields, Moderate provides a 60/40 balanced audit, and Aggressive focuses on high-beta growth and momentum.',
      },
      {
        q: 'Can FloAI analyze my portfolio or watchlist?',
        a: 'Yes! Tap "Review my portfolio risk & diversification" or "Analyze my watchlist outlook & correlations" in the Quick Questions ribbon. FloAI automatically reads your simulated holdings and watchlist to give an instant audit.',
      },
    ],
  },
  {
    id: 'watchlist',
    icon: (c) => <IconStar color={c} size={18} />,
    title: 'Watchlist Tab',
    accentKey: 'amber',
    items: [
      {
        q: 'How do I add a symbol to my watchlist?',
        a: 'Tap the "+" button in the Watchlist tab and type a ticker symbol (e.g. AAPL for Apple, MSFT for Microsoft, BTC-USD for Bitcoin, GC=F for Gold). The app will confirm the symbol and add it.',
      },
      {
        q: 'How do I remove a symbol?',
        a: 'Swipe left on any row in your watchlist to reveal the Remove button.',
      },
      {
        q: 'Can I sort my watchlist?',
        a: 'Yes — go to Settings → Watchlist → Sort order to choose between % Chg (biggest movers first), A–Z (alphabetical), or Recent (most recently added first).',
      },
      {
        q: 'Why does my watchlist show stale data?',
        a: 'Watchlist prices come from the same data feed as the rest of the app. If data looks stale, tap the refresh button (↻) at the top of the screen to force an immediate update.',
      },
      {
        q: 'What are the Watchlist category tabs?',
        a: 'You can switch between four independent lists: ⭐ Favorites, 🚀 Tech & AI, ₿ Crypto, and 🌍 FX & Metals. Each list saves your custom symbols separately.',
      },
      {
        q: 'How do I search for global symbols?',
        a: 'Type any company name, ticker, or currency pair in the Watchlist search bar. It searches our local catalog and simultaneously searches global stocks, ETFs, crypto, and forex pairs.',
      },
    ],
  },
  {
    id: 'portfolio',
    icon: (c) => <IconBriefcase color={c} size={18} />,
    title: 'Portfolio Tab',
    accentKey: 'gain',
    items: [
      {
        q: 'What is the Portfolio tab for?',
        a: 'Track your personal holdings with live P&L (profit & loss). Add any stock, ETF, or crypto with the quantity and price you paid, and FloBoard shows your current value, total gain/loss, and daily change.',
      },
      {
        q: 'Does the portfolio tracker require depositing money or bank login?',
        a: 'No! FloBoard is 100% simulated and tracking-only. It never asks for any money, deposits, or personal banking information. You simply record your shares and cost basis manually.',
      },
      {
        q: 'What does the Asset Allocation and Est. Div show?',
        a: 'It automatically classifies your holdings into Stocks, Crypto, and Other, showing a percentage allocation bar and an estimated annual dividend yield-on-cost without any bank connection.',
      },
      {
        q: 'How do I add a holding?',
        a: 'Tap "Add Holding" in the Portfolio tab. Enter the ticker symbol, the number of shares or coins you own, and the average price you paid per unit.',
      },
      {
        q: 'What is the alert threshold?',
        a: 'In Settings → Portfolio Alerts, set a daily move threshold (e.g. 5%). Holdings that move more than that in a single day are highlighted so you notice them immediately. You can also enable push notifications for these alerts.',
      },
      {
        q: 'Is my portfolio data private?',
        a: 'Yes — your holdings are stored only on your device using local encrypted storage. Nothing is uploaded to any server.',
      },
    ],
  },
  {
    id: 'troubleshoot',
    icon: (c) => <IconShield color={c} size={18} />,
    title: 'Troubleshooting',
    accentKey: 'loss',
    items: [
      {
        q: 'The app shows "Live" but no data appears',
        a: 'This was a known bug that has been fixed in the current version. If you still see it, force-quit and reopen the app. The fix ensures the data loader always recovers from a temporary failure — it can no longer get permanently stuck.',
      },
      {
        q: 'The app shows "Offline" even though I have internet',
        a: 'This was caused by the app incorrectly treating a Yahoo Finance timeout as a network outage. It is now fixed — the offline indicator only activates when your device actually has no internet connection, not when a single data fetch is slow.',
      },
      {
        q: 'Prices stopped updating',
        a: 'Tap the refresh button (↻) at the top of any data tab to force an immediate update. If that doesn\'t help, check your internet connection and try again. Data comes from Yahoo Finance, so brief outages on their end can temporarily interrupt updates.',
      },
      {
        q: 'A symbol shows "—" or is missing',
        a: 'Pull down to refresh. Some symbols (especially futures and exotic forex pairs) occasionally return errors from Yahoo Finance. If the problem persists for a specific symbol, double-check that the ticker is correct.',
      },
      {
        q: 'The FloAI Advisor is not responding',
        a: 'Make sure you have an active internet connection. If you\'re using your own personal key, check that it is entered correctly in Settings. If the key is valid, the issue may be a temporary Gemini service outage — wait a minute and try again. If you\'re relying on the server key, FloAI will fall back to local analysis for common topics during outages.'
      },
      {
        q: 'How do I reset the app?',
        a: 'Go to Settings → Reset All Settings to restore all preferences to defaults. Your watchlist and portfolio data are not affected. To clear all data, use Settings → Data & Privacy to delete each section individually.',
      },
    ],
  },
  {
    id: 'settings',
    icon: (c) => <IconCog color={c} size={18} />,
    title: 'Settings Reference',
    accentKey: 'blue',
    items: [
      {
        q: 'Gemini API Key',
        a: 'Optional. The FloBoard server already has a Gemini key configured, so FloAI works without any setup. If you want to use your own personal Gemini API key instead (to avoid shared quota limits), go to Settings → FloAI Advisor to add, update, or remove it. The key is stored only on your device and is never uploaded.'
      },
      {
        q: 'Investor Profile (Risk Profile)',
        a: 'Sets how FloAI frames its analysis. Conservative: focuses on capital preservation, dividends, and low volatility. Moderate (default): balanced growth and stability. Aggressive: emphasises high-growth opportunities and emerging trends. Change it in Settings → Investor Profile.',
      },
      {
        q: 'Refresh Interval',
        a: 'How often all market data refreshes automatically. Options: 30 s (most frequent), 60 s, 90 s (default), 5 min (battery-friendly). A shorter interval uses more data and battery.',
      },
      {
        q: 'Show Extended Hours',
        a: 'When on, pre-market and after-hours prices are shown alongside the regular session price for US equities.',
      },
      {
        q: 'Price Decimals',
        a: 'Show prices to 2 decimal places (default) or 4 decimal places (useful for low-priced assets like penny stocks or some forex pairs).',
      },
      {
        q: 'Compact Numbers',
        a: 'When on, large numbers are shortened (e.g. $1.2T instead of $1,200,000,000,000). When off, full numbers are shown.',
      },
      {
        q: 'News Headlines',
        a: 'Number of headlines loaded in the News tab: 10, 15 (default), or 20.',
      },
      {
        q: 'Earnings Window',
        a: 'How far ahead the Earnings Calendar looks: 2, 4 (default), or 8 weeks.',
      },
      {
        q: 'Watchlist Sort Order',
        a: '% Chg (default): biggest price movers shown first. A–Z: alphabetical by ticker. Recent: most recently added symbols appear at the top. Change in Settings → Watchlist → Sort order.',
      },
      {
        q: 'Portfolio Alert Threshold',
        a: 'Holdings that move beyond this percentage in a single day are highlighted. Options: Off (0%), 3%, 5% (default), or 10%. You can also enable push notifications for alerts — see the Notifications section in Settings.',
      },
      {
        q: 'Notifications',
        a: 'Master switch plus three sub-toggles: Portfolio moves (alerts when a holding crosses your threshold), Major market moves (S&P 500, Nasdaq, or Bitcoin moves ≥ 1.5% intraday), and Breaking news. Notifications require device permission. Push notifications are supported in standalone Android builds installed from Google Play.',
      },
      {
        q: 'Data & Privacy',
        a: 'Three one-tap actions: Clear chat history (removes all FloAI messages), Clear watchlist (removes all tracked symbols), and Delete portfolio (permanently removes all holdings). All data is stored locally on your device and is never uploaded.',
      },
      {
        q: 'What does "Reset All Settings" do?',
        a: 'Found in Settings → Advanced. Restores all preferences to factory defaults. Your watchlist and portfolio holdings are NOT deleted — only settings like refresh interval, sort order, and risk profile are reset.',
      },
    ],
  },
];

// ── Expandable Q&A ────────────────────────────────────────────────────────

function QAItem({ q, a }: { q: string; a: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={[styles.qaItem, { borderColor: colors.rim, backgroundColor: open ? colors.surface : 'transparent' }]}
    >
      <View style={styles.qaHeader}>
        <Text style={[styles.qaQ, { color: colors.t2, flex: 1 }]}>{q}</Text>
        <Text style={[styles.qaChevron, { color: colors.t4 }]}>{open ? '▲' : '▼'}</Text>
      </View>
      {open && (
        <Text style={[styles.qaA, { color: colors.t3 }]}>{a}</Text>
      )}
    </Pressable>
  );
}

function HelpCard({ section }: { section: HelpSection }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const accent = colors[section.accentKey];
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rim }]}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
          {section.icon(accent)}
        </View>
        <Text style={[styles.cardTitle, { color: colors.t1, flex: 1 }]}>{section.title}</Text>
        <Text style={[styles.cardChevron, { color: colors.t4 }]}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.cardBody}>
          {section.items.map((item, i) => (
            <QAItem key={i} q={item.q} a={item.a} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[styles.container, { backgroundColor: colors.void }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.base, borderBottomColor: colors.rim }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.t1 }]}>Help</Text>
          <Text style={[styles.pageSubtitle, { color: colors.t4 }]}>How to use FloBoard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick start banner */}
        <View style={[styles.quickStart, { backgroundColor: colors.gainDim, borderColor: 'rgba(0,229,160,0.2)' }]}>
          <Text style={[styles.quickStartTitle, { color: colors.gain }]}>Quick Start</Text>
          <Text style={[styles.quickStartBody, { color: colors.t2 }]}>
            FloBoard gives you live market data for stocks, crypto, forex, and news — all free, no account needed.{'\n\n'}
            The <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.t1 }}>FloAI Advisor</Text> chat (powered by Gemini 2.5 Flash) works out of the box — no API key needed. The server uses its own Gemini key so you can start chatting immediately.{'\n\n'}
            If you want to use your own personal Gemini key instead (to avoid shared quota), add it in{' '}
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.t1 }}>Settings → Gemini API Key</Text>.{'\n\n'}
            Tap any section below to learn more.
          </Text>
          <Pressable
            onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
            style={[styles.quickStartBtn, { backgroundColor: colors.gain + '22', borderColor: 'rgba(0,229,160,0.35)' }]}
          >
            <Text style={[styles.quickStartBtnText, { color: colors.gain }]}>Get a free Gemini API key →</Text>
          </Pressable>
        </View>

        {HELP_SECTIONS.map((s) => (
          <HelpCard key={s.id} section={s} />
        ))}

        <View style={[styles.footer, { borderColor: colors.rim }]}>
          <Text style={[styles.footerText, { color: colors.t4 }]}>
            FloBoard v1.2 · Market data from Yahoo Finance · AI by Google Gemini 2.5 Flash{'\n'}
            For informational use only — not financial advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  pageSubtitle: { fontSize: 11, marginTop: 1 },
  scroll: { flex: 1 },

  // Quick start
  quickStart: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  quickStartTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  quickStartBody: { fontSize: 13, lineHeight: 20 },
  quickStartBtn: { marginTop: 12, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  quickStartBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Cards
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardIcon: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cardChevron: { fontSize: 10 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 1 },

  // Q&A
  qaItem: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 4 },
  qaHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qaQ: { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  qaChevron: { fontSize: 9, marginTop: 4 },
  qaA: { fontSize: 12, lineHeight: 19, marginTop: 8, fontFamily: 'Inter_400Regular' },

  // Footer
  footer: { borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  footerText: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
