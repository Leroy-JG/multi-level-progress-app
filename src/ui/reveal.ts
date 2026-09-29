/**
 * Position de défilement à viser pour qu'un champ reste entièrement visible dans la zone
 * libre au-dessus du clavier ; `null` si le champ y est déjà.
 */
export function revealOffset(p: {
  /** Position de défilement actuelle. */
  scrollTop: number;
  /** Hauteur visible de la zone défilante (clavier exclu). */
  viewport: number;
  /** Position du haut du champ dans le contenu défilant. */
  y: number;
  height: number;
  /** Espace laissé autour du champ. */
  margin: number;
}): number | null {
  const top = p.y - p.margin;
  const bottom = p.y + p.height + p.margin;
  if (p.viewport <= 0) return null;
  if (top < p.scrollTop) return Math.max(0, top);
  if (bottom > p.scrollTop + p.viewport) return Math.max(0, bottom - p.viewport);
  return null;
}
