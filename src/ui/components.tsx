import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, type TKey } from '../i18n';
import { useKeyboardInset, useReveal } from './keyboard';
import { SheetHostContext } from './SheetHost';
import { onColor, useTheme } from './theme';

/* ---------- Typographie : Raleway, une police par graisse ---------- */

const FAMILY: Record<string, string> = {
  '400': 'Raleway_400Regular',
  '500': 'Raleway_500Medium',
  '600': 'Raleway_600SemiBold',
  '700': 'Raleway_700Bold',
  '800': 'Raleway_800ExtraBold',
};

function withFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = flat.fontWeight === 'bold' ? '700' : String(flat.fontWeight ?? '400');
  const family = FAMILY[weight] ?? FAMILY['400'];
  return [flat, { fontFamily: family, fontWeight: undefined }];
}

export function Text({ style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText {...rest} style={withFont([{ color: theme.text }, style])} />;
}

export function TextInput({ style, onFocus, onBlur, ...rest }: TextInputProps) {
  const theme = useTheme();
  const reveal = useReveal();
  const ref = useRef<RNTextInput>(null);
  return (
    <RNTextInput
      placeholderTextColor={theme.muted}
      {...rest}
      ref={ref}
      onFocus={(e) => {
        reveal?.focus(ref.current);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        reveal?.blur(ref.current);
        onBlur?.(e);
      }}
      style={withFont([{ color: theme.text }, style])}
    />
  );
}

/* ---------- Éléments de base ---------- */

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, value));
  const done = clamped >= 1 - 1e-9;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: theme.track, overflow: 'hidden' }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: done ? theme.success : (color ?? theme.bar),
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export function Checkbox({ checked, partial, onPress, label }: { checked: boolean; partial?: boolean; onPress: () => void; label?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: partial ? 'mixed' : checked }}
      style={[
        styles.checkbox,
        {
          borderColor: checked ? theme.success : theme.muted,
          backgroundColor: checked ? theme.success : 'transparent',
        },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      {!checked && partial ? <View style={{ width: 10, height: 2, backgroundColor: theme.muted }} /> : null}
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  label,
  color,
  size = 22,
  disabled,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[styles.iconBtn, { opacity: disabled ? 0.3 : 1 }]}
    >
      <Ionicons name={name} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'solid',
  disabled,
  style,
  color,
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Remplace la couleur d'action (ex. couleur du projet). */
  color?: string;
}) {
  const theme = useTheme();
  const bg = color ?? theme.action;
  const solid = variant === 'solid';
  const fg = solid ? (color ? onColor(color) : theme.onAction) : variant === 'danger' ? theme.error : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.button,
        {
          backgroundColor: solid ? bg : 'transparent',
          borderColor: solid ? bg : variant === 'danger' ? theme.error : theme.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.chip,
        { borderColor: selected ? theme.action : theme.border, backgroundColor: selected ? theme.action : 'transparent' },
      ]}
    >
      <Text style={{ color: selected ? theme.onAction : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { borderColor: theme.border, backgroundColor: theme.track }]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          style={[styles.segment, { backgroundColor: o.value === value ? theme.action : 'transparent' }]}
        >
          <Text style={{ color: o.value === value ? theme.onAction : theme.text, fontWeight: '600', fontSize: 14 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: theme.border, backgroundColor: theme.bg }, style]}
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        accent ? { borderLeftColor: accent, borderLeftWidth: 5 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Feuille du bas. Son contenu est affiché par <SheetProvider> (voir SheetHost) ; ce composant ne rend rien
 * lui-même, il gère l'animation d'entrée / sortie et la touche « retour » d'Android.
 */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const host = useContext(SheetHostContext);
  const id = useId();
  const [mounted, setMounted] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: NATIVE_DRIVER }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => subscription.remove();
  }, [visible]);

  // Publie le contenu à chaque rendu : le contenu suit ainsi les changements d'état du propriétaire.
  useEffect(() => {
    host?.set(
      id,
      mounted ? (
        <SheetLayer title={title} onClose={onClose} anim={anim}>
          {children}
        </SheetLayer>
      ) : null,
    );
  });
  useEffect(() => () => host?.set(id, null), [host, id]);

  return null;
}

function SheetLayer({ title, onClose, anim, children }: { title: string; onClose: () => void; anim: Animated.Value; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();
  const { height } = useWindowDimensions();
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  return (
    // Le clavier occupe le bas de l'écran : la feuille se pose juste au-dessus.
    <View role="dialog" aria-modal style={[styles.layer, { paddingBottom: keyboard }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('common.close')} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: theme.card, paddingBottom: keyboard > 0 ? 16 : 24 + insets.bottom, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={{ fontSize: 19, fontWeight: '800', flex: 1 }}>{title}</Text>
          <IconButton name="close" onPress={onClose} label={t('common.close')} />
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

/** Dialogue de confirmation. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Text style={{ color: theme.muted, marginBottom: 16, lineHeight: 20 }}>{message}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={t('common.cancel')} variant="ghost" style={{ flex: 1 }} onPress={onClose} />
        <Button title={confirmLabel} variant={danger ? 'danger' : 'solid'} style={{ flex: 1 }} onPress={onConfirm} />
      </View>
    </Sheet>
  );
}

/* ---------- Navigation du bas ---------- */

export type TabKey = 'home' | 'calendar' | 'stats' | 'settings';

const TABS: { key: TabKey; path: '/' | '/calendar' | '/stats' | '/settings'; icon: keyof typeof Ionicons.glyphMap; label: TKey }[] = [
  { key: 'home', path: '/', icon: 'git-branch-outline', label: 'tab.project' },
  { key: 'calendar', path: '/calendar', icon: 'calendar-outline', label: 'tab.calendar' },
  { key: 'stats', path: '/stats', icon: 'stats-chart-outline', label: 'tab.stats' },
  { key: 'settings', path: '/settings', icon: 'settings-outline', label: 'tab.settings' },
];

/** `onActivePress` : appui sur l'onglet déjà actif (utile sur un sous-écran d'un onglet, pour revenir à l'onglet). */
export function BottomBar({ active, onActivePress }: { active: TabKey; onActivePress?: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: insets.bottom + 6 }]}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => (selected ? onActivePress?.() : router.replace(tab.path))}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t(tab.label)}
            style={styles.tab}
          >
            <Ionicons name={tab.icon} size={22} color={selected ? theme.action : theme.muted} />
            <Text style={{ fontSize: 11, marginTop: 2, fontWeight: selected ? '700' : '500', color: selected ? theme.text : theme.muted }}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Hook utilitaire pour un booléen d'ouverture de feuille. */
export function useToggle(initial = false): [boolean, () => void, () => void] {
  const [value, setValue] = useState(initial);
  return [value, () => setValue(true), () => setValue(false)];
}

const styles = StyleSheet.create({
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { padding: 6 },
  button: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  segmented: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  layer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(20,33,61,0.55)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
});
