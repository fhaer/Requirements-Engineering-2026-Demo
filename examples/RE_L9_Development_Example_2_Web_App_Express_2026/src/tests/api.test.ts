import { test } from "node:test";
import assert from "node:assert/strict";
import { type AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../app";
import { AccountExpenses } from "../model/AccountExpenses";
import { JsonExpenseStore } from "../persistence/JsonExpenseStore";

test("HTTP API creates, modifies, rejects invalid input and deletes expenses", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "api-expenses-"));
  const store = new JsonExpenseStore(path.join(directory, "saved.json"));
  const server = createApp(new AccountExpenses(), store).listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (url: string, method = "GET", body?: unknown) => fetch(base + url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  try {
    let response = await request("/api/expenses", "POST", {
      kind: "business", name: "Train", amount: 20, category: "Travel", tripId: 42, tip: 2,
    });
    assert.equal(response.status, 201);
    const created = await response.json() as { id: number; amount: number };
    assert.equal(created.amount, 22);

    response = await request(`/api/expenses/${created.id}/tip`, "PATCH", { tip: 3 });
    assert.equal((await response.json() as { amount: number }).amount, 25);

    response = await request("/api/expenses");
    const data = await response.json() as { summary: { total: number; tips: number } };
    assert.deepEqual(data.summary, { count: 1, total: 25, tips: 5 });

    response = await request("/api/expenses", "POST", {
      kind: "consumer", name: "Invalid", category: "Food", amount: "5",
    });
    assert.equal(response.status, 400);
    response = await request(`/api/expenses/${created.id}`, "DELETE");
    assert.equal(response.status, 204);
    assert.equal((await store.load())?.getAll().length, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
