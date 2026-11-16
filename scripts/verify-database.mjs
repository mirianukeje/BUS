// Explicitly run against an approved test project only. Creates/deletes fixtures.
// Uses Node's built-in fetch; no application or authentication changes required.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const tokens = [process.env.BUS_TEST_TOKEN_A, process.env.BUS_TEST_TOKEN_B];
assert(url && key && tokens.every(Boolean), 'Set project URL/key and BUS_TEST_TOKEN_A/B.');
assert(tokens[0] !== tokens[1], 'Use two different signed-in users.');
assert(process.argv.includes('--run'), 'Add --run only after approving remote test writes.');

async function request(path, token, method = 'GET', body) {
  const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${url}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = null; }
  // Do not print response bodies: they can contain private data.
  return { status: response.status, ok: response.ok, data };
}
function rows(result, label) {
  assert(result.ok && Array.isArray(result.data), `${label}: HTTP ${result.status}, code ${result.data?.code ?? 'unknown'}`);
  return result.data;
}
function denied(result, label) {
  assert([401, 403].includes(result.status) && result.data?.code === '42501',
    `${label}: expected database permission/RLS rejection; HTTP ${result.status}, code ${result.data?.code ?? 'unknown'}`);
}
function timestamp(result, label) {
  assert.equal(typeof result, 'string', `${label}: missing timestamp`);
  const milliseconds = Date.parse(result);
  assert(Number.isFinite(milliseconds), `${label}: invalid timestamp`);
  return milliseconds;
}
function timestampDenied(result, label) {
  assert.equal(result.status, 400, `${label}: expected HTTP 400`);
  assert.equal(result.data?.code, '23514', `${label}: expected trigger rejection`);
  assert.equal(result.data?.message, 'created_at cannot be changed after insertion',
    `${label}: rejected for an unexpected reason`);
}

const users = [];
for (const token of tokens) {
  const result = await request('/auth/v1/user', token);
  assert(result.ok && result.data?.id, 'Invalid or expired user session.');
  assert(!result.data.is_anonymous, 'Use ordinary test accounts, not anonymous Auth sessions.');
  users.push(result.data.id);
}
assert(users[0] !== users[1], 'Tokens must identify different users.');

// Dedicated accounts must have no profile so tests never overwrite real profiles.
for (let i = 0; i < 2; i++) {
  const existing = rows(await request(`/rest/v1/profiles?id=eq.${users[i]}&select=id`, tokens[i]), 'Profile preflight');
  assert.equal(existing.length, 0, 'Use dedicated test accounts with no profile rows. No fixtures written.');
}

const definitions = [
  { table: 'profiles', owner: 'id', field: 'display_name', body: { display_name: 'BUS synthetic test' } },
  { table: 'check_ins', owner: 'user_id', field: 'note', body: { emotion: 'hopeful', note: 'BUS synthetic test' } },
  { table: 'journal_entries', owner: 'user_id', field: 'title', body: { title: 'BUS synthetic test', content: 'Synthetic reflection' } },
];
const cleanup = [];
let failed = false;
try {
  for (const def of definitions) {
    const endpoint = `/rest/v1/${def.table}`;
    const ids = def.table === 'profiles' ? [...users] : [randomUUID(), randomUUID()];
    const bodies = users.map((user, i) => ({ ...def.body, id: ids[i], [def.owner]: user }));
    const initial = [];
    // Register only exact fixture IDs belonging to these dedicated accounts.
    for (let i = 0; i < 2; i++) cleanup.push({ endpoint, id: ids[i], token: tokens[i] });
    for (let i = 0; i < 2; i++) {
      // Check forged inserts before a conflicting profile PK exists.
      denied(await request(endpoint, tokens[1 - i], 'POST', bodies[i]), `${def.table}: forged insert`);
      const created = rows(await request(endpoint, tokens[i], 'POST', bodies[i]), `${def.table}: own insert`);
      assert.equal(created.length, 1);
      assert.equal(created[0][def.owner], users[i]);
      timestamp(created[0].created_at, `${def.table}: created_at default`);
      if (def.table === 'journal_entries') timestamp(created[0].updated_at, 'Journal updated_at default');
      initial.push(created[0]);
    }
    for (let i = 0; i < 2; i++) {
      const other = 1 - i;
      const ownPath = `${endpoint}?id=eq.${ids[i]}`;
      const otherPath = `${endpoint}?id=eq.${ids[other]}`;
      const all = rows(await request(`${endpoint}?select=*`, tokens[i]), `${def.table}: list`);
      assert(all.every(row => row[def.owner] === users[i]), `${def.table}: leaked rows`);
      assert(all.some(row => row.id === ids[i]), `${def.table}: own row missing`);
      assert.equal(rows(await request(otherPath, tokens[i]), 'Foreign read').length, 0);
      // Each API request has its own transaction. Pause long enough to compare
      // timestamps at JavaScript millisecond precision without rounding equality.
      if (def.table === 'journal_entries') await delay(25);
      const updated = rows(await request(ownPath, tokens[i], 'PATCH', {
        [def.field]: 'Updated synthetic test', created_at: initial[i].created_at,
      }), 'Own update');
      assert.equal(updated.length, 1);
      assert.equal(updated[0][def.field], 'Updated synthetic test');
      assert.equal(updated[0].created_at, initial[i].created_at, 'Normal update changed created_at');
      if (def.table === 'journal_entries') {
        assert(timestamp(updated[0].updated_at, 'Updated journal timestamp') >
          timestamp(initial[i].updated_at, 'Initial journal timestamp'),
        'Journal updated_at did not advance across separate requests');
      }
      const changedTime = new Date(timestamp(initial[i].created_at, 'Initial created_at') + 86400000).toISOString();
      for (const forbiddenTime of [changedTime, null]) {
        timestampDenied(await request(ownPath, tokens[i], 'PATCH', { created_at: forbiddenTime }),
          `${def.table}: created_at protection`);
      }
      const protectedRows = rows(await request(ownPath, tokens[i]), 'Verify rejected timestamp updates');
      assert.equal(protectedRows.length, 1);
      assert.equal(protectedRows[0].created_at, initial[i].created_at);
      if (def.table === 'journal_entries') {
        assert.equal(protectedRows[0].updated_at, updated[0].updated_at,
          'Rejected timestamp update changed updated_at');
      }
      assert.equal(rows(await request(otherPath, tokens[i], 'PATCH', { [def.field]: 'Forbidden change' }), 'Foreign update').length, 0);
      denied(await request(ownPath, tokens[i], 'PATCH', { [def.owner]: users[other] }), 'Ownership transfer');
      assert.equal(rows(await request(otherPath, tokens[i], 'DELETE'), 'Foreign delete').length, 0);
      const unchanged = rows(await request(otherPath, tokens[other]), 'Owner verifies foreign attempts');
      assert.equal(unchanged.length, 1);
      assert.equal(unchanged[0][def.owner], users[other]);
      assert.notEqual(unchanged[0][def.field], 'Forbidden change');
    }
    // Missing JWT: require actual database permission errors, not a bad API key.
    for (const [method, path, body] of [
      ['GET', endpoint, undefined], ['POST', endpoint, bodies[0]],
      ['PATCH', `${endpoint}?id=eq.${ids[0]}`, { [def.field]: 'Anonymous change' }],
      ['DELETE', `${endpoint}?id=eq.${ids[0]}`, undefined],
    ]) denied(await request(path, null, method, body), `${def.table}: logged-out ${method}`);
    for (let i = 0; i < 2; i++) {
      const path = `${endpoint}?id=eq.${ids[i]}`;
      const owned = rows(await request(path, tokens[i]), 'Verify anonymous attempts');
      assert.equal(owned.length, 1);
      assert.equal(owned[0][def.field], 'Updated synthetic test');
      assert.equal(rows(await request(path, tokens[i], 'DELETE'), 'Own delete').length, 1);
      assert.equal(rows(await request(path, tokens[i]), 'Verify own deletion').length, 0);
    }
    console.log(`PASS ${def.table}: own CRUD, cross-user isolation, ownership transfer, anonymous denial, timestamp protection`);
    if (def.table === 'journal_entries') console.log('PASS journal_entries: updated_at advances across transactions');
  }
} catch (error) {
  failed = true;
  console.error(`FAIL: ${error.message}`);
} finally {
  // Cleanup also runs on assertion failures; never deletes unrelated IDs.
  for (const fixture of cleanup) {
    try {
      const result = await request(`${fixture.endpoint}?id=eq.${fixture.id}`, fixture.token, 'DELETE');
      if (!result.ok) throw new Error('Cleanup denied');
    } catch {
      failed = true;
      console.error(`Cleanup incomplete for ${fixture.endpoint}, fixture ${fixture.id}. Inspect dedicated test-account data.`);
    }
  }
}
process.exitCode = failed ? 1 : 0;
if (!failed) console.log('PASS: all API ownership tests completed; fixtures removed.');
