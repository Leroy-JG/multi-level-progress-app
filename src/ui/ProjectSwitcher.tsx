import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenOf } from '../domain/tree';
import { t } from '../i18n';
import { useStore } from '../store/store';
import { Button, Text } from './components';
import { EditSheet, ProjectPickerSheet } from './sheets';
import { DEFAULT_PROJECT_COLOR, onColor, useTheme } from './theme';

type Dialog = 'none' | 'picker' | 'create' | { edit: string };

/** Bouton de sélection de projet (coloré aux couleurs du projet) + feuilles de gestion des projets. */
export function useProjects() {
  const store = useStore();
  const projects = useMemo(() => childrenOf(store.nodes, null), [store.nodes]);
  const current = projects.find((p) => p.id === store.currentProjectId) ?? projects[0] ?? null;
  return { projects, current, store };
}

export function ProjectSwitcher() {
  const { projects, current, store } = useProjects();
  const [dialog, setDialog] = useState<Dialog>('none');
  const close = () => setDialog('none');
  const editing = typeof dialog === 'object' ? store.nodes.find((n) => n.id === dialog.edit) : undefined;
  const color = current?.color ?? DEFAULT_PROJECT_COLOR;

  return (
    <>
      <Pressable
        onPress={() => setDialog('picker')}
        accessibilityRole="button"
        accessibilityLabel={t('picker.change')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: color,
          borderRadius: 999,
          paddingVertical: 8,
          paddingLeft: 14,
          paddingRight: 10,
          maxWidth: '78%',
        }}
      >
        <Text style={{ color: onColor(color), fontSize: 16, fontWeight: '800', flexShrink: 1 }} numberOfLines={1}>
          {current?.title ?? t('picker.none')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={onColor(color)} style={{ marginLeft: 4 }} />
      </Pressable>

      <ProjectPickerSheet
        visible={dialog === 'picker'}
        projects={projects}
        currentId={current?.id ?? null}
        onClose={close}
        onSelect={(id) => {
          store.selectProject(id);
          close();
        }}
        onCreate={() => setDialog('create')}
        onEdit={(id) => setDialog({ edit: id })}
      />
      <EditSheet
        visible={dialog === 'create'}
        mode="create"
        levelLabel={t('level.project')}
        isProject
        onClose={close}
        onSubmit={(title, c) => {
          store.addNode(null, title, c);
          close();
        }}
      />
      <EditSheet
        visible={typeof dialog === 'object' && !!editing}
        mode="edit"
        levelLabel={t('level.project')}
        isProject
        initialTitle={editing?.title}
        initialColor={editing?.color ?? undefined}
        onClose={close}
        onSubmit={(title, c) => {
          if (editing) store.updateNode(editing.id, { title, color: c });
          close();
        }}
        onDelete={() => {
          if (editing) store.deleteNode(editing.id);
          close();
        }}
      />
    </>
  );
}

/** Écran d'accueil quand aucun projet n'existe. */
export function NoProjectView() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const store = useStore();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: insets.top + 32, backgroundColor: theme.bg }}>
      <Text style={{ fontSize: 56, fontWeight: '800', color: theme.action }}>Alam</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', marginVertical: 10 }}>{t('welcome.title')}</Text>
      <Text style={{ color: theme.muted, textAlign: 'center', marginBottom: 22, lineHeight: 21 }}>{t('welcome.text')}</Text>
      <Button title={t('welcome.create')} onPress={() => setOpen(true)} />
      <EditSheet
        visible={open}
        mode="create"
        levelLabel={t('level.project')}
        isProject
        onClose={() => setOpen(false)}
        onSubmit={(title, color) => {
          store.addNode(null, title, color);
          setOpen(false);
        }}
      />
    </View>
  );
}
