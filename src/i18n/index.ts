import { fr } from './fr';

/**
 * Module de traduction minimal. Pour ajouter une langue : créer `en.ts` avec les mêmes clés que `fr.ts`
 * et l'enregistrer dans `LANGUAGES` ; `setLanguage` bascule ensuite le dictionnaire actif.
 */
export type TKey = keyof typeof fr;
type Dictionary = Record<TKey, string>;

export const LANGUAGES: Record<string, { label: string; dict: Dictionary; months: string[]; weekdays: string[] }> = {
  fr: {
    label: 'Français',
    dict: fr,
    months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    weekdays: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  },
};

let current = LANGUAGES.fr!;

export function setLanguage(code: string): void {
  current = LANGUAGES[code] ?? LANGUAGES.fr!;
}

export function t(key: TKey, params?: Record<string, string | number>): string {
  let text = current.dict[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** Pluriel : utilise `<clé>_one` quand n vaut 0 ou 1 (règle française), `<clé>_other` sinon. */
export function tn(key: string, n: number, params?: Record<string, string | number>): string {
  const suffix = n === 0 || n === 1 ? '_one' : '_other';
  return t((key + suffix) as TKey, { n, ...params });
}

export const monthName = (monthIndex: number): string => current.months[monthIndex] ?? '';
export const weekdayLetters = (): string[] => current.weekdays;

/** 'AAAA-MM-JJ' → '12 mars 2026'. */
export function formatDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return `${d === 1 ? '1er' : d} ${monthName(m - 1)} ${y}`;
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${formatDate(key)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 512 → '512 o', 24 600 → '24,0 Ko', 3 500 000 → '3,3 Mo'. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const [value, unit] = bytes < 1024 * 1024 ? [bytes / 1024, 'Ko'] : [bytes / (1024 * 1024), 'Mo'];
  return `${value.toFixed(1).replace('.', ',')} ${unit}`;
}
