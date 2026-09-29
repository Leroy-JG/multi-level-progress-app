import { t } from '../src/i18n';
import { TabScreen } from '../src/ui/Screen';
import { SettingsView } from '../src/ui/SettingsView';

export default function SettingsPage() {
  return (
    <TabScreen active="settings" title={t('tab.settings')} projectScoped={false}>
      {() => <SettingsView />}
    </TabScreen>
  );
}
