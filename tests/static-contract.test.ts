import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('static deployment contract', () => {
  it('lists every claim once with one matching tagged browser test', () => {
    const claims = JSON.parse(read('.factory/claims.json')) as Array<{ id: string; test: string }>;
    const source = read('tests/e2e/claims.spec.ts');
    expect(new Set(claims.map((claim) => claim.id)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(claim.test).toContain(`@claim:${claim.id}`);
      expect(source.split(`@claim:${claim.id}`).length - 1).toBe(1);
    }
  });

  it('ships restrictive response headers, a real 404 override, and immutable asset caching', () => {
    const config = JSON.parse(read('public/staticwebapp.config.json'));
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('microphone=(self)');
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
    expect(config.routes.find((route: { route: string }) => route.route === '/assets/*').headers['Cache-Control']).toContain('immutable');
  });

  it('ships canonical and social metadata plus an accessible 404 page', () => {
    for (const path of ['index.html', 'public/privacy/index.html', 'public/terms/index.html']) {
      const html = read(path);
      expect(html).toMatch(/rel="canonical"/);
      expect(html).toMatch(/property="og:image"/);
      expect(html).toMatch(/name="twitter:card"/);
    }
    const notFound = read('public/404.html');
    expect(notFound).toMatch(/<main id="main"[^>]*>/);
    expect(notFound.match(/<h1/g)).toHaveLength(1);
    expect(notFound).toContain('Return to the playground');
    expect(read('index.html')).not.toMatch(/rel="preload"[^>]+field-station-960\.webp/);
  });
});
