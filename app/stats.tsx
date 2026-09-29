import { t } from '../src/i18n';
import { TabScreen } from '../src/ui/Screen';
import { StatsView } from '../src/ui/StatsView';

export default function StatsPage() {
  return (
    <TabScreen active="stats" title={t('tab.stats')} projectScoped>
      {(project) => <StatsView project={project} />}
    </TabScreen>
  );
}
