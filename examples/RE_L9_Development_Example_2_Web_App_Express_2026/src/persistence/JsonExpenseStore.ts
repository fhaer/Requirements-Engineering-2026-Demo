import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AccountExpenses } from "../model/AccountExpenses";
import { fromRecord, toRecord, type ExpenseRecord } from "../model/expenseRecord";

/**
 * A deliberately small persistence adapter: the HTTP and domain layers know
 * nothing about the file format. For a multi-user application this adapter
 * should be replaced by a database/repository implementation.
 */
export class JsonExpenseStore {
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(private readonly filename: string) {}

  async load(): Promise<AccountExpenses | null> {
    let contents: string;
    try {
      contents = await readFile(this.filename, "utf8");
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error; // Do not silently overwrite unreadable or corrupt data.
    }

    const rows: unknown = JSON.parse(contents);
    if (!Array.isArray(rows) || !rows.every(isExpenseRecord)) {
      throw new Error(`Invalid expense data in ${this.filename}`);
    }
    const account = new AccountExpenses();
    rows.map(fromRecord).forEach(expense => account.addExpense(expense));
    return account;
  }

  save(account: AccountExpenses): Promise<void> {
    // File writes are asynchronous and may overlap when requests arrive close
    // together. Chaining Promises serialises them in request order. Each write
    // uses a temporary file + rename, avoiding a partially written JSON file.
    const snapshot = JSON.stringify(account.getAll().map(toRecord), null, 2) + "\n";
    const write = () => this.writeSnapshot(snapshot);
    this.pendingWrite = this.pendingWrite.then(write, write);
    return this.pendingWrite;
  }

  private async writeSnapshot(snapshot: string): Promise<void> {
    await mkdir(path.dirname(this.filename), { recursive: true });
    const temporary = `${this.filename}.tmp`;
    await writeFile(temporary, snapshot, "utf8");
    await rename(temporary, this.filename);
  }
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Stored JSON is untrusted at runtime, independently of its TypeScript type. */
function isExpenseRecord(value: unknown): value is ExpenseRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const cents = (v: unknown) => typeof v === "number" && Number.isFinite(v)
    && v >= 0 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
  return Number.isSafeInteger(row.id) && Number(row.id) > 0
    && typeof row.name === "string" && row.name.length > 0
    && typeof row.category === "string" && row.category.length > 0
    && cents(row.amount) && cents(row.tip) && Number(row.amount) >= Number(row.tip)
    && (row.kind === "consumer" || (row.kind === "business"
      && Number.isSafeInteger(row.tripId) && Number(row.tripId) > 0));
}
