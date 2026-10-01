import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { backupStatus } from '../domain/backup';
import { ImportError, exportData, parseImport } from '../domain/exchange';
import type { ThemeMode } from '../domain/settings';
import { LANGUAGES, formatDateTime, t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Button, Card, ConfirmSheet, Segmented, Text } from './components';
import { canChooseFolder, chooseFolder, pickBackupFile } from './files';
import { useExportFile } from './useExportFile';
import { folderLabel } from '../domain/folder';
import { periodLabel } from './BackupsView';
import { PrivacyCard } from './PrivacyCard';
import { useTheme } from './theme';


export function SettingsView() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const exportFile = useExportFile();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReturnType<typeof parseImport> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [eraseMessage, setEraseMessage] = useState<string | null>(null);

  const now = Date.now();
  const backup = backupStatus(store.settings.lastBackupAt, now);
  // Rien à perdre tant qu'il n'y a pas de données : on n'alarme que si une sauvegarde manque vraiment.
  const backupWarn = store.nodes.length > 0 && backup.kind !== 'ok';

  const doExport = async () => {
    const at = Date.now(); // l'écran peut être resté ouvert longtemps : pas l'heure du dernier affichage
    const stamp = new Date(at).toISOString().slice(0, 10);
    try {
      const shared = await exportFile(`alam-sauvegarde-${stamp}.json`, exportData(store.nodes, at));
      if (shared) {
        store.markBackedUp(at);
        setError(null);
        setMessage(t('settings.exported'));
      }
    } catch {
      setMessage(null);
      setError(t('settings.exportFailed'));
    }
  };

  const tryParse = (source: string) => {
    try {
      setPending(parseImport(source));
      setError(null);
    } catch (e) {
      setError(e instanceof ImportError ? t(`import.${e.message}` as 'import.invalid_json') : t('import.invalid_format'));
    }
  };

  const doImport = async () => {
    try {
      const content = await pickBackupFile(store.settings.exportFolder);
      if (content === null) return;
      setMessage(null);
      tryParse(content);
    } catch {
      setMessage(null);
      setError(t('settings.importFailed'));
    }
  };

  const changeFolder = async () => {
    const folder = await chooseFolder(store.settings.exportFolder);
    if (folder) store.setExportFolder(folder);
  };

  return (
    <View>
      <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 10 }}>{t('settings.appearance')}</Text>
      <Card>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{t('settings.theme')}</Text>
        <Segmented<ThemeMode>
          value={store.settings.themeMode}
          onChange={store.setThemeMode}
          options={[
            { value: 'auto', label: t('settings.themeAuto') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t('settings.themeHelp')}</Text>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 16 }}>{t('settings.language')}</Text>
        <Text style={{ marginTop: 4 }}>{LANGUAGES.fr?.label}</Text>
      </Card>

      <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 }}>{t('settings.data')}</Text>
      <PrivacyCard />
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 10 }}>{t('settings.dataHelp')}</Text>
        <Text style={{ color: backupWarn ? theme.error : theme.muted, lineHeight: 20, marginBottom: 14 }}>
          {backup.kind === 'never'
            ? t('backup.never')
            : backup.kind === 'old'
              ? t('backup.old', { date: formatDateTime(backup.at), days: backup.days })
              : t('backup.last', { date: formatDateTime(backup.at) })}
        </Text>
        {canChooseFolder ? (
          <View style={{ marginBottom: 14 }}>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>{t('settings.exportFolder')}</Text>
            <Text style={{ marginTop: 2, marginBottom: 6 }}>
              {store.settings.exportFolder ? folderLabel(store.settings.exportFolder) : t('settings.exportFolderNone')}
            </Text>
            <Button title={t('settings.exportFolderChange')} variant="ghost" onPress={changeFolder} />
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          <Button title={t('settings.export')} onPress={doExport} />
          <Button title={t('settings.import')} variant="ghost" onPress={doImport} />
        </View>
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 10 }}>
          {canChooseFolder ? t('settings.fileHelpApp') : t('settings.fileHelpWeb')}
        </Text>
        {message ? (
          <Text style={{ color: theme.success, marginTop: 12 }} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text style={{ color: theme.error, marginTop: 12 }} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </Card>

      <Pressable onPress={() => router.push('/backups')} accessibilityRole="button" accessibilityLabel={t('autobackup.title')} style={{ marginTop: 12 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{t('autobackup.title')}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
              {store.settings.autoBackup.enabled
                ? t('autobackup.summary', { period: periodLabel(store.settings.autoBackup), count: tn('autobackup.count', store.backups.length) })
                : t('autobackup.off')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </Card>
      </Pressable>

      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 14 }}>{t('settings.eraseHelp')}</Text>
        <Button title={t('settings.erase')} variant="danger" onPress={() => setEraseOpen(true)} />
        {eraseMessage ? (
          <Text style={{ color: theme.success, marginTop: 12 }} accessibilityLiveRegion="polite">
            {eraseMessage}
          </Text>
        ) : null}
      </Card>

      <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 28 }}>{t('settings.about')}</Text>

      <ConfirmSheet
        visible={!!pending}
        title={t('settings.importConfirmTitle')}
        message={t('settings.importConfirmText', {
          projects: pending?.filter((n) => n.parentId === null).length ?? 0,
          elements: pending?.length ?? 0,
        })}
        confirmLabel={t('settings.importConfirm')}
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) store.replaceAll(pending);
          setPending(null);
          setMessage(t('settings.imported'));
        }}
      />

      <ConfirmSheet
        visible={eraseOpen}
        title={t('settings.eraseTitle')}
        message={t('settings.eraseText')}
        confirmLabel={t('settings.eraseConfirm')}
        danger
        onClose={() => setEraseOpen(false)}
        onConfirm={() => {
          store.eraseAll();
          setEraseOpen(false);
          setMessage(null);
          setEraseMessage(t('settings.erased'));
        }}
      />
    </View>
  );
}
