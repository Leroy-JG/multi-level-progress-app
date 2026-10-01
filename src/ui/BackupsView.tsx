import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEEP_CHOICES, nextBackupAt, type AutoBackupSettings, type BackupUnit } from '../domain/autobackup';
import { dayKey } from '../domain/insights';
import { formatBytes, formatDate, formatDateTime, t, tn, type TKey } from '../i18n';
import type { BackupMeta } from '../storage/types';
import { useStore } from '../store/store';
import { BottomBar, Button, Card, ConfirmSheet, IconButton, Segmented, Sheet, Text, TextInput } from './components';
import { useExportFile } from './useExportFile';
import { KeyboardScrollView, useKeyboardInset } from './keyboard';
import { useTheme } from './theme';

/** « Chaque semaine », « Tous les 3 jours »… */
export const periodLabel = (config: Pick<AutoBackupSettings, 'every' | 'unit'>) =>
  tn(config.unit === 'days' ? 'autobackup.every_days' : 'autobackup.every_weeks', config.every);

const contentLine = (b: BackupMeta) =>
  [tn('autobackup.projects', b.projects), tn('autobackup.elements', b.elements), formatBytes(b.bytes)].join(' · ');

const kindLabel = (b: BackupMeta) => t(`autobackup.kind_${b.kind}` as TKey);

type Confirm = { type: 'restore' | 'delete'; backup: BackupMeta };

/** Réglages des sauvegardes automatiques + historique des copies gardées sur l'appareil. */
export function BackupsView() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const store = useStore();
  const exportFile = useExportFile();
  const config = store.settings.autoBackup;

  const [everyText, setEveryText] = useState(String(config.every));
  useEffect(() => setEveryText(String(config.every)), [config.every, config.unit]);

  const [detail, setDetail] = useState<BackupMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const lastConfirm = useRef<Confirm | null>(null); // garde le texte affiché pendant que la feuille se referme
  if (confirm) lastConfirm.current = confirm;
  const shownConfirm = confirm ?? lastConfirm.current;
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!store.ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));
  const totalBytes = store.backups.reduce((sum, b) => sum + b.bytes, 0);

  const next = nextBackupAt(config);
  const nextText =
    next === null ? t('autobackup.nextFirst') : next <= Date.now() ? t('autobackup.nextDue') : t('autobackup.nextAt', { date: formatDate(dayKey(next)) });

  const backupNow = async () => {
    const result = await store.backupNow();
    setMessage({
      text: t(`autobackup.${result.status}` as TKey),
      error: result.status === 'failed',
    });
  };

  const exportBackup = async (b: BackupMeta) => {
    try {
      const payload = await store.readBackup(b.id);
      if (payload === null) return setMessage({ text: t('autobackup.restoreFailed'), error: true });
      const shared = await exportFile(`alam-sauvegarde-${new Date(b.createdAt).toISOString().slice(0, 10)}.json`, payload);
      if (shared) setMessage({ text: t('autobackup.exported') });
    } catch {
      setMessage({ text: t('settings.exportFailed'), error: true });
    }
  };

  const runConfirmed = async () => {
    const current = confirm;
    setConfirm(null);
    if (!current) return;
    if (current.type === 'restore') {
      const ok = await store.restoreBackup(current.backup.id);
      setMessage({ text: t(ok ? 'autobackup.restored' : 'autobackup.restoreFailed'), error: !ok });
    } else {
      await store.deleteBackup(current.backup.id);
    }
  };

  const onEveryChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setEveryText(digits);
    const n = parseInt(digits, 10);
    if (n >= 1) store.setAutoBackup({ every: n }); // vide ou 0 : on attend une valeur valide
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingBottom: keyboard }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.card, borderColor: theme.border }]}>
        <IconButton name="chevron-back" onPress={goBack} label={t('common.back')} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('autobackup.title')}
        </Text>
      </View>

      <KeyboardScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={{ color: theme.muted, lineHeight: 20 }}>{t('autobackup.intro')}</Text>
          <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 8 }}>{t('autobackup.limit')}</Text>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 15 }}>{t('autobackup.enable')}</Text>
            <Switch
              value={config.enabled}
              onValueChange={(enabled) => store.setAutoBackup({ enabled })}
              accessibilityLabel={t('autobackup.enable')}
              trackColor={{ false: theme.border, true: theme.action }}
              thumbColor="#FFFFFF"
              // react-native-web colore le pouce activé à part (turquoise par défaut) ; ce prop n'existe pas dans les types de RN.
              {...({ activeThumbColor: '#FFFFFF' } as object)}
            />
          </View>

          {config.enabled ? (
            <View style={{ marginTop: 18 }}>
              <Text style={[styles.label, { color: theme.muted }]}>{t('autobackup.frequency')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.muted }}>{t('autobackup.every')}</Text>
                <TextInput
                  accessibilityLabel={t('autobackup.everyLabel')}
                  value={everyText}
                  onChangeText={onEveryChange}
                  onBlur={() => setEveryText(String(config.every))}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  style={[styles.everyInput, { borderColor: theme.border, backgroundColor: theme.bg }]}
                />
                <View style={{ flex: 1 }}>
                  <Segmented<BackupUnit>
                    value={config.unit}
                    onChange={(unit) => store.setAutoBackup({ unit })}
                    options={[
                      { value: 'days', label: t('autobackup.unitDays') },
                      { value: 'weeks', label: t('autobackup.unitWeeks') },
                    ]}
                  />
                </View>
              </View>
              <Text style={{ color: theme.muted, fontSize: 13, marginTop: 10, lineHeight: 19 }}>
                {periodLabel(config)}. {nextText}
              </Text>

              <Text style={[styles.label, { color: theme.muted, marginTop: 18 }]}>{t('autobackup.keep')}</Text>
              <Segmented<string>
                value={String(config.keep)}
                onChange={(keep) => store.setAutoBackup({ keep: Number(keep) })}
                options={KEEP_CHOICES.map((n) => ({ value: String(n), label: String(n) }))}
              />
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t('autobackup.keepHelp')}</Text>
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: 12 }}>
          <Button title={t('autobackup.now')} variant="ghost" onPress={backupNow} />
          {message ? (
            <Text style={{ color: message.error ? theme.error : theme.success, marginTop: 10 }} accessibilityLiveRegion="polite">
              {message.text}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 26, marginBottom: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', flex: 1 }}>{t('autobackup.history')}</Text>
          {store.backups.length > 0 ? (
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              {tn('autobackup.count', store.backups.length)} · {formatBytes(totalBytes)}
            </Text>
          ) : null}
        </View>

        {store.backups.length === 0 ? (
          <Card>
            <Text style={{ color: theme.muted }}>{t('autobackup.historyEmpty')}</Text>
          </Card>
        ) : (
          store.backups.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => {
                setDetail(b);
                setDetailOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('autobackup.open', { date: formatDateTime(b.createdAt) })}
              style={{ marginBottom: 10 }}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700' }}>{formatDateTime(b.createdAt)}</Text>
                  <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
                    {kindLabel(b)} · {contentLine(b)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.muted} />
              </Card>
            </Pressable>
          ))
        )}
      </KeyboardScrollView>

      {keyboard > 0 ? null : <BottomBar active="settings" onActivePress={() => router.replace('/settings')} />}

      <Sheet visible={detailOpen} title={detail ? formatDateTime(detail.createdAt) : ''} onClose={() => setDetailOpen(false)}>
        {detail ? (
          <View>
            <Text style={{ color: theme.muted, marginBottom: 16, lineHeight: 20 }}>
              {kindLabel(detail)} · {contentLine(detail)}
            </Text>
            <View style={{ gap: 10 }}>
              <Button
                title={t('autobackup.restore')}
                onPress={() => {
                  setDetailOpen(false);
                  setConfirm({ type: 'restore', backup: detail });
                }}
              />
              <Button title={t('autobackup.export')} variant="ghost" onPress={() => void exportBackup(detail)} />
              <Button
                title={t('autobackup.delete')}
                variant="danger"
                onPress={() => {
                  setDetailOpen(false);
                  setConfirm({ type: 'delete', backup: detail });
                }}
              />
            </View>
          </View>
        ) : null}
      </Sheet>

      <ConfirmSheet
        visible={confirm?.type === 'restore'}
        title={t('autobackup.restoreTitle')}
        message={t('autobackup.restoreText', { content: shownConfirm ? contentLine(shownConfirm.backup) : '' })}
        confirmLabel={t('autobackup.restoreConfirm')}
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirmed()}
      />
      <ConfirmSheet
        visible={confirm?.type === 'delete'}
        title={t('autobackup.deleteTitle')}
        message={t('autobackup.deleteText')}
        confirmLabel={t('autobackup.deleteConfirm')}
        danger
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirmed()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', marginRight: 6, flex: 1 },
  content: { padding: 16, paddingBottom: 24, width: '100%', maxWidth: 720, alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  everyInput: { width: 72, textAlign: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: 10, fontSize: 16 },
});
