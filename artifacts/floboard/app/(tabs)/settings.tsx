import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import {
  AlertThreshold,
  AppTheme,
  EarningsWindow,
  NewsCount,
  PriceDecimals,
  RefreshInterval,
  RiskProfile,
  WatchlistSort,
  useSettings,
} from '@/context/SettingsContext';
import { areNotificationsSupported, requestNotificationPermissions } from '@/utils/notifications';

// ── Micro icons ────────────────────────────────────────────────────────────

const Icon = {
  Key:       ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="8" cy="15" r="4" /><Path d="M11.7 11.7L20 4" /><Path d="M18 6l2 2" /><Path d="M15 9l2 2" />
    </Svg>
  ),
  Brain:     ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-3 2.5 2.5 0 0 1 1.11-4.72 2.5 2.5 0 0 1 2.42-2.32Z" />
      <Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-3 2.5 2.5 0 0 0-1.11-4.72A2.5 2.5 0 0 0 14.5 2Z" />
    </Svg>
  ),
  Refresh:   ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="23 4 23 10 17 10" /><Polyline points="1 20 1 14 7 14" />
      <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Svg>
  ),
  Clock:     ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" /><Polyline points="12 6 12 12 16 14" />
    </Svg>
  ),
  Eye:       ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><Circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  Hash:      ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="4" y1="9" x2="20" y2="9" /><Line x1="4" y1="15" x2="20" y2="15" />
      <Line x1="10" y1="3" x2="8" y2="21" /><Line x1="16" y1="3" x2="14" y2="21" />
    </Svg>
  ),
  Compress:  ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="4 14 10 14 10 20" /><Polyline points="20 10 14 10 14 4" />
      <Line x1="10" y1="14" x2="21" y2="3" /><Line x1="3" y1="21" x2="14" y2="10" />
    </Svg>
  ),
  Newspaper: ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <Line x1="7" y1="9" x2="17" y2="9" /><Line x1="7" y1="13" x2="17" y2="13" /><Line x1="7" y1="17" x2="12" y2="17" />
    </Svg>
  ),
  Calendar:  ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" /><Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  ),
  Star:      ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  ),
  Briefcase: ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="7" width="20" height="14" rx="2" /><Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </Svg>
  ),
  Bell:      ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  ),
  Shield:    ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  ),
  Info:      ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" /><Line x1="12" y1="16" x2="12" y2="12" /><Line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
  ),
  Chevron:   ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  ),
  Trash:     ({ c, s }: { c: string; s: number }) => (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 6 5 6 21 6" /><Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <Path d="M10 11v6" /><Path d="M14 11v6" /><Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </Svg>
  ),
};

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  label,
  desc,
  icon,
  color,
}: {
  label: string;
  desc?: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  const colors = useColors();
  const accent = color ?? colors.blue;
  return (
    <View style={styles.secHd}>
      <View style={styles.secTop}>
        {icon && (
          <View style={[styles.secIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}28` }]}>
            {icon}
          </View>
        )}
        <Text style={[styles.secLabel, { color: accent }]}>{label}</Text>
        <View style={[styles.secLine, { backgroundColor: colors.rim }]} />
      </View>
      {desc && <Text style={[styles.secDesc, { color: colors.t3 }]}>{desc}</Text>}
    </View>
  );
}

// ── Segmented option row ───────────────────────────────────────────────────

function SegmentRow<T extends string | number>({
  label,
  icon,
  desc,
  options,
  value,
  onSelect,
  format,
  activeColor,
}: {
  label: string;
  icon?: React.ReactNode;
  desc?: string;
  options: T[];
  value: T;
  onSelect: (v: T) => void;
  format?: (v: T) => string;
  activeColor?: string;
}) {
  const colors = useColors();
  const fmt = format ?? String;
  const accentColor = activeColor ?? colors.blue;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rim }]}>
      <View style={styles.cardTop}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: colors.t1 }]}>{label}</Text>
          {desc && <Text style={[styles.rowDesc, { color: colors.t3 }]}>{desc}</Text>}
        </View>
      </View>
      <View style={[styles.segTrack, { backgroundColor: colors.surface, borderColor: colors.rim }]}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={String(opt)}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(opt);
              }}
              style={[
                styles.segBtn,
                active && { backgroundColor: accentColor },
              ]}
            >
              <Text style={[styles.segText, { color: active ? '#fff' : colors.t3 }]}>
                {fmt(opt)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  icon,
  description,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rim, opacity: disabled ? 0.4 : 1 }]}>
      <View style={styles.cardTop}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.rowLabel, { color: colors.t1 }]}>{label}</Text>
          {description && <Text style={[styles.rowDesc, { color: colors.t3 }]}>{description}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={disabled ? undefined : (v) => {
            Haptics.selectionAsync();
            onToggle(v);
          }}
          thumbColor={value ? colors.gain : colors.t3}
          trackColor={{ false: colors.rim, true: `${colors.gain}55` }}
          ios_backgroundColor={colors.surface}
        />
      </View>
    </View>
  );
}

// ── Action row ─────────────────────────────────────────────────────────────

function ActionRow({
  label,
  icon,
  description,
  buttonLabel,
  onPress,
  destructive,
}: {
  label: string;
  icon?: React.ReactNode;
  description: string;
  buttonLabel: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: destructive ? `${colors.loss}30` : colors.rim }]}>
      <View style={styles.cardTop}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.rowLabel, { color: colors.t1 }]}>{label}</Text>
          <Text style={[styles.rowDesc, { color: colors.t3 }]}>{description}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: pressed
                ? destructive ? `${colors.loss}28` : `${colors.blue}20`
                : destructive ? `${colors.loss}15` : colors.surface,
              borderColor: destructive ? `${colors.loss}40` : colors.rim,
            },
          ]}
        >
          <Text style={[styles.actionBtnText, { color: destructive ? colors.loss : colors.blue }]}>
            {buttonLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rim }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.rowLabel, { color: colors.t2, flex: 1 }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.t3 }]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Nav row ────────────────────────────────────────────────────────────────

function NavRow({ label, icon, onPress }: { label: string; icon?: React.ReactNode; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? colors.surface : colors.card, borderColor: colors.rim },
      ]}
    >
      <View style={styles.cardTop}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <Text style={[styles.rowLabel, { color: colors.t1, flex: 1 }]}>{label}</Text>
        <Icon.Chevron c={colors.t3} s={15} />
      </View>
    </Pressable>
  );
}

// ── Gemini API Key card ────────────────────────────────────────────────────

function GeminiKeyCard() {
  const colors = useColors();
  const { settings, updateSetting } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const hasKey = settings.geminiApiKey.length > 0;
  const masked = hasKey
    ? settings.geminiApiKey.slice(0, 6) + '••••••••••' + settings.geminiApiKey.slice(-4)
    : '';

  const handleEdit = () => { setDraft(settings.geminiApiKey); setEditing(true); };
  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSetting('geminiApiKey', draft.trim());
    setEditing(false);
  };
  const handleClear = () => {
    Alert.alert('Remove API Key', 'FloAI will stop working until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { updateSetting('geminiApiKey', ''); setEditing(false); } },
    ]);
  };

  return (
    <View style={[styles.geminiCard, {
      backgroundColor: colors.card,
      borderColor: hasKey ? `${colors.gain}40` : colors.rim,
    }]}>
      {/* Status strip */}
      <View style={styles.geminiTop}>
        <View>
          <Text style={[styles.rowLabel, { color: colors.t1 }]}>Gemini API Key</Text>
          <Text style={[styles.rowDesc, { color: colors.t3, marginTop: 2 }]}>
            Optional — FloAI works without it (uses server key)
          </Text>
        </View>
        <View style={[styles.statusPill, {
          backgroundColor: hasKey ? `${colors.gain}18` : `${colors.loss}12`,
          borderColor: hasKey ? `${colors.gain}35` : `${colors.loss}25`,
        }]}>
          <View style={[styles.statusDot, { backgroundColor: hasKey ? colors.gain : colors.loss }]} />
          <Text style={[styles.statusText, { color: hasKey ? colors.gain : colors.loss }]}>
            {hasKey ? 'ACTIVE' : 'USING SERVER KEY'}
          </Text>
        </View>
      </View>

      {/* Key display / edit */}
      {editing ? (
        <View style={styles.editArea}>
          <TextInput
            style={[styles.keyInput, { backgroundColor: colors.surface, borderColor: `${colors.blue}55`, color: colors.t1 }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Paste your key (starts with AIza…)"
            placeholderTextColor={colors.t3}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            autoFocus
          />
          <View style={styles.editBtns}>
            <Pressable onPress={() => setEditing(false)} style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.rim, flex: 1 }]}>
              <Text style={[styles.editBtnText, { color: colors.t2 }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.editBtn, {
                backgroundColor: draft.trim().length > 8 ? `${colors.gain}20` : colors.surface,
                borderColor: draft.trim().length > 8 ? `${colors.gain}40` : colors.rim,
                flex: 2,
              }]}
            >
              <Text style={[styles.editBtnText, { color: draft.trim().length > 8 ? colors.gain : colors.t3 }]}>Save Key</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.viewArea}>
          <Text style={[styles.maskedKey, { color: hasKey ? colors.t2 : colors.t3 }]} numberOfLines={1}>
            {hasKey ? masked : 'Using server key — add your own to override'}
          </Text>
          <View style={styles.viewBtns}>
            <Pressable onPress={handleEdit} style={[styles.editBtn, { backgroundColor: colors.surface, borderColor: colors.rim }]}>
              <Text style={[styles.editBtnText, { color: colors.blue }]}>{hasKey ? 'Change' : 'Add Key'}</Text>
            </Pressable>
            {hasKey && (
              <Pressable onPress={handleClear} style={[styles.editBtn, { backgroundColor: `${colors.loss}12`, borderColor: `${colors.loss}30` }]}>
                <Text style={[styles.editBtnText, { color: colors.loss }]}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <Pressable onPress={() => Linking.openURL('https://aistudio.google.com/apikey')} style={styles.keyLink}>
        <Text style={[styles.keyLinkText, { color: colors.blue }]}>Get a free key at aistudio.google.com →</Text>
      </Pressable>
    </View>
  );
}

// ── Risk profile picker ────────────────────────────────────────────────────

const RISK_META: Record<RiskProfile, { label: string; sub: string; color: 'blue' | 'amber' | 'loss' }> = {
  conservative: { label: 'Conservative', sub: 'Capital preservation, bonds, dividends', color: 'blue' },
  moderate:     { label: 'Moderate',     sub: 'Balanced growth and stability',          color: 'amber' },
  aggressive:   { label: 'Aggressive',   sub: 'High growth, higher volatility',         color: 'loss' },
};

function RiskPicker() {
  const colors = useColors();
  const { settings, updateSetting } = useSettings();

  return (
    <View style={[styles.riskCard, { backgroundColor: colors.card, borderColor: colors.rim }]}>
      {(['conservative', 'moderate', 'aggressive'] as RiskProfile[]).map((r, i) => {
        const meta = RISK_META[r];
        const active = settings.riskProfile === r;
        const col = colors[meta.color];
        return (
          <React.Fragment key={r}>
            {i > 0 && <View style={[styles.riskDivider, { backgroundColor: colors.rim }]} />}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                updateSetting('riskProfile', r);
              }}
              style={({ pressed }) => [styles.riskRow, pressed && { backgroundColor: colors.surface }]}
            >
              {/* Colored indicator bar */}
              <View style={[styles.riskBar, { backgroundColor: active ? col : colors.rim2 }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.riskLabel, { color: active ? col : colors.t1 }]}>{meta.label}</Text>
                <Text style={[styles.riskSub, { color: colors.t3 }]}>{meta.sub}</Text>
              </View>
              {active && (
                <View style={[styles.riskCheck, { backgroundColor: `${col}20`, borderColor: `${col}40` }]}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                </View>
              )}
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

const SORT_LABELS: Record<WatchlistSort, string> = {
  change: '% Chg',
  alpha: 'A–Z',
  added: 'Recent',
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const tabBarHeight = useBottomTabBarHeight();
  const { settings, updateSetting, triggerClearChat, triggerClearWatchlist, triggerClearPortfolio, resetAllSettings } = useSettings();
  const notifSupported = areNotificationsSupported();

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      await requestNotificationPermissions();
    }
    updateSetting('notificationsEnabled', enabled);
  };

  const handleClearChat = () =>
    Alert.alert('Clear Chat', 'This clears all FloAI conversation history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => triggerClearChat() },
    ]);

  const handleClearPortfolio = () =>
    Alert.alert('Delete Holdings', 'This permanently deletes all portfolio holdings. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: () => {
          triggerClearPortfolio();
          Alert.alert('Portfolio Cleared', 'All holdings have been deleted from your portfolio.');
        },
      },
    ]);

  const handleClearWatchlist = () =>
    Alert.alert('Clear Favorites Watchlist', 'This removes all symbols from your ⭐ Favorites watchlist. Preset lists (Tech, Crypto, FX & Metals) are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Favorites',
        style: 'destructive',
        onPress: () => {
          triggerClearWatchlist();
          Alert.alert('Favorites Cleared', 'All custom symbols have been removed from your ⭐ Favorites watchlist.');
        },
      },
    ]);

  const handleResetSettings = () =>
    Alert.alert('Reset All Settings', 'Restores all settings to defaults. Your watchlist and portfolio are not affected.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAllSettings },
    ]);

  return (
    <View style={[styles.container, { backgroundColor: colors.void }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.base, borderBottomColor: colors.rim }]}>
        <Text style={[styles.pageTitle, { color: colors.t1 }]}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── FloAI ──────────────────────────────────────────────────── */}
        <SectionHeader
          label="FLOAI ADVISOR"
          icon={<Icon.Brain c={colors.amber} s={14} />}
          color={colors.amber}
          desc="Powered by Google Gemini 2.5 Flash. Works out of the box — add your own key to use your personal quota instead."
        />
        <GeminiKeyCard />

        <SectionHeader
          label="INVESTOR PROFILE"
          icon={<Icon.Brain c={colors.amber} s={14} />}
          color={colors.amber}
          desc="Shapes how FloAI frames its analysis and recommendations."
        />
        <RiskPicker />

        {/* ── Market Data ────────────────────────────────────────────── */}
        <SectionHeader
          label="MARKET DATA"
          icon={<Icon.Refresh c={colors.blue} s={14} />}
          color={colors.blue}
        />
        <SegmentRow<RefreshInterval>
          label="Refresh interval"
          icon={<Icon.Clock c={colors.blue} s={15} />}
          desc="How often live prices are re-fetched from Yahoo Finance."
          options={[30, 60, 90, 300]}
          value={settings.refreshInterval}
          onSelect={(v) => updateSetting('refreshInterval', v)}
          format={(v) => v === 300 ? '5 min' : `${v}s`}
          activeColor={colors.blue}
        />
        <ToggleRow
          label="Show extended hours"
          icon={<Icon.Clock c={colors.blue} s={15} />}
          description="Display pre-market and after-hours price data where available."
          value={settings.showExtendedHours}
          onToggle={(v) => updateSetting('showExtendedHours', v)}
        />

        {/* ── Display ───────────────────────────────────────────────── */}
        <SectionHeader
          label="DISPLAY"
          icon={<Icon.Eye c={colors.blue} s={14} />}
          color={colors.blue}
        />
        <SegmentRow<AppTheme>
          label="App theme"
          icon={<Icon.Eye c={colors.blue} s={15} />}
          desc="Color theme across all screens and charts."
          options={['dark', 'light', 'oled']}
          value={settings.theme || 'dark'}
          onSelect={(v) => updateSetting('theme', v)}
          format={(v) => (v === 'dark' ? 'Dark' : v === 'light' ? 'Light' : 'OLED')}
          activeColor={colors.blue}
        />
        <SegmentRow<PriceDecimals>
          label="Price decimal places"
          icon={<Icon.Hash c={colors.blue} s={15} />}
          desc="Digits after the decimal point for prices and rates."
          options={[2, 4]}
          value={settings.priceDecimals}
          onSelect={(v) => updateSetting('priceDecimals', v)}
          format={(v) => `${v} dp`}
          activeColor={colors.blue}
        />
        <ToggleRow
          label="Compact large numbers"
          icon={<Icon.Compress c={colors.blue} s={15} />}
          description="Show $1.2T instead of $1,200,000,000,000 for market caps."
          value={settings.compactNumbers}
          onToggle={(v) => updateSetting('compactNumbers', v)}
        />

        {/* ── News ──────────────────────────────────────────────────── */}
        <SectionHeader
          label="NEWS"
          icon={<Icon.Newspaper c={colors.blue} s={14} />}
          color={colors.blue}
        />
        <SegmentRow<NewsCount>
          label="Headlines per load"
          icon={<Icon.Newspaper c={colors.blue} s={15} />}
          desc="Number of financial headlines shown in the News tab."
          options={[10, 15, 20]}
          value={settings.newsCount}
          onSelect={(v) => updateSetting('newsCount', v)}
          format={(v) => `${v}`}
          activeColor={colors.blue}
        />

        {/* ── Earnings ──────────────────────────────────────────────── */}
        <SectionHeader
          label="EARNINGS CALENDAR"
          icon={<Icon.Calendar c={colors.blue} s={14} />}
          color={colors.blue}
          desc="How far ahead to show upcoming earnings reports in the News tab."
        />
        <SegmentRow<EarningsWindow>
          label="Look-ahead window"
          icon={<Icon.Calendar c={colors.blue} s={15} />}
          options={[2, 4, 8]}
          value={settings.earningsWindow}
          onSelect={(v) => updateSetting('earningsWindow', v)}
          format={(v) => `${v} wks`}
          activeColor={colors.blue}
        />

        {/* ── Watchlist ─────────────────────────────────────────────── */}
        <SectionHeader
          label="WATCHLIST"
          icon={<Icon.Star c={colors.amber} s={14} />}
          color={colors.amber}
        />
        <SegmentRow<WatchlistSort>
          label="Sort order"
          icon={<Icon.Star c={colors.amber} s={15} />}
          options={['change', 'alpha', 'added']}
          value={settings.watchlistSort}
          onSelect={(v) => updateSetting('watchlistSort', v)}
          format={(v) => SORT_LABELS[v]}
          activeColor={colors.amber}
        />

        {/* ── Portfolio ─────────────────────────────────────────────── */}
        <SectionHeader
          label="PORTFOLIO ALERTS"
          icon={<Icon.Briefcase c={colors.gain} s={14} />}
          color={colors.gain}
          desc="Highlight holdings that move beyond this threshold in a single day."
        />
        <SegmentRow<AlertThreshold>
          label="Alert threshold"
          icon={<Icon.Briefcase c={colors.gain} s={15} />}
          options={[0, 3, 5, 10]}
          value={settings.alertThreshold}
          onSelect={(v) => updateSetting('alertThreshold', v)}
          format={(v) => v === 0 ? 'Off' : `≥${v}%`}
          activeColor={colors.gain}
        />

        {/* ── Notifications ─────────────────────────────────────────── */}
        <SectionHeader
          label="NOTIFICATIONS"
          icon={<Icon.Bell c={colors.blue} s={14} />}
          color={colors.blue}
        />
        {!notifSupported ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rim }]}>
            <View style={styles.cardTop}>
              <Text style={[styles.rowDesc, { color: colors.t3, flex: 1 }]}>
                Push notifications work in standalone Android builds installed from Google Play.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <ToggleRow
              label="Enable notifications"
              icon={<Icon.Bell c={colors.blue} s={15} />}
              description="Master switch for all FloBoard alerts."
              value={settings.notificationsEnabled}
              onToggle={handleToggleNotifications}
            />
            <ToggleRow
              label="Portfolio moves"
              description="Alert when a holding crosses your day-change threshold."
              value={settings.notifyPortfolio}
              onToggle={(v) => updateSetting('notifyPortfolio', v)}
              disabled={!settings.notificationsEnabled}
            />
            <ToggleRow
              label="Major market moves"
              description="Alert when S&P 500, Nasdaq, or Bitcoin moves ≥1.5% intraday."
              value={settings.notifyMarketMoves}
              onToggle={(v) => updateSetting('notifyMarketMoves', v)}
              disabled={!settings.notificationsEnabled}
            />
            <ToggleRow
              label="Breaking news"
              description="Alert when a new top financial headline is detected."
              value={settings.notifyNews}
              onToggle={(v) => updateSetting('notifyNews', v)}
              disabled={!settings.notificationsEnabled}
            />
          </>
        )}

        {/* ── Data & Privacy ────────────────────────────────────────── */}
        <SectionHeader
          label="DATA & PRIVACY"
          icon={<Icon.Shield c={colors.loss} s={14} />}
          color={colors.loss}
          desc="All data is stored locally on your device and never uploaded to a server."
        />
        <ActionRow
          label="Clear chat history"
          icon={<Icon.Trash c={colors.t2} s={15} />}
          description="Removes all messages from the FloAI conversation."
          buttonLabel="Clear"
          onPress={handleClearChat}
        />
        <ActionRow
          label="Clear watchlist"
          icon={<Icon.Trash c={colors.loss} s={15} />}
          description="Removes all symbols from your personal watchlist."
          buttonLabel="Clear"
          onPress={handleClearWatchlist}
          destructive
        />
        <ActionRow
          label="Delete portfolio"
          icon={<Icon.Trash c={colors.loss} s={15} />}
          description="Permanently deletes all tracked holdings."
          buttonLabel="Delete"
          onPress={handleClearPortfolio}
          destructive
        />

        {/* ── About & Legal ─────────────────────────────────────────── */}
        <SectionHeader
          label="ABOUT & LEGAL"
          icon={<Icon.Info c={colors.blue} s={14} />}
          color={colors.blue}
        />
        <InfoRow label="FloBoard" value="v1.2" />
        <InfoRow label="Market data" value="Yahoo Finance (live)" />
        <InfoRow label="AI advisor" value="Google Gemini 2.5 Flash" />
        <NavRow label="About FloBoard" onPress={() => router.push('/about')} />
        <NavRow label="Privacy Policy" onPress={() => router.push('/privacy-policy')} />
        <NavRow label="Terms of Use" onPress={() => router.push('/terms-of-use')} />

        {/* ── Advanced ──────────────────────────────────────────────── */}
        <SectionHeader label="ADVANCED" color={colors.loss} />
        <ActionRow
          label="Reset all settings"
          description="Restores all preferences to factory defaults. Watchlist and portfolio are not deleted."
          buttonLabel="Reset"
          onPress={handleResetSettings}
          destructive
        />

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: `${colors.amber}0D`, borderColor: `${colors.amber}30` }]}>
          <View style={styles.disclaimerRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <Line x1="12" y1="9" x2="12" y2="13" />
              <Line x1="12" y1="17" x2="12.01" y2="17" />
            </Svg>
            <Text style={[styles.disclaimerTitle, { color: colors.amber }]}>Not Financial Advice</Text>
          </View>
          <Text style={[styles.disclaimerText, { color: colors.t3 }]}>
            FloBoard is for informational purposes only. Nothing in this app — including FloAI — constitutes personal financial or investment advice. Always do your own research before making investment decisions.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  scroll: { flex: 1 },

  // Section headers
  secHd: { marginTop: 24, marginBottom: 10 },
  secTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secIcon: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  secLine: { flex: 1, height: 1 },
  secDesc: { fontSize: 11, lineHeight: 16, paddingLeft: 2 },

  // Cards (shared base)
  card: {
    borderRadius: 12, borderWidth: 1, marginBottom: 6,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  rowIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  rowDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  // Segmented control
  segTrack: {
    flexDirection: 'row', borderRadius: 0, borderTopWidth: 1,
    marginHorizontal: 0, overflow: 'hidden',
  },
  segBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  segText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Action buttons (inline)
  actionBtn: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7,
  },
  actionBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Risk picker
  riskCard: { borderRadius: 12, borderWidth: 1, marginBottom: 6, overflow: 'hidden' },
  riskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingRight: 14, gap: 12 },
  riskBar: { width: 4, height: '100%', minHeight: 40, borderRadius: 2 },
  riskLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  riskSub: { fontSize: 11, lineHeight: 15 },
  riskDivider: { height: 1 },
  riskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Gemini card
  geminiCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 6 },
  geminiTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  editArea: { gap: 8 },
  keyInput: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, fontFamily: 'Inter_400Regular' },
  editBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8, alignItems: 'center' },
  editBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  viewArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  viewBtns: { flexDirection: 'row', gap: 6 },
  maskedKey: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  keyLink: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(77,166,255,0.1)' },
  keyLinkText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  // Disclaimer
  disclaimer: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4, gap: 8 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  disclaimerTitle: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  disclaimerText: { fontSize: 11, lineHeight: 17 },
});
