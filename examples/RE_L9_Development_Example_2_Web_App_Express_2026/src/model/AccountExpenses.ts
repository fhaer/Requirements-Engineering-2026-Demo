import type { IExpense } from "./IExpense";

/**
 * The aggregation in the lecture's UML model. The account owns a collection
 * of expenses but needs only their common interface—not their concrete type.
 */
export class AccountExpenses {
  private readonly expenses: IExpense[] = [];

  addExpense(expense: IExpense): void {
    this.expenses.push(expense);
  }

  getAll(): readonly IExpense[] {
    // A new array prevents callers from modifying the collection itself.
    return [...this.expenses];
  }

  find(id: number): IExpense | undefined {
    return this.expenses.find(expense => expense.id === id);
  }

  remove(id: number): boolean {
    const index = this.expenses.findIndex(expense => expense.id === id);
    if (index < 0) return false;
    this.expenses.splice(index, 1);
    return true;
  }

  get total(): number {
    return Math.round(this.expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
  }

  get totalTips(): number {
    return Math.round(this.expenses.reduce((sum, e) => sum + e.tip, 0) * 100) / 100;
  }

  print(): void {
    for (const e of this.expenses) console.log(`${e.name}: CHF ${e.amount.toFixed(2)}`);
  }
}
