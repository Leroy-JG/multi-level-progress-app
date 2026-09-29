import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomBar, Text, type TabKey } from './components';
import { NoProjectView, ProjectSwitcher, useProjects } from './ProjectSwitcher';
import { useTheme } from './theme';

/** Écran de premier niveau : en-tête (sélecteur de projet ou titre), contenu défilant, barre du bas. */
export function TabScreen({
  active,
  title,
  projectScoped,
  children,
}: {
  active: TabKey;
  title?: string;
  projectScoped: boolean;
  children: (project: NonNullable<ReturnType<typeof useProjects>['current']>) => ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { current, store } = useProjects();

  if (!store.ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  if (projectScoped && !current) return <NoProjectView />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderColor: theme.border,
          minHeight: 56 + insets.top,
        }}
      >
        {projectScoped ? <ProjectSwitcher /> : <Text style={{ fontSize: 20, fontWeight: '800', paddingLeft: 4 }}>{title}</Text>}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
        {children(current as NonNullable<typeof current>)}
      </ScrollView>
      <BottomBar active={active} />
    </View>
  );
}
