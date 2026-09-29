import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayKey } from '../domain/insights';
import { isDone, progressMap } from '../domain/progress';
import { canAddChild, depthOf, groupByParent, indexNodes, pathTo } from '../domain/tree';
import { LEVEL_KEYS, type NodeId, type ProgressNode } from '../domain/types';
import { formatDate, formatDateTime, t } from '../i18n';
import { useStore } from '../store/store';
import { BottomBar, Button, Card, Checkbox, Chip, ConfirmSheet, IconButton, ProgressBar, Text, TextInput } from './components';
import { toggleExpanded, useExpanded } from './expansion';
import { KeyboardScrollView, useKeyboardInset } from './keyboard';
import { TreeBranch, type TreeContext } from './NodeTree';
import { NoProjectView, ProjectSwitcher } from './ProjectSwitcher';
import { DateSheet, EditSheet, ReminderSheet, WeightsSheet } from './sheets';
import { DEFAULT_PROJECT_COLOR, formatPercent, useTheme } from './theme';

const NO_KIDS: ProgressNode[] = [];

type Dialog = 'none' | 'weights' | 'addChild' | 'editSelf' | 'due' | 'reminder' | { confirmToggle: NodeId };

const levelLabel = (depth: number) => t(LEVEL_KEYS[depth - 1] ?? 'level.project');

/** Écran générique d'un élément (projet, sous-projet, tâche ou sous-tâche). */
export function NodeScreen({ nodeId }: { nodeId: NodeId | null }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const expanded = useExpanded();
  const store = useStore();
  const [dialog, setDialog] = useState<Dialog>('none');
  const [reorder, setReorder] = useState(false);
  const close = () => setDialog('none');

  const { nodes } = store;
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const kidsByParent = useMemo(() => groupByParent(nodes), [nodes]);
  const progressById = useMemo(() => progressMap(nodes), [nodes]);
  const node = nodeId ? index.get(nodeId) : undefined;
  const hasProjects = nodes.some((n) => n.parentId === null);

  const [note, setNote] = useState(node?.note ?? '');
  useEffect(() => setNote(node?.note ?? ''), [node?.id, node?.note]);
  const [manual, setManual] = useState('');

  if (!store.ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  if (!node) {
    // Aucun projet → accueil ; élément introuvable (supprimé pendant la navigation) → écran vide.
    return hasProjects || nodeId !== null ? <View style={{ flex: 1, backgroundColor: theme.bg }} /> : <NoProjectView />;
  }

  const depth = depthOf(index, node.id);
  const isProject = depth === 1;
  const project = pathTo(index, node.id)[0];
  const projectColor = project?.color ?? DEFAULT_PROJECT_COLOR;
  const kids = (id: NodeId) => kidsByParent.get(id) ?? NO_KIDS;
  const progressFor = (id: NodeId) => progressById.get(id) ?? 0;
  const children = kids(node.id);
  const isLeaf = children.length === 0;
  const progress = progressFor(node.id);
  const complete = isDone(progress);
  const trail = pathTo(index, node.id).slice(0, -1);
  const childLevel = levelLabel(depth + 1);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const today = dayKey(Date.now());
  const overdue = !!node.dueDate && node.dueDate < today && !complete;

  const requestToggle = (target: ProgressNode) => {
    if (kids(target.id).length === 0) store.toggleComplete(target.id);
    else setDialog({ confirmToggle: target.id });
  };
  const confirmTarget = typeof dialog === 'object' ? index.get(dialog.confirmToggle) : undefined;
  const confirmComplete = confirmTarget ? isDone(progressFor(confirmTarget.id)) : false;

  const tree: TreeContext = {
    kids,
    progress: progressFor,
    today,
    color: projectColor,
    expanded,
    reorder,
    onToggleExpand: toggleExpanded,
    onOpen: (target) => router.push(`/node/${target.id}`),
    onCheck: requestToggle,
    onMove: (target, direction) => store.moveSibling(target.id, direction),
  };

  const applyManual = (raw: string) => {
    const value = Number(raw.replace(',', '.'));
    if (raw.trim() !== '' && Number.isFinite(value)) store.setProgress(node.id, value);
    setManual('');
  };

  return (
    // Le clavier occupe le bas de l'écran : tout le contenu se raccourcit d'autant.
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingBottom: keyboard }}>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.card, borderColor: theme.border }]}>
        {isProject ? (
          <ProjectSwitcher />
        ) : (
          <>
            <IconButton name="chevron-back" onPress={goBack} label={t('common.back')} />
            <Text style={[styles.headerTitle, { flex: 1 }]} numberOfLines={1}>
              {node.title}
            </Text>
          </>
        )}
        <View style={{ flex: isProject ? 1 : 0 }} />
        <IconButton name="create-outline" onPress={() => setDialog('editSelf')} label={t('common.edit')} />
      </View>

      <KeyboardScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 }]}>
        {trail.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: projectColor, marginRight: 6 }} />
            <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }} numberOfLines={1}>
              {trail.map((p) => p.title).join(' › ')}
            </Text>
          </View>
        ) : null}

        {/* Progression */}
        <Card accent={projectColor} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', flex: 1 }}>{levelLabel(depth)}</Text>
            {complete ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                <Text style={{ color: theme.success, fontWeight: '700', marginLeft: 4, fontSize: 13 }}>{t('progress.done')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 40, fontWeight: '800', marginVertical: 4, color: complete ? theme.success : theme.text }}>
            {formatPercent(progress)}
          </Text>
          <ProgressBar value={progress} height={12} />

          <Pressable
            onPress={() => requestToggle(node)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}
          >
            <Checkbox
              checked={complete}
              partial={!complete && progress > 0}
              onPress={() => requestToggle(node)}
              label={complete ? t('progress.markUndone') : t('progress.markDone')}
            />
            <Text style={{ marginLeft: 10, fontSize: 15, fontWeight: '600' }}>
              {complete ? t('progress.markUndone') : isLeaf ? t('progress.markDone') : t('progress.finishAll')}
            </Text>
          </Pressable>

          {isLeaf ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{t('progress.manual')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {[0, 25, 50, 75, 100].map((v) => (
                  <Chip key={v} label={`${v} %`} selected={Math.round(node.progress) === v} onPress={() => store.setProgress(node.id, v)} />
                ))}
                <TextInput
                  accessibilityLabel={t('progress.manualInput')}
                  value={manual}
                  onChangeText={setManual}
                  onSubmitEditing={() => applyManual(manual)}
                  onBlur={() => applyManual(manual)}
                  placeholder={`${Math.round(node.progress)}`}
                  keyboardType="numeric"
                  maxLength={3}
                  style={{
                    width: 64,
                    textAlign: 'center',
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                    borderRadius: 999,
                    paddingVertical: 6,
                    fontSize: 14,
                  }}
                />
              </View>
            </View>
          ) : null}
        </Card>

        {/* Enfants */}
        {(canAddChild(index, node.id) || !isLeaf) && (
          <View style={styles.sectionHead}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800' }}>
                {children.length > 0 ? `${childLevel}s (${children.length})` : `${childLevel}s`}
              </Text>
              <View style={{ height: 3, width: 28, borderRadius: 2, backgroundColor: projectColor, marginTop: 3 }} />
            </View>
            {children.length >= 2 ? (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => setReorder((r) => !r)} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: theme.action, fontWeight: '700' }}>{reorder ? t('common.done') : t('list.reorder')}</Text>
                </Pressable>
                <Pressable onPress={() => setDialog('weights')} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: theme.action, fontWeight: '700' }}>{t('list.weights')}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}

        {children.map((child) => (
          <TreeBranch key={child.id} node={child} siblings={children} ctx={tree} level={0} />
        ))}

        {isLeaf && canAddChild(index, node.id) ? (
          <Text style={{ color: theme.muted, marginBottom: 12, lineHeight: 20 }}>
            {isProject ? t('list.emptyProject') : t('list.empty', { name: childLevel.toLowerCase() })}
          </Text>
        ) : null}

        {canAddChild(index, node.id) ? (
          <Button title={t('list.add', { name: childLevel.toLowerCase() })} onPress={() => setDialog('addChild')} />
        ) : null}

        {/* Détails : échéance, rappel, note */}
        <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 28, marginBottom: 10 }}>{t('detail.title')}</Text>
        <Card style={{ padding: 4 }}>
          <DetailRow
            icon="flag-outline"
            label={t('detail.dueDate')}
            value={node.dueDate ? formatDate(node.dueDate) : t('detail.none')}
            valueColor={overdue ? theme.error : undefined}
            hint={overdue ? t('detail.overdue') : undefined}
            onPress={() => setDialog('due')}
          />
          <DetailRow
            icon="notifications-outline"
            label={t('detail.reminder')}
            value={node.reminderAt ? formatDateTime(node.reminderAt) : t('detail.none')}
            onPress={() => setDialog('reminder')}
            last={!node.completedAt}
          />
          {node.completedAt ? (
            <DetailRow icon="checkmark-done-outline" label={t('detail.completedOn')} value={formatDateTime(node.completedAt)} last />
          ) : null}
        </Card>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 6 }}>{t('detail.note')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={() => note !== node.note && store.updateNode(node.id, { note })}
          placeholder={t('detail.notePlaceholder')}
          multiline
          maxLength={10000}
          style={{
            minHeight: 96,
            maxHeight: 240,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
            borderRadius: 14,
            padding: 14,
            fontSize: 15,
            lineHeight: 21,
          }}
        />
      </KeyboardScrollView>

      {keyboard > 0 ? null : isProject ? <BottomBar active="home" /> : <View style={{ height: insets.bottom }} />}

      <WeightsSheet
        visible={dialog === 'weights'}
        items={children}
        onClose={close}
        onSave={(updates) => {
          store.setWeights(updates);
          close();
        }}
      />
      <EditSheet
        visible={dialog === 'addChild'}
        mode="create"
        levelLabel={childLevel}
        isProject={false}
        onClose={close}
        onSubmit={(title) => {
          store.addNode(node.id, title);
          close();
        }}
      />
      <EditSheet
        visible={dialog === 'editSelf'}
        mode="edit"
        levelLabel={levelLabel(depth)}
        isProject={isProject}
        initialTitle={node.title}
        initialColor={node.color ?? undefined}
        onClose={close}
        onSubmit={(title, color) => {
          store.updateNode(node.id, isProject ? { title, color } : { title });
          close();
        }}
        onDelete={() => {
          close();
          if (!isProject) goBack();
          store.deleteNode(node.id);
        }}
      />
      <DateSheet
        visible={dialog === 'due'}
        value={node.dueDate}
        onClose={close}
        onSave={(date) => {
          store.updateNode(node.id, { dueDate: date });
          close();
        }}
      />
      <ReminderSheet
        visible={dialog === 'reminder'}
        value={node.reminderAt}
        onClose={close}
        onSave={(ts) => {
          store.updateNode(node.id, { reminderAt: ts });
          close();
        }}
      />
      <ConfirmSheet
        visible={typeof dialog === 'object' && !!confirmTarget}
        title={confirmComplete ? t('confirm.undoTitle') : t('confirm.doneTitle')}
        message={
          confirmTarget
            ? confirmComplete
              ? t('confirm.undoText', { name: confirmTarget.title })
              : t('confirm.doneText', { name: confirmTarget.title })
            : ''
        }
        confirmLabel={confirmComplete ? t('confirm.undo') : t('confirm.done')}
        onClose={close}
        onConfirm={() => {
          if (confirmTarget) store.toggleComplete(confirmTarget.id);
          close();
        }}
      />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  hint,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label} : ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.border,
      }}
    >
      <Ionicons name={icon} size={20} color={theme.muted} />
      <Text style={{ marginLeft: 12, flex: 1, fontWeight: '600' }}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: valueColor ?? theme.muted, fontWeight: valueColor ? '700' : '500', fontSize: 14 }}>{value}</Text>
        {hint ? <Text style={{ color: valueColor, fontSize: 11 }}>{hint}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.muted} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', marginRight: 6 },
  content: { padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
});

