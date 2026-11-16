// Local runner regression tests only: every fetch is mocked; no database access.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

function mockApi() {
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const tables = { profiles: new Map(), check_ins: new Map(), journal_entries: new Map() };
  let clock = Date.parse('2026-11-16T12:00:00Z');
  const reply = (data, status = 200) => Response.json(data, { status });
  const forbidden = token => reply({ code: '42501' }, token ? 403 : 401);

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin !== 'https://bus-test.invalid') throw new Error('Unexpected test destination');
    const token = options.headers?.Authorization?.replace('Bearer ', '');
    const user = token === 'test-a' ? ids[0] : token === 'test-b' ? ids[1] : null;
    if (url.pathname === '/auth/v1/user') return reply({ id: user, is_anonymous: false });
    const table = url.pathname.split('/').pop();
    const records = tables[table];
    if (!records) throw new Error('Unexpected test table');
    if (!user) return forbidden(token);
    const owner = table === 'profiles' ? 'id' : 'user_id';
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    const now = new Date(clock += 1000).toISOString();
    if (method === 'POST') {
      if (body[owner] !== user) return forbidden(token);
      if (records.has(body.id)) return reply({ code: '23505' }, 409);
      const row = { ...body, created_at: now };
      if (table === 'journal_entries') row.updated_at = now;
      records.set(row.id, row);
      return reply([row], 201);
    }
    const id = url.searchParams.get('id')?.replace(/^eq\./, '');
    const visible = [...records.values()].filter(row => row[owner] === user && (!id || row.id === id));
    if (method === 'GET') return reply(visible);
    if (method === 'DELETE') {
      for (const row of visible) records.delete(row.id);
      return reply(visible);
    }
    if (method !== 'PATCH') throw new Error('Unexpected test method');
    for (const row of visible) {
      if (owner in body && body[owner] !== user) return forbidden(token);
      if ('created_at' in body && body.created_at !== row.created_at && process.env.BUS_MOCK_CASE !== 'mutable-created-at') {
        return reply({ code: '23514', message: 'created_at cannot be changed after insertion' }, 400);
      }
    }
    for (const row of visible) {
      Object.assign(row, body);
      if (table === 'journal_entries' && process.env.BUS_MOCK_CASE !== 'stale-updated-at') row.updated_at = now;
    }
    return reply(visible);
  };
}

function run(scenario) {
  const preload = `data:text/javascript,${encodeURIComponent(`(${mockApi.toString()})();`)}`;
  return spawnSync(process.execPath, [
    '--import', preload, fileURLToPath(new URL('./verify-database.mjs', import.meta.url)), '--run',
  ], {
    encoding: 'utf8', timeout: 10000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: 'https://bus-test.invalid',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'mock-key',
      BUS_TEST_TOKEN_A: 'test-a', BUS_TEST_TOKEN_B: 'test-b', BUS_MOCK_CASE: scenario,
    },
  });
}

test('runner accepts owned CRUD, isolation, immutable creation time and journal advancement', () => {
  const result = run('valid');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS journal_entries: updated_at advances across transactions/);
  assert.match(result.stdout, /fixtures removed/);
});

test('runner fails when created_at changes are incorrectly allowed', () => {
  const result = run('mutable-created-at');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /created_at protection: expected HTTP 400/);
  assert.doesNotMatch(result.stdout, /all API ownership tests completed/);
});

test('runner fails when journal updated_at does not advance', () => {
  const result = run('stale-updated-at');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /updated_at did not advance/);
  assert.doesNotMatch(result.stdout, /all API ownership tests completed/);
});
