import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { t } from '../i18n';
import { durabilityStatus, requestPersistence, type Durability } from '../storage/durability';
import { Button, Card, Text } from './components';
import { useTheme } from './theme';

/** Explique où vivent les données (uniquement sur l'appareil) et, sur le web, si le navigateur peut les vider. */
export function PrivacyCard() {
  const theme = useTheme();
  const [durability, setDurability] = useState<Durability | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let alive = true;
    void durabilityStatus().then((d) => alive && setDurability(d));
    return () => {
      alive = false;
    };
  }, []);

  const protect = async () => {
    const next = await requestPersistence();
    setDurability(next);
    setDenied(next !== 'persistent');
  };

  return (
    <Card>
      <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: 8 }}>{t('privacy.headline')}</Text>
      <Text style={{ color: theme.muted, lineHeight: 20 }}>{t('privacy.noNetwork')}</Text>
      <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 8 }}>
        {t(Platform.OS === 'web' ? 'privacy.whereWeb' : 'privacy.whereApp')}
      </Text>
      <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 8 }}>{t('privacy.noCopy')}</Text>

      {durability === 'persistent' ? (
        <Text style={{ color: theme.success, lineHeight: 20, marginTop: 12 }}>{t('privacy.persistent')}</Text>
      ) : null}
      {durability === 'unsupported' ? (
        <Text style={{ color: theme.muted, lineHeight: 20, marginTop: 12 }}>{t('privacy.unsupported')}</Text>
      ) : null}
      {durability === 'best-effort' ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ color: theme.error, lineHeight: 20 }}>{t('privacy.bestEffort')}</Text>
          <Button title={t('privacy.protect')} variant="ghost" onPress={protect} />
          {denied ? (
            <Text style={{ color: theme.muted, fontSize: 12 }} accessibilityLiveRegion="polite">
              {t('privacy.protectDenied')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
