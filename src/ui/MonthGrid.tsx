import { Pressable, View } from 'react-native';
import { dayKey } from '../domain/insights';
import { monthName, weekdayLetters } from '../i18n';
import { IconButton, Text } from './components';
import { useTheme } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export interface Marker {
  completed?: boolean;
  due?: boolean;
}

/** Grille d'un mois (lundi en premier), avec pastilles par jour. Sert au calendrier et au choix de date. */
export function MonthGrid({
  year,
  month,
  onChangeMonth,
  selected,
  onSelect,
  markers,
  accent,
}: {
  year: number;
  month: number; // 0-11
  onChangeMonth: (year: number, month: number) => void;
  selected: string | null;
  onSelect: (key: string) => void;
  markers?: Map<string, Marker>;
  accent?: string;
}) {
  const theme = useTheme();
  const today = dayKey(Date.now());
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <IconButton name="chevron-back" onPress={() => shift(-1)} label="‹" />
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 17 }}>
          {monthName(month).charAt(0).toUpperCase() + monthName(month).slice(1)} {year}
        </Text>
        <IconButton name="chevron-forward" onPress={() => shift(1)} label="›" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weekdayLetters().map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: theme.muted, fontSize: 12, fontWeight: '600', paddingBottom: 6 }}>
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) return <View key={col} style={{ flex: 1, height: 46 }} />;
            const key = toKey(year, month, day);
            const isSel = key === selected;
            const marker = markers?.get(key);
            return (
              <Pressable
                key={col}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ selected: isSel }}
                style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? theme.action : 'transparent',
                    borderWidth: key === today && !isSel ? 1.5 : 0,
                    borderColor: accent ?? theme.action,
                  }}
                >
                  <Text style={{ color: isSel ? theme.onAction : theme.text, fontWeight: key === today ? '800' : '500', fontSize: 14 }}>{day}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 1 }}>
                  {marker?.completed ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.success }} /> : null}
                  {marker?.due ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: theme.accent }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

