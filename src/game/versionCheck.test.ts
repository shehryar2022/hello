import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCacheBustedUrl,
  clearUpdateReloadGuardIfMatched,
  evaluateUpdateReloadGuard,
  fetchLatestVersion,
  isNewerVersionDeployed,
  parseVersionManifest,
  recordUpdateReloadAttempt,
  RELOAD_GUARD_KEY,
} from './versionCheck';

function createSessionStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem(k: string): string | null {
      return store.has(k) ? store.get(k)! : null;
    },
    setItem(k: string, v: string): void {
      store.set(k, v);
    },
    removeItem(k: string): void {
      store.delete(k);
    },
  };
}

test('parseVersionManifest & isNewerVersionDeployed detect version changes cleanly', () => {
  assert.equal(parseVersionManifest(null), null);
  assert.equal(parseVersionManifest({ version: '' }), null);
  assert.equal(parseVersionManifest({ version: 123 }), null);

  const manifest = parseVersionManifest({ version: '1764180000000-a1b2c3d4', builtAt: 1764180000000 });
  assert.deepEqual(manifest, { version: '1764180000000-a1b2c3d4', builtAt: 1764180000000 });

  assert.equal(isNewerVersionDeployed('1764180000000-a1b2c3d4', manifest), false);
  assert.equal(isNewerVersionDeployed('1764170000000-oldbuild', manifest), true);
  assert.equal(isNewerVersionDeployed('1764170000000-oldbuild', null), false);
});

test('fetchLatestVersion handles valid JSON, cache-busting query, HTML fallbacks, HTTP errors, and network failures gracefully', async () => {
  let requestedUrl = '';
  const okFetch: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ version: 'v2-test', builtAt: 123456 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const v2 = await fetchLatestVersion(okFetch, '/version.json', 2000);
  assert.match(requestedUrl, /^\/version\.json\?t=\d+$/);
  assert.deepEqual(v2, { version: 'v2-test', builtAt: 123456 });

  const htmlFallbackFetch: typeof fetch = async () =>
    new Response('<!doctype html><html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  assert.equal(await fetchLatestVersion(htmlFallbackFetch), null);

  const notFoundFetch: typeof fetch = async () => new Response('Not Found', { status: 404 });
  assert.equal(await fetchLatestVersion(notFoundFetch), null);

  const offlineFetch: typeof fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  assert.equal(await fetchLatestVersion(offlineFetch), null);
});

test('update reload-loop protection blocks infinite refresh loops and clears once new version loads', () => {
  const storage = createSessionStorageMock();
  const t0 = 1_750_000_000_000;

  // First & second reload attempts from v1 -> v2 are allowed
  assert.equal(evaluateUpdateReloadGuard('v1', 'v2', t0, storage).allowAutoReload, true);
  recordUpdateReloadAttempt('v1', 'v2', t0, storage);

  assert.equal(evaluateUpdateReloadGuard('v1', 'v2', t0 + 1000, storage).allowAutoReload, true);
  recordUpdateReloadAttempt('v1', 'v2', t0 + 1000, storage);

  // Third consecutive reload while still running v1 for target v2 triggers loop detection
  const blocked = evaluateUpdateReloadGuard('v1', 'v2', t0 + 2000, storage);
  assert.equal(blocked.allowAutoReload, false);
  assert.equal(blocked.loopDetected, true);
  assert.equal(blocked.attempts, 2);

  // Once the browser actually loads v2, guard record clears cleanly
  clearUpdateReloadGuardIfMatched('v2', storage);
  assert.equal(storage.getItem(RELOAD_GUARD_KEY), null);
});

test('buildCacheBustedUrl preserves existing query params and injects _v', () => {
  const updated = buildCacheBustedUrl('https://example.com/?autostart=1', 'build-999');
  const parsed = new URL(updated);
  assert.equal(parsed.searchParams.get('autostart'), '1');
  assert.equal(parsed.searchParams.get('_v'), 'build-999');
});
