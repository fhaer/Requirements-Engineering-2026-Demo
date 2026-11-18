import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createApp } from "../api";
import { ExpenseStore } from "../store";

test("Express API: create, edit, tip, list, validation and deletion", async () => {
  const server = createApp(new ExpenseStore()).listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (url: string, method = "GET", body?: unknown) => fetch(base + url, {
    method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  try {
    let result = await call("/api/expenses", "POST", {
      kind: "business", name: "Train", amount: 42, tip: 3, category: "Travel", date: "2026-11-10", tripId: 2042,
    });
    assert.equal(result.status, 201);
    const created = await result.json() as { id: number; amount: number };
    assert.equal(created.amount, 45);
    result = await call(`/api/expenses/${created.id}/tip`, "PATCH", { tip: 5 });
    assert.equal((await result.json() as { amount: number }).amount, 50);
    result = await call(`/api/expenses/${created.id}`, "PUT", {
      kind: "consumer", name: "Lunch", amount: 10, tip: 0, category: "Food", date: "2026-11-11",
    });
    assert.equal((await result.json() as { kind: string }).kind, "consumer");
    result = await call("/api/expenses");
    assert.equal((await result.json() as { summary: { total: number } }).summary.total, 10);
    result = await call("/api/expenses", "POST", { kind: "consumer", name: "Bad", amount: "10", category: "Food" });
    assert.equal(result.status, 400);
    assert.equal((await call(`/api/expenses/${created.id}`, "DELETE")).status, 204);
    assert.equal((await call(`/api/expenses/${created.id}`, "DELETE")).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
