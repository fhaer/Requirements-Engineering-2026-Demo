import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNewExpense, parseTip, ValidationError } from "../http/validation";

test("HTTP payload validation narrows unknown to a discriminated union", () => {
  const value: unknown = {
    kind: "business", name: "Client meeting", category: "Travel",
    amount: 25.50, tip: 2, tripId: 2042,
  };
  const expense = parseNewExpense(value);
  assert.equal(expense.kind, "business");
  if (expense.kind === "business") assert.equal(expense.tripId, 2042);
});

test("a TypeScript annotation cannot validate incorrect JSON", () => {
  assert.throws(() => parseNewExpense({
    kind: "consumer", name: "Ticket", category: "Travel", amount: "25.50",
  }), ValidationError);
  assert.throws(() => parseTip({ tip: -1 }), ValidationError);
});
