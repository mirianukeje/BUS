// Local production-code tests: Supabase, cookies and Next cache are mocked.
// Does not load .env.local, start a server, or make network/database requests.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { AuthSessionMissingError } from "@supabase/supabase-js";

const nativeRequire = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const user = { id: "11111111-1111-4111-8111-111111111111" };
const otherUser = "22222222-2222-4222-8222-222222222222";
const saved = {
  id: "33333333-3333-4333-8333-333333333333",
  user_id: user.id,
  emotion: "Happy",
  note: null,
  created_at: "2026-11-22T12:00:00.000Z",
};

function harness(state = {}) {
  const calls = [];
  const cache = new Map();
  const builder = {
    insert(payload) { calls.push(["insert", payload]); return this; },
    select(columns) { calls.push(["select", columns]); return this; },
    eq(column, value) { calls.push(["eq", column, value]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    limit(count) { calls.push(["limit", count]); return this; },
    async single() {
      if (state.queryThrows) throw new Error("PRIVATE_DATABASE_DETAIL");
      const payload = calls.find(([name]) => name === "insert")?.[1];
      return {
        data: state.saved === undefined ? { ...saved, ...payload } : state.saved,
        error: state.queryError ?? null,
      };
    },
    async maybeSingle() {
      if (state.queryThrows) throw new Error("PRIVATE_DATABASE_DETAIL");
      return { data: state.latest ?? null, error: state.queryError ?? null };
    },
  };
  const mocks = {
    "server-only": {},
    "@/lib/supabase/config": { isSupabaseConfigured: () => state.configured !== false },
    "@/lib/supabase/server": {
      createClient: async () => {
        calls.push(["createClient"]);
        if (state.clientThrows) throw new Error("PRIVATE_DATABASE_DETAIL");
        return {
          auth: {
            getUser: async () => {
              calls.push(["getUser"]);
              if (state.authThrows) throw new Error("PRIVATE_DATABASE_DETAIL");
              return { data: { user: state.user === undefined ? user : state.user }, error: state.authError ?? null };
            },
          },
          from: (table) => { calls.push(["from", table]); return builder; },
        };
      },
    },
    "next/cache": { revalidatePath: (path) => calls.push(["revalidatePath", path]) },
  };
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const filename = fileURLToPath(new URL(path, root));
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.startsWith("@/lib/check-ins/")) return load(`${specifier.slice(2)}.ts`);
      return nativeRequire(specifier);
    };
    // Compile the actual TypeScript files; no duplicate implementation in tests.
    new Function("exports", "require", "module", output)(loadedModule.exports, require, loadedModule);
    return loadedModule.exports;
  }
  return {
    contracts: load("lib/check-ins/contracts.ts"),
    validation: load("lib/check-ins/validation.ts"),
    server: load("lib/check-ins/server.ts"),
    actions: load("app/check-in/actions.ts"),
    calls,
  };
}

test("all eight shared emotions validate and outer emotion whitespace is normalized", () => {
  const { contracts, validation } = harness();
  assert.deepEqual([...contracts.EMOTION_OPTIONS], ["Happy", "Calm", "Hopeful", "Sad", "Anxious", "Angry", "Overwhelmed", "Mixed"]);
  for (const emotion of contracts.EMOTION_OPTIONS) {
    assert.deepEqual(validation.validateCheckInInput({ emotion: ` ${emotion}\n` }), { ok: true, data: { emotion, note: null } });
  }
});

test("missing, wrong-type, whitespace-only and non-option emotions are rejected", () => {
  const { validation } = harness();
  for (const emotion of [undefined, null, 1, [], {}, "", " \t\n\r\f\v", "Joyful", "happy"]) {
    const result = validation.validateCheckInInput({ emotion });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert(result.error.fieldErrors.emotion);
  }
});

test("blank notes become NULL; meaningful note whitespace is preserved without a length cap", () => {
  const { validation } = harness();
  for (const note of [undefined, null, "", " \t\n\r\f\v ", "\u00a0"]) {
    assert.equal(validation.validateCheckInInput({ emotion: "Calm", note }).data.note, null);
  }
  for (const note of ["  First line\nSecond line\t  ", "x".repeat(10000)]) {
    assert.equal(validation.validateCheckInInput({ emotion: "Calm", note }).data.note, note);
  }
  for (const note of [42, false, {}, [], new Blob(["note"])]) {
    const result = validation.validateCheckInInput({ emotion: "Calm", note });
    assert.equal(result.ok, false);
    assert(result.error.fieldErrors.note);
  }
});

test("non-object payloads, FormData, and unexpected fields cannot reach the database", async () => {
  for (const input of [null, undefined, "Happy", [], new FormData(),
    { emotion: "Happy", user_id: otherUser }, { emotion: "Happy", id: saved.id },
    { emotion: "Happy", created_at: saved.created_at }, { emotion: "Happy", extra: true },
    { emotion: "Happy", [Symbol("hidden")]: true }]) {
    const { server, calls } = harness();
    const result = await server.createCheckIn(input);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "VALIDATION_ERROR");
    assert.deepEqual(calls, []);
  }
});

test("save derives ownership and omits generated ID/time; omitted or blank notes persist as NULL", async () => {
  for (const [owner, note] of [
    [user.id, undefined], [user.id, ""], [user.id, " \t\n "],
    [otherUser, undefined], [otherUser, ""], [otherUser, " \t\n "],
  ]) {
    const { server, calls } = harness({ user: { id: owner } });
    const result = await server.createCheckIn({ emotion: "Happy", note });
    assert.equal(result.ok, true);
    assert.deepEqual(calls.find(([name]) => name === "insert")[1], { user_id: owner, emotion: "Happy", note: null });
    assert.equal(result.checkIn.id, saved.id);
    assert.equal(result.checkIn.created_at, saved.created_at);
    assert(calls.some(([name, table]) => name === "from" && table === "check_ins"));
    assert(calls.some(([name]) => name === "getUser"));
  }
});

test("live check-in runner refuses execution without the explicit write opt-in", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-check-ins.mjs", import.meta.url))], {
    encoding: "utf8", timeout: 5000, env: {},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Remote test writes require approval and --run/);
});

test("live check-in runner refuses requests when required development settings are missing", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./verify-check-ins.mjs", import.meta.url)), "--run"], {
    encoding: "utf8", timeout: 5000, env: {},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set development URL\/key, BUS_TEST_PROJECT_REF and BUS_TEST_TOKEN_A\/B/);
});

test("signed-out users cannot save, including Supabase's missing-session error", async () => {
  for (const state of [{ user: null }, { user: null, authError: new AuthSessionMissingError() }]) {
    const { server, calls } = harness(state);
    const result = await server.createCheckIn({ emotion: "Happy" });
    assert.equal(result.error.code, "AUTH_REQUIRED");
    assert(!calls.some(([name]) => name === "from"));
  }
});

test("configuration and unexpected auth failures return sanitized errors without saving", async () => {
  for (const state of [{ configured: false }, { clientThrows: true }, { authThrows: true }, { authError: new Error("PRIVATE_DATABASE_DETAIL") }]) {
    const { server, calls } = harness(state);
    const result = await server.createCheckIn({ emotion: "Happy" });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, state.configured === false ? "CONFIGURATION_ERROR" : "SAVE_FAILED");
    assert(!JSON.stringify(result).includes("PRIVATE_DATABASE_DETAIL"));
    assert(!calls.some(([name]) => name === "insert"));
  }
});

test("database, network, empty-response and wrong-owner save failures do not leak private detail", async () => {
  for (const state of [{ queryError: { message: "PRIVATE_DATABASE_DETAIL" } }, { queryThrows: true }, { saved: null }, { saved: { ...saved, user_id: otherUser } }]) {
    const { server } = harness(state);
    const result = await server.createCheckIn({ emotion: "Happy" });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SAVE_FAILED");
    assert(!JSON.stringify(result).includes("PRIVATE_DATABASE_DETAIL"));
  }
});

test("latest reads only the verified user's newest record, with deterministic tie ordering", async () => {
  const { server, calls } = harness({ latest: saved });
  assert.deepEqual(await server.getLatestCheckIn(), saved);
  assert.deepEqual(calls.filter(([name]) => ["eq", "order", "limit"].includes(name)), [
    ["eq", "user_id", user.id],
    ["order", "created_at", { ascending: false }],
    ["order", "id", { ascending: false }],
    ["limit", 1],
  ]);
});

test("latest returns NULL only for empty history, not authentication or query failures", async () => {
  assert.equal(await harness().server.getLatestCheckIn(), null);
  for (const [state, code] of [
    [{ user: null }, "AUTH_REQUIRED"],
    [{ user: null, authError: new AuthSessionMissingError() }, "AUTH_REQUIRED"],
    [{ configured: false }, "CONFIGURATION_ERROR"],
    [{ queryError: { message: "PRIVATE_DATABASE_DETAIL" } }, "LOAD_FAILED"],
    [{ queryThrows: true }, "LOAD_FAILED"],
    [{ latest: { ...saved, user_id: otherUser } }, "LOAD_FAILED"],
  ]) {
    const { server } = harness(state);
    await assert.rejects(server.getLatestCheckIn(), error => {
      assert.equal(error.name, "CheckInReadError");
      assert.equal(error.code, code);
      assert(!error.message.includes("PRIVATE_DATABASE_DETAIL"));
      return true;
    });
  }
});

test("server action authenticates independently and refreshes /check-in only on success", async () => {
  const { actions, calls } = harness();
  assert.equal((await actions.saveCheckIn({ emotion: "Happy" })).ok, true);
  assert.equal(calls.filter(([name]) => name === "getUser").length, 1);
  assert.deepEqual(calls.filter(([name]) => name === "revalidatePath"), [["revalidatePath", "/check-in"]]);
  for (const state of [{ user: null }, { queryError: { message: "PRIVATE_DATABASE_DETAIL" } }]) {
    const h = harness(state);
    assert.equal((await h.actions.saveCheckIn({ emotion: "Happy" })).ok, false);
    assert(!h.calls.some(([name]) => name === "revalidatePath"));
  }
  const h = harness();
  assert.equal((await h.actions.saveCheckIn({ emotion: "Happy", user_id: otherUser })).error.code, "VALIDATION_ERROR");
  assert.deepEqual(h.calls, []);
});
