import { createContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Les feuilles (dialogues du bas) s'affichent dans la fenêtre principale, par-dessus toute l'application,
 * et non dans un `Modal` natif : sous Android un `Modal` est une fenêtre à part qui ne reçoit pas les
 * événements du clavier, donc impossible d'y remonter le contenu au-dessus du clavier.
 *
 * Chaque <Sheet> déclare son contenu ici ; l'état des composants reste chez leur propriétaire.
 */
interface Entry {
  id: string;
  element: ReactNode;
}

export interface SheetHostApi {
  /** Affiche (ou met à jour) le contenu de la feuille `id` ; `null` la retire. */
  set(id: string, element: ReactNode | null): void;
}

export const SheetHostContext = createContext<SheetHostApi | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);

  const api = useMemo<SheetHostApi>(
    () => ({
      set(id, element) {
        setEntries((prev) => {
          const known = prev.some((e) => e.id === id);
          if (element === null) return known ? prev.filter((e) => e.id !== id) : prev;
          return known ? prev.map((e) => (e.id === id ? { id, element } : e)) : [...prev, { id, element }];
        });
      },
    }),
    [],
  );

  return (
    <SheetHostContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {entries.map((e) => (
          <View key={e.id} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {e.element}
          </View>
        ))}
      </View>
    </SheetHostContext.Provider>
  );
}
