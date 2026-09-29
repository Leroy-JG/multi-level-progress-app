import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { dayKey, eventsByDay } from '../domain/insights';
import { indexNodes, pathTo } from '../domain/tree';
import type { ProgressNode } from '../domain/types';
import { formatDate, formatDateTime, t } from '../i18n';
import { useStore } from '../store/store';
import { Card, Text } from './components';
import { MonthGrid, type Marker } from './MonthGrid';
import { DEFAULT_PROJECT_COLOR, useTheme } from './theme';

export function CalendarView({ project }: { project: ProgressNode }) {
  const theme = useTheme();
  const router = useRouter();
  const { nodes } = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(dayKey(Date.now()));

  const events = useMemo(() => eventsByDay(nodes, project.id), [nodes, project.id]);
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const markers = useMemo(() => {
    const m = new Map<string, Marker>();
    for (const [key, e] of events) m.set(key, { completed: e.completed.length > 0, due: e.due.length > 0 });
    return m;
  }, [events]);

  const day = selected ? events.get(selected) : undefined;
  const color = project.color ?? DEFAULT_PROJECT_COLOR;

  const line = (n: ProgressNode, extra?: string) => (
    <Pressable
      key={n.id + (extra ?? '')}
      onPress={() => router.push(`/node/${n.id}`)}
      accessibilityRole="button"
      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
    >
      <Text style={{ fontWeight: '700', fontSize: 15 }}>{n.title}</Text>
      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
        {pathTo(index, n.id)
          .slice(1, -1)
          .map((p) => p.title)
          .join(' › ') || project.title}
        {extra ? `  ·  ${extra}` : ''}
      </Text>
    </Pressable>
  );

  return (
    <View>
      <Card accent={color}>
        <MonthGrid
          year={cursor.y}
          month={cursor.m}
          onChangeMonth={(y, m) => setCursor({ y, m })}
          selected={selected}
          onSelect={setSelected}
          markers={markers}
          accent={color}
        />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <Legend color={theme.success} label={t('calendar.legendDone')} />
          <Legend color={theme.accent} label={t('calendar.legendDue')} />
        </View>
      </Card>

      <Text style={{ fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 4 }}>{selected ? formatDate(selected) : ''}</Text>
      {!day ? <Text style={{ color: theme.muted, marginTop: 6 }}>{t('calendar.nothing')}</Text> : null}
      {day && day.completed.length > 0 ? (
        <>
          <Text style={{ color: theme.success, fontWeight: '700', marginTop: 12, fontSize: 13 }}>{t('calendar.completedThatDay')}</Text>
          {day.completed.map((n) => line(n, n.completedAt ? formatDateTime(n.completedAt).split(' · ')[1] : undefined))}
        </>
      ) : null}
      {day && day.due.length > 0 ? (
        <>
          <Text style={{ color: theme.muted, fontWeight: '700', marginTop: 12, fontSize: 13 }}>{t('calendar.dueThatDay')}</Text>
          {day.due.map((n) => line(n))}
        </>
      ) : null}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
