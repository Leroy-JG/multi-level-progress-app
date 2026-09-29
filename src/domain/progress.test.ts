import { describe, expect, it } from 'vitest';
import { effectivePercent, progressOf, resolveWeights, summarizeWeights } from './progress';
import { canAddChild, depthOf, indexNodes, pathTo, subtreeIds } from './tree';
import { createNode, type ProgressNode } from './types';

let seq = 0;
function node(id: string, parentId: string | null, extra: Partial<ProgressNode> = {}): ProgressNode {
  return createNode({ id, parentId, title: id, position: seq++, ...extra });
}

describe('resolveWeights', () => {
  it('répartit en 1/N par défaut', () => {
    const w = resolveWeights([node('a', 'p'), node('b', 'p'), node('c', 'p'), node('d', 'p'), node('e', 'p')]);
    expect([...w.values()]).toEqual([0.2, 0.2, 0.2, 0.2, 0.2]);
  });

  it('respecte 70/30', () => {
    const w = resolveWeights([node('a', 'p', { weight: 70 }), node('b', 'p', { weight: 30 })]);
    expect(w.get('a')).toBeCloseTo(0.7);
    expect(w.get('b')).toBeCloseTo(0.3);
  });

  it('partage le reste entre les automatiques', () => {
    const w = resolveWeights([node('a', 'p', { weight: 50 }), node('b', 'p'), node('c', 'p')]);
    expect(w.get('a')).toBeCloseTo(0.5);
    expect(w.get('b')).toBeCloseTo(0.25);
    expect(w.get('c')).toBeCloseTo(0.25);
  });

  it('normalise quand tout est fixé mais ≠ 100', () => {
    const w = resolveWeights([node('a', 'p', { weight: 20 }), node('b', 'p', { weight: 20 })]);
    expect(w.get('a')).toBeCloseTo(0.5);
  });

  it('somme toujours 1', () => {
    const groups = [
      [node('a', 'p', { weight: 90 }), node('b', 'p', { weight: 40 }), node('c', 'p')],
      [node('a', 'p', { weight: 0 }), node('b', 'p', { weight: 0 })],
      [node('a', 'p', { weight: 33 }), node('b', 'p')],
    ];
    for (const g of groups) {
      const sum = [...resolveWeights(g).values()].reduce((s, v) => s + v, 0);
      expect(sum).toBeCloseTo(1);
    }
  });
});

describe('progressOf', () => {
  it('une feuille vaut 0 ou 1', () => {
    expect(progressOf([node('a', null)], 'a')).toBe(0);
    expect(progressOf([node('a', null, { progress: 100 })], 'a')).toBe(1);
    expect(progressOf([node('a', null, { progress: 40 })], 'a')).toBeCloseTo(0.4);
  });

  it('projet à 5 tâches : 20 % par tâche ; projet à 2 tâches : 50 % par tâche', () => {
    const five = [node('p', null), ...['1', '2', '3', '4', '5'].map((i) => node(`t${i}`, 'p'))];
    five[1] = { ...five[1]!, progress: 100 };
    expect(progressOf(five, 'p')).toBeCloseTo(0.2);
    const two = [node('q', null), node('u', 'q', { progress: 100 }), node('v', 'q')];
    expect(progressOf(two, 'q')).toBeCloseTo(0.5);
  });

  it('calcule récursivement sur 4 niveaux avec poids fixés', () => {
    const nodes = [
      node('p', null),
      node('sp1', 'p', { weight: 70 }),
      node('sp2', 'p', { weight: 30 }),
      node('t1', 'sp1'),
      node('t2', 'sp1'),
      node('st1', 't1', { progress: 100 }),
      node('st2', 't1'),
      node('t2b', 't2', { progress: 100 }),
      node('t3', 'sp2', { progress: 100 }),
    ];
    // t1 = 0.5 ; t2 = 1 → sp1 = 0.75 ; sp2 = 1 → p = 0.7*0.75 + 0.3*1 = 0.825
    expect(progressOf(nodes, 'p')).toBeCloseTo(0.825);
  });

  it('un parent ignore son propre avancement dès qu\'il a des enfants', () => {
    const nodes = [node('p', null, { progress: 100 }), node('a', 'p')];
    expect(progressOf(nodes, 'p')).toBe(0);
  });

  it('tout fait = 100 %', () => {
    const nodes = [node('p', null), node('a', 'p', { weight: 10, progress: 100 }), node('b', 'p', { progress: 100 })];
    expect(progressOf(nodes, 'p')).toBeCloseTo(1);
  });
});

describe('résumé et pourcentage effectif', () => {
  it('détecte le dépassement', () => {
    expect(summarizeWeights([node('a', 'p', { weight: 80 }), node('b', 'p', { weight: 40 })]).overflow).toBe(true);
    expect(summarizeWeights([node('a', 'p', { weight: 100 }), node('b', 'p')]).overflow).toBe(true);
    expect(summarizeWeights([node('a', 'p', { weight: 60 }), node('b', 'p')]).overflow).toBe(false);
  });

  it('donne le pourcentage effectif', () => {
    const sibs = [node('a', 'p', { weight: 60 }), node('b', 'p')];
    expect(effectivePercent(sibs, 'b')).toBeCloseTo(40);
  });
});

describe('arbre', () => {
  const nodes = [node('p', null), node('s', 'p'), node('t', 's'), node('st', 't')];
  const index = indexNodes(nodes);

  it('profondeur et limite de 4 niveaux', () => {
    expect(depthOf(index, 'p')).toBe(1);
    expect(depthOf(index, 'st')).toBe(4);
    expect(canAddChild(index, 't')).toBe(true);
    expect(canAddChild(index, 'st')).toBe(false);
  });

  it('chemin et sous-arbre', () => {
    expect(pathTo(index, 'st').map((n) => n.id)).toEqual(['p', 's', 't', 'st']);
    expect(subtreeIds(nodes, 's').sort()).toEqual(['s', 'st', 't']);
  });
});
