# Famille de marque : décider les couleurs d'une nouvelle app

Alam est l'app de référence. Les apps suivantes forment une famille : elles gardent les mêmes couleurs « de fonction » (or, validation, échec, crème) et ne changent que la couleur de fond de marque, celle qu'on voit sur le logo et en petits rappels dans l'app. Ce fichier est la première étape d'un nouveau projet : **décider les couleurs avant tout le reste.**

## 1. Ce qui ne change jamais

| Rôle | Clair | Sombre |
|---|---|---|
| Or (`accent`) : action en sombre, remplissage du logo | `#C9A227` | `#C9A227` |
| Or chaud (`accentWarm`) : accent en sombre | | `#E8A317` |
| Succès (terminé) | `#2F6B4F` | `#5FB58A` |
| Erreur (retard, suppression) | `#B5623B` | `#E0906B` |
| Crème : fond clair, texte en sombre | `#F4EBD9` | `#F4EBD9` |
| Noir chaud : texte en clair, texte posé sur l'or | `#1C1A17` | `#1C1A17` |
| Texte secondaire (`muted`) | `#6B6152` | `#B4AC9A` |
| Pierre (`neutral`) | `#8A7F6D` | `#8A7F6D` |

Surfaces claires communes : carte `#FBF7EE`, contour `#DDD0B4`, piste `#E3D7BC`.

Autres petits rappels de famille, hors couleurs : police Raleway, barres et pastilles en pilule, design à plat (contours de 1 px, aucune ombre). Les 12 couleurs « pigments » (kermes, cornaline, orpiment, olive, turquoise, ciel, lapis, indigo, pourpre, rose-damas, henne, pierre) restent la palette commune pour identifier une entité.

## 2. Ce qui change : trois choix par app

| Choix | Rôle |
|---|---|
| `ground` : fond de marque (= primary) | Fond du logo, de l'écran de démarrage, action et barres en thème clair |
| `night` : fond sombre | Fond du thème sombre |
| `secondary` : secondaire | Remplissage des barres en thème sombre. Se prend parmi les 12 pigments |

S'y ajoutent les surfaces du thème sombre (carte, contour, piste) : elles ne se choisissent pas, elles se déduisent de la teinte du fond (`darkSurfaces`, § 7).

## 3. Où vit la couleur de marque

C'est tout ce qu'il y a à changer dans une nouvelle app, et nulle part ailleurs : l'interface ne se teinte pas.

- **Logo et icônes** : fond de `assets/icon.png`, `favicon.png`, `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (constante `PRIMARY` de `scripts/make-icons.mjs`) ; fond de l'icône Android adaptative (`app.json` → `android.adaptiveIcon.backgroundColor`).
- **Écran de démarrage** (`app.json`, plugin `expo-splash-screen`) : `ground` en clair, `night` en sombre.
- **Couleur d'accent des notifications** (`expo-notifications`), `theme_color` du manifeste PWA et `<meta name="theme-color">` de `public/index.html` : `ground`.
- **Thème clair** : `action` et `bar` = `ground` ; couleur de projet par défaut = `ground`.
- **Thème sombre** : fond = `night` ; surfaces = `card` / `border` / `track` ; barres = `secondary` ; l'or porte les actions. Le `<body>` de `public/index.html` passe aussi en `night` (`prefers-color-scheme: dark`).

## 4. La règle d'accord avec l'or

**Le fond de marque doit avoir une teinte entre 210° et 350°** (bleu, indigo, violet, lie-de-vin). Hors de cette zone, aucune couleur ne passe les critères ci-dessous : les verts et les teals se confondent avec « terminé », les rouges-orangés et les bruns avec « erreur » et avec l'or, et les jaunes n'ont aucun contraste avec lui. Un balayage des teintes (par pas de 10°) l'a vérifié.

Dans cette zone, une palette est acceptée si elle respecte tous les seuils (contrôlés par `checkPalette`, § 7) :

| Critère | Seuil | Alam | Indigo | Prune | Lie-de-vin |
|---|---|---|---|---|---|
| Teinte du fond | 210°–350° | 223° | 249° | 279° | 330° |
| Or sur fond (logo) | ≥ 3,5 | 3,88 | 3,61 | 4,14 | 3,83 |
| Blanc sur fond (bouton) | ≥ 7 | 9,40 | 8,73 | 10,00 | 9,27 |
| Fond sur crème (action en clair) | ≥ 6 | 7,94 | 7,37 | 8,45 | 7,82 |
| Écart de couleur (ΔE) fond / succès | ≥ 45 | 69 | 76 | 74 | 69 |
| Écart de couleur (ΔE) fond / erreur | ≥ 45 | 84 | 82 | 72 | 48 |
| Or sur `night` | ≥ 6 | 6,60 | 7,17 | 6,74 | 6,52 |
| Crème sur `night` | ≥ 12 | 13,49 | 14,64 | 13,76 | 13,33 |
| `secondary` sur la piste sombre | ≥ 3 | 3,18 | 3,53 | 3,16 | 3,01 |
| ΔE `secondary` / succès sombre | ≥ 35 | **26** | 60 | 76 | 60 |

Contrôlés aussi : texte secondaire sombre sur la carte sombre ≥ 4,5 ; ΔE `secondary` / or ≥ 40.

Pourquoi ces seuils : l'or est la couleur qui relie toute la famille (il porte les actions en sombre et remplit le logo) ; le fond doit donc le faire ressortir (contraste). La barre passe au vert « terminé » et les retards passent en terre cuite : un fond trop proche de l'une ou l'autre brouillerait ces signaux (ΔE, écart de couleur perçu).

**Écart connu : Alam** garde son turquoise (hérité de la v1), à ΔE 26 du vert « terminé » en thème sombre, sous le seuil de 35 appliqué aux nouvelles apps. Il n'est pas modifié.

## 5. Palettes validées : choisir en premier

| Palette | `ground` | `night` | `card` | `border` | `track` | `secondary` |
|---|---|---|---|---|---|---|
| **alam** (lapis, référence) | `#26428B` | `#14213D` | `#1D2B4B` | `#31426A` | `#2F3F65` | `#2A9D9F` turquoise |
| **indigo** | `#4B3F8F` | `#1A143D` | `#241D4B` | `#39316A` | `#372F65` | `#5B8FC7` ciel |
| **prune** | `#5B2F73` | `#2F143D` | `#3B1D4B` | `#56316A` | `#522F65` | `#C9708A` rose-damas |
| **vin** (lie-de-vin) | `#7A2952` | `#3D1429` | `#4B1D34` | `#6A314E` | `#652F4A` | `#5B8FC7` ciel |

Une app = une palette ; deux apps de la famille évitent la même. Les trois palettes autres qu'Alam passent tous les contrôles. Pour en ajouter une : choisir une teinte entre 210° et 350°, régler saturation et luminosité jusqu'à ce que `checkPalette` renvoie une liste vide, déduire les tons sombres avec `darkSurfaces`, choisir le secondaire parmi les pigments.

## 6. Démarrer un nouveau projet : checklist

1. Choisir une palette du § 5 (ou en créer une selon la règle du § 4).
2. Copier le code du § 7 dans `brand.ts` de la nouvelle app ; brancher `themeFor(PALETTES.xxx)` à la place des thèmes écrits en dur.
3. Remplacer la couleur de marque aux endroits du § 3.
4. Icône : fond = `ground`, symbole propre à l'app en or (`#C9A227`) avec des détails en crème translucide (28 % pour les surfaces, 75 % pour les traits), sur le modèle de `scripts/make-icons.mjs`. Changer une icône PWA ⇒ incrémenter `CACHE` dans `public/sw.js`.
5. Noter la palette choisie dans le `CLAUDE.md` du nouveau projet.

## 7. Code (à copier)

```ts
// family.ts — couleurs de la famille de marque (Alam = référence)

/** Identique dans toutes les apps de la famille. */
export const FAMILY = {
  accent: '#C9A227', // or : action en thème sombre, remplissage du logo
  accentWarm: '#E8A317', // or chaud : accent en thème sombre
  neutral: '#8A7F6D', // pierre
  ink: '#1C1A17', // noir chaud : texte en clair, texte posé sur l'or
  cream: '#F4EBD9', // parchemin : fond clair, texte en sombre
  muted: { light: '#6B6152', dark: '#B4AC9A' },
  success: { light: '#2F6B4F', dark: '#5FB58A' },
  error: { light: '#B5623B', dark: '#E0906B' },
} as const;

/** Ce qui change d'une app à l'autre : 3 choix (ground, night, secondary) + les tons sombres qui en dérivent. */
export interface Palette {
  ground: string; // fond de marque (= primary) : icône, splash, action et barres en thème clair
  night: string; // fond du thème sombre
  card: string; // surfaces du thème sombre
  border: string;
  track: string;
  secondary: string; // barres en thème sombre (un des 12 pigments)
}

export const PALETTES = {
  // Référence. Écart connu : son turquoise est proche du vert « terminé » en sombre (règle vérifiée sur les nouvelles apps).
  alam: { ground: '#26428B', night: '#14213D', card: '#1D2B4B', border: '#31426A', track: '#2F3F65', secondary: '#2A9D9F' },
  indigo: { ground: '#4B3F8F', night: '#1A143D', card: '#241D4B', border: '#39316A', track: '#372F65', secondary: '#5B8FC7' },
  prune: { ground: '#5B2F73', night: '#2F143D', card: '#3B1D4B', border: '#56316A', track: '#522F65', secondary: '#C9708A' },
  vin: { ground: '#7A2952', night: '#3D1429', card: '#4B1D34', border: '#6A314E', track: '#652F4A', secondary: '#5B8FC7' },
} satisfies Record<string, Palette>;

/** Thèmes clair et sombre d'une palette (mêmes jetons que `THEME` de la charte). */
export function themeFor(p: Palette) {
  return {
    light: {
      bg: FAMILY.cream, card: '#FBF7EE', text: FAMILY.ink, muted: FAMILY.muted.light, border: '#DDD0B4', track: '#E3D7BC',
      action: p.ground, onAction: '#FFFFFF', bar: p.ground,
      success: FAMILY.success.light, error: FAMILY.error.light, accent: FAMILY.accent,
    },
    dark: {
      bg: p.night, card: p.card, text: FAMILY.cream, muted: FAMILY.muted.dark, border: p.border, track: p.track,
      action: FAMILY.accent, onAction: FAMILY.ink, bar: p.secondary,
      success: FAMILY.success.dark, error: FAMILY.error.dark, accent: FAMILY.accentWarm,
    },
  } as const;
}

type Rgb = [number, number, number];
const rgb = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linear = (h: string): Rgb => rgb(h).map(lin) as Rgb;

export function contrast(a: string, b: string): number {
  const L = (h: string) => {
    const [r, g, bl] = linear(h);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [L(a), L(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Écart de couleur perçu (CIE Lab, ΔE76) : en dessous de ~35, deux couleurs se confondent facilement. */
export function deltaE(a: string, b: string): number {
  const lab = (h: string) => {
    const [r, g, bl] = linear(h);
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047);
    const y = f(0.2126 * r + 0.7152 * g + 0.0722 * bl);
    const z = f((0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)] as Rgb;
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

export function hue(h: string): number {
  const [r, g, b] = rgb(h).map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const k = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return k * 60;
}

function fromHsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** Tons sombres d'un nouveau fond de marque : même teinte, proportions mesurées sur Alam. */
export function darkSurfaces(ground: string) {
  const h = hue(ground);
  return {
    night: fromHsl(h, 0.506, 0.159),
    card: fromHsl(h, 0.44, 0.204),
    border: fromHsl(h, 0.37, 0.304),
    track: fromHsl(h, 0.36, 0.29),
  };
}

/** Règles non respectées par une palette (liste vide = elle va avec l'or et avec les couleurs de fonction). */
export function checkPalette(p: Palette): string[] {
  const { accent, cream, success, error, muted } = FAMILY;
  const h = hue(p.ground);
  const rules: [string, boolean][] = [
    ['teinte du fond hors de 210°–350°', h >= 210 && h <= 350],
    ['or sur fond < 3,5:1', contrast(accent, p.ground) >= 3.5],
    ['blanc sur fond < 7:1', contrast('#FFFFFF', p.ground) >= 7],
    ['fond sur crème < 6:1', contrast(p.ground, cream) >= 6],
    ['fond trop proche de success (ΔE < 45)', deltaE(p.ground, success.light) >= 45],
    ['fond trop proche de error (ΔE < 45)', deltaE(p.ground, error.light) >= 45],
    ['or sur nuit < 6:1', contrast(accent, p.night) >= 6],
    ['crème sur nuit < 12:1', contrast(cream, p.night) >= 12],
    ['texte secondaire sur carte sombre < 4,5:1', contrast(muted.dark, p.card) >= 4.5],
    ['secondaire sur piste < 3:1', contrast(p.secondary, p.track) >= 3],
    ['secondaire trop proche de success sombre (ΔE < 35)', deltaE(p.secondary, success.dark) >= 35],
    ['secondaire trop proche de l\'or (ΔE < 40)', deltaE(p.secondary, accent) >= 40],
  ];
  return rules.filter(([, ok]) => !ok).map(([label]) => label);
}
```
