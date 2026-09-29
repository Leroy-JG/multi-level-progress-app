import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { effectivePercent, isDone } from '../domain/progress';
import type { NodeId, ProgressNode } from '../domain/types';
import { formatDate, t } from '../i18n';
import { Checkbox, IconButton, ProgressBar, Text } from './components';
import { formatPercent, useTheme } from './theme';

/** Tout ce dont l'arbre d'accordéons a besoin ; fourni par l'écran qui l'affiche. */
export interface TreeContext {
  kids(id: NodeId): ProgressNode[];
  /** Progression (0–1) d'un élément. */
  progress(id: NodeId): number;
  today: string;
  /** Couleur du projet : sert au fil qui relie les niveaux imbriqués. */
  color: string;
  expanded: ReadonlySet<NodeId>;
  /** Mode « réordonner » : flèches sur les éléments du premier niveau, accordéons repliés. */
  reorder: boolean;
  onToggleExpand(id: NodeId): void;
  onOpen(node: ProgressNode): void;
  onCheck(node: ProgressNode): void;
  onMove(node: ProgressNode, direction: -1 | 1): void;
}

const SLOT = 30;

/**
 * Un élément de la liste et, s'il est déployé, tout ce qu'il contient (récursif : sous-projet → tâches →
 * sous-tâches). `level` 0 = les éléments directs de l'écran, dessinés comme des cartes.
 */
export function TreeBranch({ node, siblings, ctx, level }: { node: ProgressNode; siblings: ProgressNode[]; ctx: TreeContext; level: number }) {
  const theme = useTheme();
  const kids = ctx.kids(node.id);
  const hasKids = kids.length > 0;
  const expanded = hasKids && ctx.expanded.has(node.id);
  // En mode « réordonner », seuls les éléments du premier niveau sont visibles.
  const showKids = expanded && !ctx.reorder;
  const progress = ctx.progress(node.id);
  const done = isDone(progress);
  const compact = level > 0;
  const top = level === 0;
  const index = siblings.indexOf(node);
  // Un emplacement de flèche est réservé si au moins un frère a un contenu, pour aligner les cases à cocher.
  const slot = !ctx.reorder && siblings.some((s) => ctx.kids(s.id).length > 0);
  const overdue = !!node.dueDate && node.dueDate < ctx.today && !done;

  const header = (
    <View style={[styles.header, compact && { paddingVertical: 8 }]}>
      {slot ? (
        hasKids ? (
          <Pressable
            onPress={() => ctx.onToggleExpand(node.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={t(expanded ? 'row.collapse' : 'row.expand', { name: node.title })}
            style={styles.slot}
          >
            <Ionicons name={expanded ? 'caret-down' : 'caret-forward'} size={compact ? 15 : 17} color={theme.text} />
          </Pressable>
        ) : (
          <View style={styles.slot} />
        )
      ) : null}

      <Checkbox checked={done} partial={!done && progress > 0} onPress={() => ctx.onCheck(node)} label={node.title} />

      <Pressable
        onPress={ctx.reorder ? undefined : () => ctx.onOpen(node)}
        accessibilityRole="button"
        accessibilityLabel={`${node.title}, ${formatPercent(progress)}`}
        style={styles.body}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: compact ? 15 : 16,
              fontWeight: compact ? '600' : '700',
              marginBottom: compact ? 5 : 8,
              opacity: done ? 0.6 : 1,
              textDecorationLine: done ? 'line-through' : 'none',
            }}
            numberOfLines={2}
          >
            {node.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={progress} height={compact ? 6 : 8} />
            </View>
            <Text style={{ fontSize: compact ? 12 : 13, fontWeight: '700', width: compact ? 46 : 52, textAlign: 'right' }}>
              {formatPercent(progress)}
            </Text>
          </View>
          {top ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {node.weight !== null ? '🔒 ' : ''}
                {t('row.share', { pct: Math.round(effectivePercent(siblings, node.id) * 10) / 10 })}
              </Text>
              {node.dueDate ? (
                <Text style={{ color: overdue ? theme.error : theme.muted, fontSize: 12, fontWeight: overdue ? '700' : '500' }}>
                  ⚑ {formatDate(node.dueDate)}
                </Text>
              ) : null}
              {node.note ? <Ionicons name="document-text-outline" size={13} color={theme.muted} /> : null}
              {node.reminderAt ? <Ionicons name="notifications-outline" size={13} color={theme.muted} /> : null}
            </View>
          ) : null}
        </View>
        {ctx.reorder ? null : <Ionicons name="chevron-forward" size={compact ? 16 : 18} color={theme.muted} style={{ marginLeft: 8 }} />}
      </Pressable>

      {ctx.reorder ? (
        <View style={{ marginLeft: 6 }}>
          <IconButton name="chevron-up" label={t('list.moveUp')} onPress={() => ctx.onMove(node, -1)} disabled={index <= 0} />
          <IconButton name="chevron-down" label={t('list.moveDown')} onPress={() => ctx.onMove(node, 1)} disabled={index >= siblings.length - 1} />
        </View>
      ) : null}
    </View>
  );

  const content = showKids ? (
    <View style={[styles.branch, { borderLeftColor: `${ctx.color}66` }, top && { marginTop: 6 }]}>
      {kids.map((kid) => (
        <TreeBranch key={kid.id} node={kid} siblings={kids} ctx={ctx} level={level + 1} />
      ))}
    </View>
  ) : null;

  if (top) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {header}
        {content}
      </View>
    );
  }
  return (
    <View>
      {header}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: SLOT, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', minHeight: 28 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  // Fil vertical dans la couleur du projet : montre à quel élément appartiennent les lignes imbriquées.
  branch: { marginLeft: SLOT / 2 - 1, paddingLeft: 12, borderLeftWidth: 2 },
});
