import { beforeEach, describe, expect, it } from 'vitest';
import { getExpanded, resetExpanded, toggleExpanded } from './expansion';

describe('accordéons', () => {
  beforeEach(() => resetExpanded());

  it('ouvre puis referme un élément', () => {
    expect(getExpanded().has('a')).toBe(false);
    toggleExpanded('a');
    expect(getExpanded().has('a')).toBe(true);
    toggleExpanded('a');
    expect(getExpanded().has('a')).toBe(false);
  });

  it('garde les autres accordéons ouverts', () => {
    toggleExpanded('a');
    toggleExpanded('b');
    toggleExpanded('a');
    expect([...getExpanded()]).toEqual(['b']);
  });

  it('renvoie un nouvel ensemble à chaque changement (nécessaire pour re-rendre)', () => {
    const before = getExpanded();
    toggleExpanded('a');
    expect(getExpanded()).not.toBe(before);
    expect(before.size).toBe(0);
  });
});
