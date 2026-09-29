import { describe, expect, it } from 'vitest';
import { exportData, parseImport, ImportError } from './exchange';
import { dayKey, eventsByDay, projectStats } from './insights';
import { clampPercent, moveSibling, setSubtreeProgress, syncCompletion, toggleComplete } from './mutations';
import { isComplete, progressOf } from './progress';
import { createNode, type ProgressNode } from './types';

const n = (id: string, parentId: string | null, extra: Partial<ProgressNode> = {}) =>
  createNode({ id, parentId, title: id, ...extra });

const tree = () => [
  n('p', null),
  n('a', 'p', { position: 0 }),
  n('b', 'p', { position: 1 }),
  n('a1', 'a', { position: 0 }),
  n('a2', 'a', { position: 1 }),
];

describe('cocher / avancement manuel', () => {
  it('cocher un parent termine toute sa sous-arborescence, décocher remet à 0', () => {
    const done = toggleComplete(tree(), 'a');
    expect(done.find((x) => x.id === 'a1')?.progress).toBe(100);
    expect(done.find((x) => x.id === 'a2')?.progress).toBe(100);
    expect(isComplete(done, 'a')).toBe(true);
    const undone = toggleComplete(done, 'a');
    expect(progressOf(undone, 'a')).toBe(0);
  });

  it('une feuille peut recevoir un avancement manuel borné 0–100', () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(NaN)).toBe(0);
    const next = setSubtreeProgress(tree(), 'b', 35);
    expect(progressOf(next, 'b')).toBeCloseTo(0.35);
  });

  it('conserve les références des nœuds inchangés', () => {
    const before = tree();
    const after = setSubtreeProgress(before, 'b', 50);
    expect(after.find((x) => x.id === 'a')).toBe(before.find((x) => x.id === 'a'));
  });
});

describe('date de complétion', () => {
  it('est posée à 100 %, conservée ensuite, effacée si on repasse sous 100 %', () => {
    const t1 = 1_000;
    let nodes = syncCompletion(toggleComplete(tree(), 'a'), t1);
    expect(nodes.find((x) => x.id === 'a')?.completedAt).toBe(t1);
    expect(nodes.find((x) => x.id === 'a1')?.completedAt).toBe(t1);
    expect(nodes.find((x) => x.id === 'p')?.completedAt).toBeNull();

    nodes = syncCompletion(nodes, 9_999); // rien ne change : la date d'origine reste
    expect(nodes.find((x) => x.id === 'a')?.completedAt).toBe(t1);

    nodes = syncCompletion(setSubtreeProgress(nodes, 'a2', 50), 2_000);
    expect(nodes.find((x) => x.id === 'a')?.completedAt).toBeNull();
    expect(nodes.find((x) => x.id === 'a1')?.completedAt).toBe(t1);
  });

  it('le projet est daté quand tout est terminé', () => {
    const nodes = syncCompletion(toggleComplete(tree(), 'p'), 5_000);
    expect(nodes.find((x) => x.id === 'p')?.completedAt).toBe(5_000);
  });
});

describe('réordonnancement', () => {
  it('échange avec le voisin et ignore les bords', () => {
    const down = moveSibling(tree(), 'a', 1);
    expect(down.find((x) => x.id === 'a')?.position).toBe(1);
    expect(down.find((x) => x.id === 'b')?.position).toBe(0);
    const edge = moveSibling(tree(), 'a', -1);
    expect(edge.find((x) => x.id === 'a')?.position).toBe(0);
  });

  it("ne touche pas aux frères d'un autre parent", () => {
    const before = tree();
    const after = moveSibling(before, 'a1', 1);
    expect(after.find((x) => x.id === 'a')).toBe(before.find((x) => x.id === 'a'));
    expect(after.find((x) => x.id === 'a1')?.parentId).toBe('a');
  });
});

describe('calendrier et statistiques', () => {
  const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

  it('regroupe complétions et échéances par jour', () => {
    const nodes = [
      n('p', null),
      n('a', 'p', { completedAt: noon(2026, 3, 10), progress: 100 }),
      n('b', 'p', { dueDate: '2026-03-12' }),
      n('other', null),
      n('x', 'other', { completedAt: noon(2026, 3, 10), progress: 100 }),
    ];
    const events = eventsByDay(nodes, 'p');
    expect(events.get('2026-03-10')?.completed.map((e) => e.id)).toEqual(['a']);
    expect(events.get('2026-03-12')?.due.map((e) => e.id)).toEqual(['b']);
    expect(dayKey(noon(2026, 3, 10))).toBe('2026-03-10');
  });

  it('calcule les statistiques du projet', () => {
    const now = noon(2026, 3, 10);
    const nodes = [
      n('p', null),
      n('a', 'p', { progress: 100, completedAt: now - 3600_000 }),
      n('b', 'p', { dueDate: '2026-03-01' }),
      n('c', 'p', { dueDate: '2026-03-13' }),
      n('d', 'p', { dueDate: '2026-04-30' }),
    ];
    const s = projectStats(nodes, 'p', now);
    expect(s).toMatchObject({ total: 4, completed: 1, leaves: 4, leavesCompleted: 1, overdue: 1, dueSoon: 1, completedLast7Days: 1 });
  });
});

describe('export / import', () => {
  it('fait un aller-retour sans perte', () => {
    const nodes = [n('p', null, { color: '#A3303F' }), n('a', 'p', { note: 'salut', dueDate: '2026-05-01', progress: 40, weight: 30 })];
    expect(parseImport(exportData(nodes, 1))).toEqual(nodes);
  });

  it('rejette les fichiers invalides', () => {
    expect(() => parseImport('pas du json')).toThrow(ImportError);
    expect(() => parseImport('{"app":"autre","nodes":[]}')).toThrow(ImportError);
    const orphan = JSON.stringify({ app: 'w-progress', nodes: [{ id: 'a', parentId: 'inconnu', title: 'x' }] });
    expect(() => parseImport(orphan)).toThrow(ImportError);
    const dup = JSON.stringify({ app: 'w-progress', nodes: [{ id: 'a', parentId: null }, { id: 'a', parentId: null }] });
    expect(() => parseImport(dup)).toThrow(ImportError);
  });

  it('rejette les cycles et les arbres trop profonds', () => {
    const cycle = JSON.stringify({ app: 'w-progress', nodes: [{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }] });
    expect(() => parseImport(cycle)).toThrow(ImportError);
    const deep = ['a', 'b', 'c', 'd', 'e'].map((id, i, arr) => ({ id, parentId: i === 0 ? null : arr[i - 1] }));
    expect(() => parseImport(JSON.stringify({ app: 'w-progress', nodes: deep }))).toThrow(ImportError);
  });

  it('convertit l’ancien format (done)', () => {
    const v1 = JSON.stringify({ app: 'w-progress', nodes: [{ id: 'a', parentId: null, title: 'x', done: true }] });
    expect(parseImport(v1)[0]?.progress).toBe(100);
  });
});
