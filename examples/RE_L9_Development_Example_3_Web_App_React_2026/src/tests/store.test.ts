import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ExpenseStore } from "../store";
import type { ExpenseDraft } from "../contracts";

const coffee: ExpenseDraft = {
  kind: "consumer", name: "Coffee", amount: 8, tip: 2, category: "Food", date: "2026-11-11",
};

test("interface, inheritance, aggregation and tips", () => {
  const store = new ExpenseStore();
  const item = store.create(coffee);
  assert.equal(item.amount, 10);
  assert.equal(item.tip, 2);
  store.addTip(item.id, 1.5);
  assert.deepEqual(store.list().summary, { count: 1, total: 11.5, tips: 3.5, businessTotal: 0 });
  const edited = store.update(item.id, { ...coffee, amount: 20, tip: 3 });
  assert.equal(edited?.amount, 23);
  assert.equal(store.remove(item.id), true);
  assert.equal(store.list().summary.count, 0);
});

test("saved expenses survive a restart; deleting every row stays deleted", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ledger-test-"));
  const file = path.join(dir, "expenses.json");
  try {
    const first = new ExpenseStore(file, [coffee]);
    first.create({ kind: "business", name: "Train", amount: 60, tip: 0, category: "Travel", date: "2026-11-10", tripId: 12 });
    assert.equal(new ExpenseStore(file, [coffee]).list().summary.businessTotal, 60);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).length, 2);
    for (const row of first.list().expenses) first.remove(row.id);
    assert.equal(new ExpenseStore(file, [coffee]).list().expenses.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
