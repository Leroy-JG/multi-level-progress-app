import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type TextInput as RNTextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { revealOffset } from './reveal';

/**
 * Espace occupé par le clavier en bas de l'écran (0 quand il est fermé).
 *
 * Sur Android l'application dessine sous les barres système (edge-to-edge) : la fenêtre ne se
 * redimensionne pas à l'ouverture du clavier, c'est à l'écran de se laisser de la place. On ne se fie
 * qu'à la hauteur annoncée par le clavier, et on y ajoute la barre de navigation qu'il recouvre.
 */
export function useKeyboardInset(): number {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(() => (Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0));

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return Platform.OS === 'android' && height > 0 ? height + insets.bottom : height;
}

/* ---------- Défilement automatique vers le champ actif ---------- */

interface RevealApi {
  focus(input: RNTextInput | null): void;
  blur(input: RNTextInput | null): void;
}

const RevealContext = createContext<RevealApi | null>(null);

/** Pour les champs de saisie : prévient la zone défilante englobante qu'ils ont le focus. */
export function useReveal(): RevealApi | null {
  return useContext(RevealContext);
}

const REVEAL_MARGIN = 24;

/**
 * ScrollView qui garde le champ en cours de saisie visible : au focus, et à chaque fois que la zone
 * visible change (ouverture du clavier) ou que le contenu grandit (saisie multiligne).
 */
export function KeyboardScrollView({ onLayout, onScroll, onContentSizeChange, ...props }: ScrollViewProps) {
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const offset = useRef(0);
  const focused = useRef<RNTextInput | null>(null);

  const reveal = useCallback(() => {
    const input = focused.current;
    const view = scroll.current;
    // getInnerViewRef existe à l'exécution (natif et web) mais pas dans les types de React Native.
    const inner = (view as unknown as { getInnerViewRef?: () => Parameters<RNTextInput['measureLayout']>[0] | null } | null)?.getInnerViewRef?.();
    if (!input || !view || !inner) return;
    input.measureLayout(
      inner,
      (_x, y, _w, height) => {
        const target = revealOffset({ scrollTop: offset.current, viewport: viewport.current, y, height, margin: REVEAL_MARGIN });
        if (target !== null) view.scrollTo({ y: target, animated: true });
      },
      () => {},
    );
  }, []);

  const api = useMemo<RevealApi>(
    () => ({
      focus(input) {
        focused.current = input;
        reveal();
      },
      blur(input) {
        if (focused.current === input) focused.current = null;
      },
    }),
    [reveal],
  );

  return (
    <RevealContext.Provider value={api}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        {...props}
        ref={scroll}
        onLayout={(e: LayoutChangeEvent) => {
          const changed = viewport.current !== e.nativeEvent.layout.height;
          viewport.current = e.nativeEvent.layout.height;
          if (changed) reveal();
          onLayout?.(e);
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        onContentSizeChange={(w, h) => {
          reveal();
          onContentSizeChange?.(w, h);
        }}
      />
    </RevealContext.Provider>
  );
}
