import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { dayKey } from '../domain/insights';
import { effectivePercent, summarizeWeights } from '../domain/progress';
import type { LevelKey, NodeId, ProgressNode } from '../domain/types';
import { formatDate, t } from '../i18n';
import { remindersSupported } from '../notifications';
import type { WeightUpdate } from '../store/store';
import { Button, Field, IconButton, Sheet, Text, TextInput } from './components';
import { KeyboardScrollView } from './keyboard';
import { MonthGrid } from './MonthGrid';
import { DEFAULT_PROJECT_COLOR, PROJECT_COLORS, useTheme } from './theme';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>{t('field.color')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {PROJECT_COLORS.map((c) => (
          <Pressable
            key={c.hex}
            onPress={() => onChange(c.hex)}
            accessibilityRole="button"
            accessibilityLabel={`${t('field.color')} ${c.key}`}
            accessibilityState={{ selected: value === c.hex }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: c.hex,
              borderWidth: 3,
              borderColor: value === c.hex ? theme.text : theme.card,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/** Création ou modification d'un élément (nom, et couleur pour un projet). */
export function EditSheet({
  visible,
  mode,
  levelKey,
  isProject,
  initialTitle = '',
  initialColor,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  levelKey: LevelKey;
  isProject: boolean;
  initialTitle?: string;
  initialColor?: string;
  onClose: () => void;
  onSubmit: (title: string, color: string) => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [color, setColor] = useState(initialColor ?? DEFAULT_PROJECT_COLOR);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setColor(initialColor ?? DEFAULT_PROJECT_COLOR);
      setConfirmDelete(false);
    }
  }, [visible, initialTitle, initialColor]);

  const valid = title.trim().length > 0;
  const submit = () => valid && onSubmit(title, color);

  return (
    <Sheet
      visible={visible}
      title={mode === 'create' ? t(`${levelKey}.create`) : t(`${levelKey}.modify`)}
      onClose={onClose}
    >
      <KeyboardScrollView style={{ flexGrow: 0 }}>
        <Field
          label={t('field.name')}
          value={title}
          onChangeText={setTitle}
          autoFocus
          placeholder={t(`${levelKey}.placeholder`)}
          returnKeyType="done"
          onSubmitEditing={submit}
          maxLength={80}
        />
        {isProject ? <ColorPicker value={color} onChange={setColor} /> : null}
        <Button
          title={mode === 'create' ? t('common.create') : t('common.save')}
          color={isProject ? color : undefined}
          onPress={submit}
          disabled={!valid}
        />
        {mode === 'edit' && onDelete ? (
          <View style={{ marginTop: 10 }}>
            {confirmDelete ? (
              <>
                <Text style={{ color: theme.error, marginBottom: 8, textAlign: 'center' }}>{t('edit.deleteWarning')}</Text>
                <Button title={t('edit.deleteConfirm')} variant="danger" onPress={onDelete} />
              </>
            ) : (
              <Button title={t('common.delete')} variant="danger" onPress={() => setConfirmDelete(true)} />
            )}
          </View>
        ) : null}
      </KeyboardScrollView>
    </Sheet>
  );
}

/** Sélecteur de projet : choisir, créer, modifier. */
export function ProjectPickerSheet({
  visible,
  projects,
  currentId,
  onClose,
  onSelect,
  onCreate,
  onEdit,
}: {
  visible: boolean;
  projects: ProgressNode[];
  currentId: NodeId | null;
  onClose: () => void;
  onSelect: (id: NodeId) => void;
  onCreate: () => void;
  onEdit: (id: NodeId) => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} title={t('picker.title')} onClose={onClose}>
      <ScrollView style={{ flexGrow: 0 }}>
        {projects.map((p) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
            <Pressable
              onPress={() => onSelect(p.id)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingVertical: 8 }}
            >
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: p.color ?? DEFAULT_PROJECT_COLOR, marginRight: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: p.id === currentId ? '800' : '500', flex: 1 }} numberOfLines={1}>
                {p.title}
              </Text>
              {p.id === currentId ? <Text style={{ color: theme.muted, fontSize: 13 }}>{t('picker.open')}</Text> : null}
            </Pressable>
            <IconButton name="create-outline" size={20} onPress={() => onEdit(p.id)} label={`${t('common.edit')} ${p.title}`} color={theme.muted} />
          </View>
        ))}
      </ScrollView>
      <View style={{ marginTop: 12 }}>
        <Button title={t('picker.new')} onPress={onCreate} />
      </View>
    </Sheet>
  );
}

/** Répartition des pourcentages entre les enfants d'un même parent. */
export function WeightsSheet({
  visible,
  items,
  onClose,
  onSave,
}: {
  visible: boolean;
  items: ProgressNode[];
  onClose: () => void;
  onSave: (updates: WeightUpdate[]) => void;
}) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<NodeId, string>>({});

  useEffect(() => {
    if (visible) setValues(Object.fromEntries(items.map((i) => [i.id, i.weight === null ? '' : String(i.weight)])));
  }, [visible, items]);

  const draft = useMemo<ProgressNode[]>(
    () =>
      items.map((i) => {
        const raw = (values[i.id] ?? '').replace(',', '.').trim();
        const n = raw === '' ? NaN : Number(raw);
        return { ...i, weight: Number.isFinite(n) && n >= 0 ? Math.min(100, n) : null };
      }),
    [items, values],
  );
  const summary = summarizeWeights(draft);
  const total = draft.reduce((s, d) => s + effectivePercent(draft, d.id), 0);
  const save = () => !summary.overflow && onSave(draft.map((d) => ({ id: d.id, weight: d.weight })));

  return (
    <Sheet visible={visible} title={t('weights.title')} onClose={onClose}>
      <Text style={{ color: theme.muted, marginBottom: 12, fontSize: 13, lineHeight: 19 }}>{t('weights.help')}</Text>
      <KeyboardScrollView style={{ flexGrow: 0 }}>
        {draft.map((d) => {
          const eff = effectivePercent(draft, d.id);
          return (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
                {d.title}
              </Text>
              <TextInput
                accessibilityLabel={t('weights.inputLabel', { name: d.title })}
                value={values[d.id] ?? ''}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [d.id]: v }))}
                keyboardType="decimal-pad"
                placeholder={`${Math.round(eff * 10) / 10}`}
                style={{
                  width: 84,
                  textAlign: 'right',
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.bg,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 16,
                }}
              />
              <Text style={{ color: theme.muted, width: 22, marginLeft: 4 }}>%</Text>
            </View>
          );
        })}
      </KeyboardScrollView>
      <Text style={{ color: summary.overflow ? theme.error : theme.muted, marginVertical: 8, fontSize: 13 }} accessibilityLiveRegion="polite">
        {summary.overflow
          ? t('weights.overflow', { total: Math.round(summary.fixedTotal * 10) / 10 })
          : t('weights.total', { total: Math.round(total) })}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title={t('weights.reset')}
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => setValues(Object.fromEntries(items.map((i) => [i.id, ''])))}
        />
        <Button title={t('common.save')} style={{ flex: 1 }} onPress={save} disabled={summary.overflow} />
      </View>
    </Sheet>
  );
}

/** Choix d'une date d'échéance. */
export function DateSheet({
  visible,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onSave: (date: string | null) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(value);

  useEffect(() => {
    if (!visible) return;
    setSelected(value);
    const base = value ? new Date(`${value}T12:00:00`) : new Date();
    setCursor({ y: base.getFullYear(), m: base.getMonth() });
  }, [visible, value]);

  return (
    <Sheet visible={visible} title={t('detail.dueDate')} onClose={onClose}>
      <MonthGrid
        year={cursor.y}
        month={cursor.m}
        onChangeMonth={(y, m) => setCursor({ y, m })}
        selected={selected}
        onSelect={setSelected}
      />
      <Text style={{ textAlign: 'center', marginVertical: 10, fontWeight: '600' }}>
        {selected ? formatDate(selected) : t('detail.none')}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('common.remove')} variant="ghost" style={{ flex: 1 }} onPress={() => onSave(null)} />
        <Button title={t('common.save')} style={{ flex: 1 }} disabled={!selected} onPress={() => selected && onSave(selected)} />
      </View>
    </Sheet>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Choix d'un rappel : jour + heure. */
export function ReminderSheet({
  visible,
  value,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: number | null;
  onClose: () => void;
  onSave: (timestamp: number | null) => void;
}) {
  const theme = useTheme();
  const [cursor, setCursor] = useState({ y: 0, m: 0 });
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const base = value ? new Date(value) : new Date();
    setCursor({ y: base.getFullYear(), m: base.getMonth() });
    setDay(value ? dayKey(value) : null);
    setHour(value ? base.getHours() : 9);
    setMinute(value ? base.getMinutes() : 0);
  }, [visible, value]);

  const timestamp = day ? new Date(`${day}T${pad(hour)}:${pad(minute)}:00`).getTime() : null;
  const inPast = timestamp !== null && timestamp <= Date.now();

  const stepper = (label: string, current: number, max: number, step: number, set: (n: number) => void) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton name="remove-circle-outline" label={`${label} −`} onPress={() => set((current - step + max) % max)} />
        <Text style={{ fontSize: 22, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>{pad(current)}</Text>
        <IconButton name="add-circle-outline" label={`${label} +`} onPress={() => set((current + step) % max)} />
      </View>
    </View>
  );

  return (
    <Sheet visible={visible} title={t('detail.reminder')} onClose={onClose}>
      <ScrollView style={{ flexGrow: 0 }}>
        <MonthGrid year={cursor.y} month={cursor.m} onChangeMonth={(y, m) => setCursor({ y, m })} selected={day} onSelect={setDay} />
        <View style={{ flexDirection: 'row', marginVertical: 10 }}>
          {stepper(t('reminder.hour'), hour, 24, 1, setHour)}
          {stepper(t('reminder.minute'), minute, 60, 5, setMinute)}
        </View>
        {inPast ? <Text style={{ color: theme.error, textAlign: 'center', marginBottom: 8 }}>{t('reminder.past')}</Text> : null}
        {!remindersSupported ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17, marginBottom: 10 }}>{t('reminder.webNote')}</Text> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('common.remove')} variant="ghost" style={{ flex: 1 }} onPress={() => onSave(null)} />
        <Button title={t('common.save')} style={{ flex: 1 }} disabled={timestamp === null || inPast} onPress={() => timestamp !== null && onSave(timestamp)} />
      </View>
    </Sheet>
  );
}
