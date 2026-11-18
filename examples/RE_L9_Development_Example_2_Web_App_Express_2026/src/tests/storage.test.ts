import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { seedAccount } from "../seed";
import { JsonExpenseStore } from "../persistence/JsonExpenseStore";
import { BusinessExpense } from "../model/BusinessExpense";

test("expense data survives loading, including class identity", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "expenses-"));
  const filename = path.join(directory, "expenses.json");
  const store = new JsonExpenseStore(filename);
  try {
    assert.equal(await store.load(), null);
    const account = seedAccount();
    await store.save(account);
    const restored = await store.load();
    assert.equal(restored?.total, account.total);
    assert.ok(restored?.find(2) instanceof BusinessExpense);
    assert.equal(JSON.parse(await readFile(filename, "utf8")).length, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("overlapping saves are serialised and latest state wins", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "expenses-"));
  const store = new JsonExpenseStore(path.join(directory, "expenses.json"));
  try {
    const account = seedAccount();
    const first = store.save(account);
    account.remove(1);
    const second = store.save(account);
    await Promise.all([first, second]);
    assert.equal((await store.load())?.getAll().length, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
