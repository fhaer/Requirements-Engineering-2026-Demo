import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AccountExpenses } from "./model/AccountExpenses";
import { BusinessExpense } from "./model/BusinessExpense";
import { ConsumerExpense } from "./model/ConsumerExpense";
import type { IExpense } from "./model/IExpense";
import type { ExpenseDTO, ExpenseDraft, ExpenseListResponse } from "./contracts";

/**
 * Translate validated input data into a domain object. Keeping this operation
 * in one place ensures that creation and reloading use the same class hierarchy
 * and, importantly, the same addTip() implementation.
 */
function makeExpense(id: number, draft: ExpenseDraft): IExpense {
  const expense = draft.kind === "business"
    ? new BusinessExpense(id, draft.name, draft.amount, draft.category, draft.tripId!, draft.date)
    : new ConsumerExpense(id, draft.name, draft.amount, draft.category, draft.date);

  if (draft.tip > 0) expense.addTip(draft.tip);
  return expense;
}

/** JSON cannot preserve the prototype or methods of a class instance. */
function toDTO(expense: IExpense): ExpenseDTO {
  return {
    id: expense.id,
    kind: expense instanceof BusinessExpense ? "business" : "consumer",
    name: expense.name,
    category: expense.category as ExpenseDTO["category"],
    date: expense.date,
    amount: expense.amount,
    tip: expense.tip,
    ...(expense instanceof BusinessExpense ? { tripId: expense.tripId } : {}),
  };
}

/**
 * An intentionally small persistence boundary.
 *
 * The domain model lives in memory; after each mutation we write a JSON
 * snapshot. This is adequate for a single-user exercise and keeps persistence
 * independent of Express and React. Synchronous file access is deliberate here:
 * it simplifies the example but would be inappropriate for a busy server.
 */
export class ExpenseStore {
  private readonly account = new AccountExpenses();
  private nextId = 1;

  constructor(private readonly filePath?: string, seed: ExpenseDraft[] = []) {
    if (filePath && existsSync(filePath)) {
      // The file was written by this application on an earlier run.
      // Unlike untrusted HTTP input, it is treated as a local snapshot.
      const saved = JSON.parse(readFileSync(filePath, "utf8")) as ExpenseDTO[];
      if (!Array.isArray(saved)) throw new Error("Expense data file must be an array.");

      for (const row of saved) {
        const draft: ExpenseDraft = {
          kind: row.kind,
          name: row.name,
          category: row.category,
          date: row.date,
          amount: Math.round((row.amount - row.tip) * 100) / 100,
          tip: row.tip,
          ...(row.tripId === undefined ? {} : { tripId: row.tripId }),
        };
        this.account.addExpense(makeExpense(row.id, draft));
        this.nextId = Math.max(this.nextId, row.id + 1);
      }
    } else {
      // Initialise the workspace once. Subsequent runs load persisted data.
      for (const draft of seed) {
        this.account.addExpense(makeExpense(this.nextId++, draft));
      }
      this.save(); // Also persist an empty account, so deleted rows stay deleted.
    }
  }

  private save(): void {
    if (!this.filePath) return; // An in-memory store is convenient for tests.

    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryFile = `${this.filePath}.tmp`;
    const json = JSON.stringify(this.list().expenses, null, 2) + "\n";
    writeFileSync(temporaryFile, json, "utf8");
    renameSync(temporaryFile, this.filePath);
    // Renaming a complete snapshot reduces the risk of a partially written file.
    // It does not provide database transactions or concurrent-writer safety.
  }

  list(): ExpenseListResponse {
    const expenses = this.account.getAll();
    return {
      expenses: expenses.map(toDTO).sort(
        (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
      ),
      summary: {
        count: expenses.length,
        total: this.account.total,
        tips: this.account.totalTips,
        businessTotal: this.account.businessTotal,
      },
    };
  }

  create(draft: ExpenseDraft): ExpenseDTO {
    const expense = makeExpense(this.nextId++, draft);
    this.account.addExpense(expense);
    this.save();
    return toDTO(expense);
  }

  update(id: number, draft: ExpenseDraft): ExpenseDTO | undefined {
    if (!this.account.find(id)) return undefined;
    const replacement = makeExpense(id, draft);
    this.account.replace(replacement);
    this.save();
    return toDTO(replacement);
  }

  addTip(id: number, tip: number): ExpenseDTO | undefined {
    const expense = this.account.find(id);
    if (!expense) return undefined;
    expense.addTip(tip); // Polymorphism: the caller only needs IExpense.
    this.save();
    return toDTO(expense);
  }

  remove(id: number): boolean {
    const removed = this.account.remove(id);
    if (removed) this.save();
    return removed;
  }
}
