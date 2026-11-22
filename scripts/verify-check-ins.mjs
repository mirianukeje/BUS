// OPT-IN development API test. Do not run with --run without approval for writes.
// Node 24+: imports only the client-safe contract; never touches profiles/journals.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EMOTION_OPTIONS } from "../lib/check-ins/contracts.ts";

assert(process.argv.includes("--run"), "Remote test writes require approval and --run.");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const expectedRef = process.env.BUS_TEST_PROJECT_REF;
const tokens = [process.env.BUS_TEST_TOKEN_A, process.env.BUS_TEST_TOKEN_B];
assert(base && key && expectedRef && tokens.every(Boolean), "Set development URL/key, BUS_TEST_PROJECT_REF and BUS_TEST_TOKEN_A/B.");
const target = new URL(base);
assert(target.protocol === "https:" && target.hostname === `${expectedRef}.supabase.co`, "Target does not match the approved development project reference.");
assert(key.startsWith("sb_publishable_"), "Use the development publishable key, never a secret/service-role key.");

async function request(path, token, method = "GET", body) {
  const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=representation" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}
function rows(result, label) {
  assert(result.ok && Array.isArray(result.data), `${label}: HTTP ${result.status}, code ${result.data?.code ?? "unknown"}`);
  return result.data;
}
function denied(result, label) {
  assert([401, 403].includes(result.status) && result.data?.code === "42501", `${label}: expected database access denial`);
}

const users = [];
for (const token of tokens) {
  const result = await request("/auth/v1/user", token);
  assert(result.ok && result.data?.id && !result.data.is_anonymous, "Use valid sessions for two ordinary test accounts.");
  users.push(result.data.id);
}
assert(users[0] !== users[1], "Two different users are required.");

const endpoint = "/rest/v1/check_ins";
const runId = randomUUID();
const fixtures = [];
function fixture(owner) {
  const entry = { note: `BUS Sprint 2 fixture ${runId}-${fixtures.length}`, owner, id: null };
  fixtures.push(entry); // Register before POST, including uncertain network outcomes.
  return entry;
}
function pathFor(entry) {
  return entry.id
    ? `${endpoint}?id=eq.${entry.id}`
    : `${endpoint}?note=eq.${encodeURIComponent(entry.note)}`;
}

let failed = false;
try {
  for (let i = 0; i < 2; i++) {
    const entry = fixture(users[i]);
    // No client-supplied id or timestamp: test the existing database defaults.
    const result = await request(endpoint, tokens[i], "POST", {
      user_id: users[i], emotion: EMOTION_OPTIONS[i], note: entry.note,
    });
    const created = rows(result, "Save own check-in");
    assert.equal(result.status, 201);
    assert.equal(created.length, 1);
    assert(typeof created[0].id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(created[0].id), "Database ID missing or invalid");
    entry.id = created[0].id;
    assert(created[0].user_id === users[i], "Saved fixture has incorrect ownership");
    assert(Number.isFinite(Date.parse(created[0].created_at)), "Database creation time missing");
    const own = rows(await request(pathFor(entry), tokens[i]), "Read own check-in");
    assert.equal(own.length, 1);
    assert(own[0].id === entry.id, "Read returned an unexpected fixture");
    assert.equal(rows(await request(pathFor(entry), tokens[1 - i]), "Read foreign check-in").length, 0);
    const forged = fixture(users[1 - i]);
    denied(await request(endpoint, tokens[i], "POST", {
      user_id: forged.owner, emotion: "Happy", note: forged.note,
    }), "Forged ownership insert");
    const updated = rows(await request(pathFor(entry), tokens[i], "PATCH", { note: null }), "Store NULL note");
    assert.equal(updated.length, 1);
    assert.equal(updated[0].note, null);
    assert(updated[0].created_at === created[0].created_at, "Note update changed creation time");
    const changed = await request(pathFor(entry), tokens[i], "PATCH", { created_at: "2000-01-01T00:00:00Z" });
    assert.equal(changed.status, 400);
    assert.equal(changed.data?.code, "23514");
    assert(rows(await request(pathFor(entry), tokens[i]), "Verify timestamp protection")[0].created_at === created[0].created_at, "Rejected update changed creation time");
  }

  for (const emotion of [null, "", " \t\n\r\f\v "]) {
    const entry = fixture(users[0]);
    const result = await request(endpoint, tokens[0], "POST", { user_id: users[0], emotion, note: entry.note });
    assert.equal(result.status, 400);
    assert.equal(result.data?.code, emotion === null ? "23502" : "23514");
  }
  denied(await request(pathFor(fixtures[0]), null), "Anonymous read");
  const anonymous = fixture(users[0]);
  denied(await request(endpoint, null, "POST", { user_id: users[0], emotion: "Happy", note: anonymous.note }), "Anonymous insert");
  console.log("PASS: check-in defaults, owned save/read, cross-user restrictions, forged ownership, anonymous denial, required text, NULL notes, creation-time protection");
} catch (error) {
  failed = true;
  // Assertions use fixed labels/statuses, never response bodies, tokens or notes.
  console.error(`FAIL: ${error.message}`);
} finally {
  for (let index = 0; index < fixtures.length; index++) {
    for (const token of tokens) {
      try {
        const path = pathFor(fixtures[index]);
        rows(await request(path, token, "DELETE"), "Remove synthetic fixture");
        assert.equal(rows(await request(`${path}&select=id`, token), "Verify cleanup").length, 0);
      } catch {
        failed = true;
        console.error(`Cleanup incomplete for synthetic fixture ${index + 1}; inspect only this development test run's records.`);
      }
    }
  }
}
process.exitCode = failed ? 1 : 0;
if (!failed) console.log("PASS: check-in test fixtures removed; profiles and journals untouched.");
