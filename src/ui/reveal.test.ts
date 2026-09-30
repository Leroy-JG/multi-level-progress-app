import { describe, expect, it } from 'vitest';
import { revealOffset } from './reveal';

const base = { scrollTop: 0, viewport: 400, height: 50, margin: 16 };

describe('revealOffset', () => {
  it('ne bouge pas quand le champ est déjà visible', () => {
    expect(revealOffset({ ...base, y: 100 })).toBeNull();
    expect(revealOffset({ ...base, y: 334 })).toBeNull(); // bas = 400 pile
  });

  it('remonte le contenu quand le champ passe sous le clavier', () => {
    // champ à y=500 : son bas + marge = 566 → il faut défiler de 566 − 400
    expect(revealOffset({ ...base, y: 500 })).toBe(166);
  });

  it('tient compte de la position de défilement actuelle', () => {
    expect(revealOffset({ ...base, scrollTop: 300, y: 500 })).toBeNull();
    expect(revealOffset({ ...base, scrollTop: 300, y: 800 })).toBe(466);
  });

  it('redescend quand le champ est au-dessus de la zone visible, sans passer sous 0', () => {
    expect(revealOffset({ ...base, scrollTop: 300, y: 200 })).toBe(184);
    expect(revealOffset({ ...base, scrollTop: 300, y: 5 })).toBe(0);
  });

  it('ne fait rien tant que la hauteur visible est inconnue', () => {
    expect(revealOffset({ ...base, viewport: 0, y: 500 })).toBeNull();
  });
});
