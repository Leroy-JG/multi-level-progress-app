// Garde-fous du principe « les données n'existent que sur l'appareil de l'utilisateur » (voir PRIVACY.md).
// Ces tests échouent si quelqu'un ajoute, même sans y penser, un envoi réseau, un outil de mesure d'audience,
// une sauvegarde cloud ou une permission Internet.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
  });
}

describe('code de l’application : aucun accès réseau', () => {
  const files = [...sourceFiles('src'), ...sourceFiles('app')];

  it('a des fichiers à vérifier', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  const forbidden: [string, RegExp][] = [
    ['fetch', /\bfetch\s*\(/],
    ['XMLHttpRequest', /XMLHttpRequest/],
    ['WebSocket', /WebSocket/],
    ['EventSource', /EventSource/],
    ['sendBeacon', /sendBeacon/],
    ['ouverture de lien (Linking.openURL)', /openURL/],
    ['adresse http(s)', /https?:\/\//],
    ['import d’un client réseau', /from\s+['"](axios|ky|got|node-fetch|cross-fetch|socket\.io-client)['"]/],
  ];

  for (const [label, pattern] of forbidden) {
    it(`n’utilise pas ${label}`, () => {
      const offenders = files.filter((f) => pattern.test(read(f)));
      expect(offenders).toEqual([]);
    });
  }
});

describe('dépendances : ni mesure d’audience, ni réseau, ni mise à jour à distance', () => {
  const deps = Object.keys((JSON.parse(read('package.json')) as { dependencies: Record<string, string> }).dependencies);
  const banned =
    /firebase|sentry|analytics|amplitude|mixpanel|segment|bugsnag|crashlytics|datadog|posthog|appcenter|onesignal|appsflyer|adjust|admob|expo-ads|expo-updates|expo-web-browser|webview|axios|apollo|graphql|socket\.io|expo-tracking|expo-contacts|expo-location|expo-camera|expo-sms/i;

  it('aucun paquet interdit', () => {
    expect(deps.filter((d) => banned.test(d))).toEqual([]);
  });
});

describe('Android : rien ne sort, rien n’est sauvegardé dans le cloud', () => {
  const { expo } = JSON.parse(read('app.json')) as {
    expo: { android: Record<string, unknown>; ios?: Record<string, unknown>; updates?: unknown; plugins: unknown[] };
  };

  it('la sauvegarde automatique (Google) est désactivée', () => {
    expect(expo.android.allowBackup).toBe(false);
  });

  it('la permission Internet est retirée du manifeste', () => {
    expect(expo.android.blockedPermissions).toContain('android.permission.INTERNET');
    expect(expo.android.permissions as string[]).not.toContain('INTERNET');
    expect(expo.android.permissions as string[]).not.toContain('android.permission.INTERNET');
  });

  it('aucune mise à jour à distance ni service Google configuré', () => {
    expect(expo.updates).toBeUndefined();
    expect(expo.android.googleServicesFile).toBeUndefined();
    expect(expo.ios?.googleServicesFile).toBeUndefined();
  });
});

describe('PWA : la page ne peut ouvrir aucune connexion', () => {
  const html = read('public/index.html');
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1] ?? '';
  const directives = new Map(
    csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((d) => d[0])
      .map(([name, ...sources]) => [name!, sources] as const),
  );

  it('a une politique de sécurité', () => {
    expect(csp).not.toBe('');
  });

  it("connect-src 'none' : ni fetch, ni XHR, ni WebSocket", () => {
    expect(directives.get('connect-src')).toEqual(["'none'"]);
  });

  it('le reste n’autorise que le site lui-même (aucun hôte externe, aucun joker)', () => {
    const allowed = new Set(["'self'", "'none'", "'unsafe-inline'", 'data:', 'blob:']);
    for (const [name, sources] of directives) {
      for (const source of sources) expect(allowed, `${name} ${source}`).toContain(source);
    }
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'none'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
  });

  it('ne charge aucun script, style ou image externe', () => {
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//i);
  });

  it('le service worker ne touche que les requêtes de même origine et ne contient aucune adresse externe', () => {
    const sw = read('public/sw.js');
    expect(sw).toContain('new URL(req.url).origin !== self.location.origin');
    for (const file of readdirSync(join(root, 'public')).filter((f) => f.endsWith('.js'))) {
      expect(read(`public/${file}`), file).not.toMatch(/https?:\/\//);
    }
  });
});
