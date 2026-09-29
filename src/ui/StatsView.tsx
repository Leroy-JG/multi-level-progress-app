import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { dayKey, eventsByDay, projectStats } from '../domain/insights';
import { isComplete, progressOf } from '../domain/progress';
import { childrenOf } from '../domain/tree';
import type { ProgressNode } from '../domain/types';
import { t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Card, ProgressBar, Text } from './components';
import { DEFAULT_PROJECT_COLOR, formatPercent, useTheme } from './theme';

function Stat({ value, label, color }: { value: string | number; label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={{ width: '50%', paddingVertical: 8 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: color ?? theme.text }}>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export function StatsView({ project }: { project: ProgressNode }) {
  const theme = useTheme();
  const router = useRouter();
  const { nodes } = useStore();
  const color = project.color ?? DEFAULT_PROJECT_COLOR;
  const now = Date.now();

  const stats = useMemo(() => projectStats(nodes, project.id, now), [nodes, project.id, now]);
  const progress = progressOf(nodes, project.id);
  const subs = childrenOf(nodes, project.id);

  // Éléments terminés par jour sur les 14 derniers jours.
  const series = useMemo(() => {
    const events = eventsByDay(nodes, project.id);
    return Array.from({ length: 14 }, (_, i) => {
      const key = dayKey(now - (13 - i) * 24 * 3600 * 1000);
      return { key, count: events.get(key)?.completed.length ?? 0 };
    });
  }, [nodes, project.id, now]);
  const max = Math.max(1, ...series.map((s) => s.count));

  return (
    <View>
      <Card accent={color}>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>{project.title}</Text>
        <Text style={{ fontSize: 40, fontWeight: '800', marginVertical: 4 }}>{formatPercent(progress)}</Text>
        <ProgressBar value={progress} height={12} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Stat value={`${stats.completed}/${stats.total}`} label={t('stats.elementsDone')} />
          <Stat value={`${stats.leavesCompleted}/${stats.leaves}`} label={t('stats.leavesDone')} />
          <Stat value={stats.completedLast7Days} label={t('stats.last7')} color={theme.success} />
          <Stat value={stats.dueSoon} label={t('stats.dueSoon')} />
          <Stat value={stats.overdue} label={t('stats.overdue')} color={stats.overdue > 0 ? theme.error : undefined} />
        </View>
      </Card>

      <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 }}>{t('stats.activity')}</Text>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 }}>
          {series.map((s) => (
            <View key={s.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <View
                accessibilityLabel={`${s.key} : ${tn('stats.completedCount', s.count)}`}
                style={{
                  width: '100%',
                  height: Math.max(4, (s.count / max) * 80),
                  borderRadius: 4,
                  backgroundColor: s.count > 0 ? theme.success : theme.track,
                }}
              />
            </View>
          ))}
        </View>
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t('stats.activityHelp')}</Text>
      </Card>

      {subs.length > 0 ? (
        <>
          <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10 }}>{t('stats.breakdown')}</Text>
          {subs.map((s) => {
            const p = progressOf(nodes, s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/node/${s.id}`)}
                accessibilityRole="button"
                style={{ marginBottom: 14 }}
              >
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text style={{ fontWeight: '700', color: isComplete(nodes, s.id) ? theme.success : theme.text }}>{formatPercent(p)}</Text>
                </View>
                <ProgressBar value={p} />
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
