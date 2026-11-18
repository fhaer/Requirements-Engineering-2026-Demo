import { BusinessExpense } from "./BusinessExpense";
import { ConsumerExpense } from "./ConsumerExpense";
import type { IExpense } from "./IExpense";

/** The wire/storage representation—data only, no class methods. */
export type ExpenseRecord = {
  id: number;
  name: string;
  category: string;
  amount: number;
  tip: number;
} & (
  | { kind: "business"; tripId: number }
  | { kind: "consumer" }
);

export function toRecord(expense: IExpense): ExpenseRecord {
  const common = {
    id: expense.id,
    name: expense.name,
    category: expense.category,
    amount: expense.amount,
    tip: expense.tip,
  };
  // instanceof is a runtime distinction. IExpense itself cannot be tested
  // with instanceof, because an interface does not exist in JavaScript.
  return expense instanceof BusinessExpense
    ? { ...common, kind: "business", tripId: expense.tripId }
    : { ...common, kind: "consumer" };
}

export function fromRecord(record: ExpenseRecord): IExpense {
  // JSON.parse reconstructs plain objects, not instances of our classes.
  // Rehydrating explicitly restores inheritance, methods and invariants.
  const baseAmount = Math.round((record.amount - record.tip) * 100) / 100;
  const expense = record.kind === "business"
    ? new BusinessExpense(record.id, record.name, baseAmount, record.category, record.tripId)
    : new ConsumerExpense(record.id, record.name, baseAmount, record.category);
  if (record.tip > 0) expense.addTip(record.tip);
  return expense;
}
