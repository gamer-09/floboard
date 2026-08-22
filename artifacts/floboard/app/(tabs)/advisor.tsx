import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconFlash, IconSend } from '@/components/Icons';
import { useColors } from '@/hooks/useColors';
import { chgDir, fmt, fmtChg, useMarket } from '@/context/MarketContext';
import { useSettings } from '@/context/SettingsContext';
import { getApiBase } from '@/utils/apiBase';
import { generateFallbackAiResponse } from '@/utils/floaiFallback';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const BASE_URL = getApiBase();

const QUICK_QUESTIONS = [
  'Review my portfolio risk & diversification',
  'Analyze my watchlist outlook & correlations',
  'What are the top market movers today?',
  'Is now a good time to buy Bitcoin?',
  'Explain impact of rising interest rates',
  'Best sectors to invest in right now?',
  'How is the US economy performing?',
  'Should I be worried about inflation?',
];

const CONTEXT_SYMS = [
  { sym: '^GSPC', label: 'S&P 500' },
  { sym: 'BTC-USD', label: 'BTC' },
  { sym: 'GC=F', label: 'Gold' },
  { sym: '^TNX', label: '10Y' },
  { sym: '^VIX', label: 'VIX' },
];

const INITIAL_MSG: ChatMessage = {
  id: 'init',
  role: 'assistant',
  content:
    "Hi! I'm FloAI, powered by Google Gemini. I have access to live market data — ask me about any stock, crypto, index, or financial topic and I'll give you real analysis.\n\nTry asking: \"Is now a good time to buy Bitcoin?\", \"How is Nvidia performing?\", or \"Explain the impact of rising interest rates.\"",
  timestamp: new Date(),
};

const RISK_GUIDANCE = {
  conservative: [
    '- [CONSERVATIVE MODE ACTIVE]: When the user asks about an investment, asset, or market strategy, analyze it through a Conservative, capital-preservation lens (focusing on downside risk, dividend yield, Treasury yields ^IRX, ^TNX, low volatility, and principal protection).',
    '- For ordinary conversational greetings or general questions, respond naturally and conversationally without forcing an investment report.',
  ],
  moderate: [
    '- [MODERATE MODE ACTIVE]: When the user asks about an investment, asset, or market strategy, analyze it through a Balanced 60/40 Moderate risk lens (weighing growth potential equally against downside volatility).',
    '- For ordinary conversational greetings or general questions, respond naturally and conversationally without forcing an investment report.',
  ],
  aggressive: [
    '- [AGGRESSIVE MODE ACTIVE]: When the user asks about an investment, asset, or market strategy, analyze it through an Aggressive, growth-maximizing investment lens (focusing on breakout momentum, AI leadership, digital asset growth, and upside target capture).',
    '- For ordinary conversational greetings or general questions, respond naturally and conversationally without forcing an investment report.',
  ],
};

function buildSystemPrompt(
  data: Record<string, { regularMarketPrice: number; regularMarketChangePercent: number }>,
  riskProfile: 'conservative' | 'moderate' | 'aggressive',
  holdingsText?: string,
  watchlistText?: string,
) {
  const lines = [
    `You are FloAI, an expert financial advisor. Today is ${new Date().toDateString()}.`,
    '',
    'You have access to live market data. Here is a snapshot:',
    '',
  ];
  const entries = Object.entries(data).slice(0, 25);
  for (const [sym, d] of entries) {
    lines.push(`${sym}: $${fmt(d.regularMarketPrice)} (${fmtChg(d.regularMarketChangePercent)})`);
  }
  if (holdingsText) {
    lines.push('', 'User Simulated Portfolio Holdings (Tracking Only / No Bank Info):', holdingsText);
  }
  if (watchlistText) {
    lines.push('', 'User Tracked Watchlist Symbols:', watchlistText);
  }
  lines.push(
    '',
    'Guidelines:',
    '- Provide educational, balanced financial context',
    '- Reference the live data and the user portfolio/watchlist when relevant',
    '- Always note that this is informational, not personal financial advice; do not ask for any deposits or personal banking information',
    '- Be concise but thorough; use bullet points where helpful',
    '- Stay factual; highlight uncertainty when present',
    ...RISK_GUIDANCE[riskProfile],
  );
  return lines.join('\n');
}

// ── Market Context Ribbon ─────────────────────────────────────────────────

function MarketContextRibbon() {
  const colors = useColors();
  const { data } = useMarket();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.ribbonScroll}
    >
      {CONTEXT_SYMS.map(({ sym, label }) => {
        const d = data[sym];
        const chg = d?.regularMarketChangePercent ?? 0;
        const dir = chgDir(chg);
        const col = dir === 'up' ? colors.gain : dir === 'dn' ? colors.loss : colors.amber;
        const arrow = dir === 'up' ? '▲' : dir === 'dn' ? '▼' : '–';
        const priceStr = d == null ? '—'
          : sym === '^GSPC' ? fmt(d.regularMarketPrice, 0)
          : sym === 'BTC-USD' ? `$${fmt(d.regularMarketPrice, 0)}`
          : sym === '^TNX' ? `${fmt(d.regularMarketPrice, 2)}%`
          : sym === '^VIX' ? fmt(d.regularMarketPrice, 1)
          : `$${fmt(d.regularMarketPrice)}`;
        return (
          <View key={sym} style={[styles.ribbonChip, { backgroundColor: colors.card, borderColor: colors.rim }]}>
            <Text style={[styles.ribbonLabel, { color: colors.t4 }]}>{label}</Text>
            <Text style={[styles.ribbonVal, { color: colors.t1 }]}>{priceStr}</Text>
            {d && <Text style={[styles.ribbonChg, { color: col }]}>{arrow} {Math.abs(chg).toFixed(1)}%</Text>}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── No Key Banner ─────────────────────────────────────────────────────────

function NoKeyBanner() {
  const colors = useColors();
  const router = useRouter();
  return (
    <View style={[styles.noKeyBanner, { backgroundColor: colors.amberDim, borderColor: 'rgba(255,182,39,0.25)' }]}>
      <Text style={[styles.noKeyTitle, { color: colors.amber }]}>No Gemini Key Detected</Text>
      <Text style={[styles.noKeyBody, { color: colors.t3 }]}>
        FloAI works with the server's built-in key by default. If you'd like to use your own personal key, you can add one in Settings.
      </Text>
      <View style={styles.noKeyBtns}>
        <Pressable
          onPress={() => router.push('/(tabs)/settings')}
          style={[styles.noKeyBtn, { backgroundColor: colors.amber + '22', borderColor: 'rgba(255,182,39,0.4)' }]}
        >
          <Text style={[styles.noKeyBtnText, { color: colors.amber }]}>Open Settings</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
          style={[styles.noKeyBtn, { backgroundColor: colors.surface, borderColor: colors.rim }]}
        >
          <Text style={[styles.noKeyBtnText, { color: colors.t2 }]}>Get Free Key →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Chat Components ───────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const colors = useColors();
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.gainDim, borderColor: 'rgba(0,229,160,0.25)' }]}>
          <IconFlash size={12} color={colors.gain} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.blue, borderColor: 'transparent' }]
            : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.rim }],
        ]}
      >
        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.t1 }]}>{msg.content}</Text>
        <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.45)' : colors.t4 }]}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const colors = useColors();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 420);
    return () => clearInterval(id);
  }, []);
  const dots = ['●○○', '●●○', '●●●', '○●●'];
  return (
    <View style={[styles.bubbleWrap, styles.bubbleLeft]}>
      <View style={[styles.aiAvatar, { backgroundColor: colors.gainDim, borderColor: 'rgba(0,229,160,0.25)' }]}>
        <IconFlash size={12} color={colors.gain} />
      </View>
      <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.rim, paddingVertical: 14, paddingHorizontal: 16 }]}>
        <Text style={[styles.bubbleText, { color: colors.gain, letterSpacing: 4 }]}>{dots[tick]}</Text>
      </View>
    </View>
  );
}

// ── Risk Profile Badge ────────────────────────────────────────────────────

function RiskBadge({ risk, onPress }: { risk: string; onPress?: () => void }) {
  const colors = useColors();
  const map: Record<string, { bg: string; col: string; label: string }> = {
    conservative: { bg: colors.blueDim, col: colors.blue, label: 'CONSERVATIVE' },
    moderate: { bg: colors.amberDim, col: colors.amber, label: 'MODERATE' },
    aggressive: { bg: colors.lossDim, col: colors.loss, label: 'AGGRESSIVE' },
  };
  const s = map[risk] ?? map.moderate;
  return (
    <Pressable onPress={onPress} style={[styles.riskBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.riskText, { color: s.col }]}>{s.label}</Text>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

export default function AdvisorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const params = useLocalSearchParams<{ q?: string }>();
  const { data } = useMarket();
  const { settings, updateSetting, triggerClearChat } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MSG]);
  const messagesRef = useRef<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === 'web' ? 67 : Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const lastHandledParamRef = useRef<string | null>(null);
  const prevClearKeyRef = useRef(0);

  const cycleRiskProfile = () => {
    const order: ('conservative' | 'moderate' | 'aggressive')[] = ['conservative', 'moderate', 'aggressive'];
    const currentIdx = order.indexOf(settings.riskProfile);
    const nextRisk = order[(currentIdx + 1) % order.length];
    updateSetting('riskProfile', nextRisk);
    const notificationMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `⚡ FloAI mode switched to **${nextRisk.toUpperCase()}**. All prompts and analyses will now be rewritten and analyzed for ${
        nextRisk === 'aggressive'
          ? 'maximum growth and breakout upside'
          : nextRisk === 'conservative'
          ? 'capital preservation and yield income'
          : 'balanced 60/40 diversification and risk-adjusted growth'
      }.`,
      timestamp: new Date(),
    };
    setMessages((cur) => [...cur, notificationMsg]);
  };

  // Optimistically true so the UI is never blocked before the check resolves.
  // Falls back gracefully — if neither the server nor the user has a key,
  // the chat error message from the API explains what to do.
  const [serverHasKey, setServerHasKey] = useState(true);
  useEffect(() => {
    fetch(`${BASE_URL}/api/chat/status`)
      .then((r) => r.json() as Promise<{ hasServerKey?: boolean }>)
      .then((j) => setServerHasKey(!!j.hasServerKey))
      .catch(() => setServerHasKey(false));
  }, []);

  const hasKey = settings.geminiApiKey.length > 0 || serverHasKey;

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (settings.clearChatKey !== prevClearKeyRef.current) {
      prevClearKeyRef.current = settings.clearChatKey;
      const fresh: ChatMessage = { ...INITIAL_MSG, timestamp: new Date() };
      setMessages([fresh]);
      messagesRef.current = [fresh];
      setInput('');
      setStreaming(false);
    }
  }, [settings.clearChatKey]);

  useEffect(() => {
    if (params.q && params.q !== lastHandledParamRef.current) {
      lastHandledParamRef.current = params.q;
      setTimeout(() => sendMessage(params.q!), 400);
    }
  }, [params.q]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const modeTag = `[${settings.riskProfile.toUpperCase()} MODE] `;
      const twisted = trimmed.startsWith('[') ? trimmed : `${modeTag}${trimmed}`;
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: twisted, timestamp: new Date() };
      const aiId = (Date.now() + 1).toString();
      const aiMsg: ChatMessage = { id: aiId, role: 'assistant', content: '', timestamp: new Date() };

      const prev = messagesRef.current;
      const nextMessages = [...prev, userMsg, aiMsg];
      setMessages(nextMessages);
      messagesRef.current = nextMessages;
      setStreaming(true);
      setInput('');

      const historyForApi = prev.map((m) => ({ role: m.role, content: m.content }));
      historyForApi.push({ role: 'user', content: twisted });

      let holdingsText = '';
      let watchlistText = '';
      try {
        const rawHoldings = await AsyncStorage.getItem('@floboard:holdings');
        if (rawHoldings) {
          const hList = JSON.parse(rawHoldings) as { sym: string; qty: number; cost: number }[];
          holdingsText = hList.map((h) => `${h.sym}: ${h.qty} shares @ $${h.cost}`).join(', ');
        }
        const rawWatchlist = await AsyncStorage.getItem('@floboard:watchlist');
        if (rawWatchlist) {
          const wList = JSON.parse(rawWatchlist) as string[];
          watchlistText = wList.join(', ');
        }
      } catch { /* ignore */ }

      const systemPrompt = buildSystemPrompt(data, settings.riskProfile, holdingsText, watchlistText);

      let streamedContent = '';
      const isNative = Platform.OS !== 'web';

      try {
        if (isNative) {
          try {
            const response = await fetch(`${BASE_URL}/api/chat?stream=false`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: historyForApi,
                systemPrompt,
                geminiApiKey: settings.geminiApiKey,
              }),
            });
            if (response.ok) {
              const json = (await response.json()) as { content?: string; error?: string };
              if (!json.error && json.content) {
                streamedContent = json.content;
                setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: streamedContent } : m)));
              }
            }
          } catch {
            /* fall through to direct Gemini API call */
          }

          // If backend proxy failed or was unreachable, call Google Gemini directly from the mobile app if user provided a key
          if (!streamedContent && settings.geminiApiKey.trim().length > 0) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`;
              const geminiContents = historyForApi.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              }));
              const geminiRes = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: { parts: [{ text: systemPrompt }] },
                  contents: geminiContents,
                  generationConfig: { maxOutputTokens: 1024 },
                }),
              });
              if (geminiRes.ok) {
                const geminiJson = (await geminiRes.json()) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };
                const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim().length > 0) {
                  streamedContent = text;
                  setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: streamedContent } : m)));
                }
              } else {
                const errJson = (await geminiRes.json()) as { error?: { message?: string } };
                if (errJson?.error?.message) {
                  setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: `Error from Google Gemini API: ${errJson.error!.message}` } : m)));
                  streamedContent = `Error: ${errJson.error.message}`;
                }
              }
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: `Failed to reach Google Gemini API directly: ${errMsg}` } : m)));
              streamedContent = `Error: ${errMsg}`;
            }
          }
        } else {
          const response = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: historyForApi,
              systemPrompt,
              geminiApiKey: settings.geminiApiKey,
            }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const raw = line.slice(6).trim();
                if (raw === '[DONE]') break;
                try {
                  const parsed = JSON.parse(raw) as { content?: string; error?: string };
                  if (parsed.content) {
                    streamedContent += parsed.content;
                    setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: streamedContent } : m)));
                  }
                  if (parsed.error) {
                    setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: `Error: ${parsed.error}` } : m)));
                  }
                } catch {}
              }
            }
          }
        }
        if (!streamedContent) {
          streamedContent = generateFallbackAiResponse(trimmed, settings.riskProfile);
          setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: streamedContent } : m)));
        }
      } catch {
        const fbContent = generateFallbackAiResponse(trimmed, settings.riskProfile);
        setMessages((cur) => cur.map((m) => (m.id === aiId ? { ...m, content: fbContent } : m)));
      } finally {
        setStreaming(false);
      }
    },
    [data, streaming, settings.geminiApiKey, settings.riskProfile]
  );

  const handleSend = () => sendMessage(input);

  return (
    <View style={[styles.container, { backgroundColor: colors.void }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.base, borderBottomColor: colors.rim }]}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.pageTitle, { color: colors.t1 }]}>FloAI</Text>
            <View style={[styles.onlineChip, {
              backgroundColor: hasKey ? colors.gainDim : colors.amberDim,
              borderColor: hasKey ? 'rgba(0,229,160,0.2)' : 'rgba(255,182,39,0.2)',
            }]}>
              <View style={[styles.onlineDot, { backgroundColor: hasKey ? colors.gain : colors.amber }]} />
              <Text style={[styles.onlineText, { color: hasKey ? colors.gain : colors.amber }]}>
                {hasKey ? 'ONLINE' : 'NO KEY'}
              </Text>
            </View>
          </View>
          <Text style={[styles.subTitle, { color: colors.t4 }]}>Powered by Gemini</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RiskBadge risk={settings.riskProfile} onPress={cycleRiskProfile} />
          <Pressable
            onPress={triggerClearChat}
            style={[styles.clearBtn, { backgroundColor: colors.card, borderColor: colors.rim }]}
          >
            <Text style={[styles.clearBtnText, { color: colors.t3 }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* Market context ribbon */}
      <View style={[styles.ribbonBar, { backgroundColor: colors.base, borderBottomColor: colors.rim }]}>
        <MarketContextRibbon />
      </View>

      {!hasKey && (
        <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
          <NoKeyBanner />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <MessageBubble msg={item} />}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 14, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={streaming ? <TypingIndicator /> : null}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        {/* Quick questions */}
        {messages.length === 1 && !streaming && (
          <View style={[styles.quickWrap, { borderTopColor: colors.rim }]}>
            <Text style={[styles.quickHint, { color: colors.t4 }]}>Try asking:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickScroll}
            >
              {QUICK_QUESTIONS.map((q, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendMessage(q)}
                  disabled={!hasKey}
                  style={({ pressed }) => [
                    styles.quickChip,
                    { backgroundColor: colors.card, borderColor: pressed ? colors.blue : colors.rim, opacity: !hasKey ? 0.4 : 1 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.quickText, { color: colors.t2 }]}>{q}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.base,
              borderTopColor: colors.rim,
              paddingBottom: Platform.OS === 'web' ? 8 : insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, {
              backgroundColor: colors.card,
              borderColor: input ? colors.blue + '66' : colors.rim,
              color: colors.t1,
              opacity: !hasKey ? 0.5 : 1,
            }]}
            value={input}
            onChangeText={setInput}
            placeholder={hasKey ? 'Ask about markets, stocks, crypto...' : 'Add a Gemini API key in Settings to chat...'}
            placeholderTextColor={colors.t4}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={hasKey}
          />
          <Pressable
            onPress={handleSend}
            disabled={streaming || !input.trim() || !hasKey}
            style={[
              styles.sendBtn,
              {
                backgroundColor: streaming || !input.trim() || !hasKey ? colors.card : colors.gain,
                borderColor: streaming || !input.trim() || !hasKey ? colors.rim : 'transparent',
              },
            ]}
          >
            {streaming ? (
              <ActivityIndicator size="small" color={colors.t3} />
            ) : (
              <IconSend size={16} color={streaming || !input.trim() || !hasKey ? colors.t4 : '#000'} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  subTitle: { fontSize: 10, marginTop: 1 },
  onlineChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20,
    borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2,
  },
  onlineDot: { width: 5, height: 5, borderRadius: 3 },
  onlineText: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  riskBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  riskText: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  clearBtn: { borderRadius: 7, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  clearBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  ribbonBar: { borderBottomWidth: 1 },
  ribbonScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  ribbonChip: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 66,
  },
  ribbonLabel: { fontSize: 7, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  ribbonVal: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  ribbonChg: { fontSize: 9, fontFamily: 'Inter_500Medium', marginTop: 1 },

  // No key banner
  noKeyBanner: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 4 },
  noKeyTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  noKeyBody: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  noKeyBtns: { flexDirection: 'row', gap: 8 },
  noKeyBtn: { borderRadius: 7, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  noKeyBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Chat
  bubbleWrap: { marginBottom: 10 },
  bubbleLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bubbleRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  bubble: { maxWidth: '80%', borderRadius: 14, borderWidth: 1, padding: 12 },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 13, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  timeText: { fontSize: 9, marginTop: 5, textAlign: 'right' },

  // Quick questions
  quickWrap: { borderTopWidth: 1, paddingTop: 8 },
  quickHint: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, paddingHorizontal: 14, marginBottom: 6, textTransform: 'uppercase' },
  quickScroll: { paddingHorizontal: 14, paddingBottom: 6, gap: 6 },
  quickChip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  quickText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingTop: 8, paddingHorizontal: 14, borderTopWidth: 1,
  },
  textInput: {
    flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
    paddingVertical: 11, fontSize: 13, fontFamily: 'Inter_400Regular',
    maxHeight: 100, lineHeight: 20,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
