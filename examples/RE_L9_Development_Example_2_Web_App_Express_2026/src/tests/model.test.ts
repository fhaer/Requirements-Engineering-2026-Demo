import { test } from "node:test";
import assert from "node:assert/strict";
import { AccountExpenses } from "../model/AccountExpenses";
import { BusinessExpense } from "../model/BusinessExpense";
import { ConsumerExpense } from "../model/ConsumerExpense";
import type { IExpense } from "../model/IExpense";
import { fromRecord, toRecord } from "../model/expenseRecord";

test("subtyping, tips and aggregation", () => {
  const account = new AccountExpenses();
  const business: IExpense = new BusinessExpense(1, "Lunch", 40, "Food", 2042);
  business.addTip(5);
  business.addTip(2);
  account.addExpense(business);
  account.addExpense(new ConsumerExpense(2, "Bus", 4, "Travel"));
  assert.equal(business.amount, 47);
  assert.equal(account.totalTips, 7);
  assert.equal(account.total, 51);
  assert.equal(account.remove(2), true);
  assert.equal(account.total, 47);
});

test("serialisation round-trip retains concrete class behaviour", () => {
  const expense = new BusinessExpense(7, "Taxi", 28.4, "Travel", 1001);
  expense.addTip(2.5);
  const copy = fromRecord(JSON.parse(JSON.stringify(toRecord(expense))));
  assert.ok(copy instanceof BusinessExpense);
  copy.addTip(1);
  assert.equal(copy.amount, 31.9);
  assert.equal(copy.tip, 3.5);
});

test("invalid tips are rejected", () => {
  const expense = new ConsumerExpense(1, "Coffee", 3, "Food");
  assert.throws(() => expense.addTip(-2), RangeError);
});
