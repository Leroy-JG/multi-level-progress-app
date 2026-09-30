import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '../i18n';
import { useStore } from '../store/store';
import { Button, Sheet, Text } from './components';
import { useTheme } from './theme';

/**
 * Proposition affichée une seule fois, à la création du tout premier projet : configurer les copies automatiques
 * (bouton d'action) ou la fermer sans rien faire.
 */
export function BackupPrompt() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const [visible, setVisible] = useState(false);

  // Petit délai : laisse la feuille de création du projet se refermer avant d'en ouvrir une autre.
  useEffect(() => {
    if (!store.backupPromptOpen) return setVisible(false);
    const timer = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(timer);
  }, [store.backupPromptOpen]);

  const close = () => {
    setVisible(false);
    store.dismissBackupPrompt();
  };

  return (
    <Sheet visible={visible} title={t('backupPrompt.title')} onClose={close}>
      <Text style={{ color: theme.muted, lineHeight: 21, marginBottom: 18 }}>{t('backupPrompt.text')}</Text>
      <View style={{ gap: 10 }}>
        <Button
          title={t('backupPrompt.cta')}
          onPress={() => {
            close();
            router.push('/backups');
          }}
        />
        <Button title={t('common.close')} variant="ghost" onPress={close} />
      </View>
    </Sheet>
  );
}
