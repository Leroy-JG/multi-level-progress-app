import { t } from '../src/i18n';
import { CalendarView } from '../src/ui/CalendarView';
import { TabScreen } from '../src/ui/Screen';

export default function CalendarPage() {
  return (
    <TabScreen active="calendar" title={t('tab.calendar')} projectScoped>
      {(project) => <CalendarView project={project} />}
    </TabScreen>
  );
}
