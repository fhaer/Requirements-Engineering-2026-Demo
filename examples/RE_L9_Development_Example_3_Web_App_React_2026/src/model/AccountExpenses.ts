import type { IExpense } from "./IExpense";
import { BusinessExpense } from "./BusinessExpense";

const roundMoney = (n: number): number => Math.round(n * 100) / 100;

/**
 * Aggregation: an account manages a collection of IExpense objects, without
 * depending on which concrete expense class each object belongs to.
 *
 * A private array prevents callers from bypassing the account's operations.
 */
export class AccountExpenses {
  private readonly expenseList: IExpense[] = [];

  addExpense(expense: IExpense): void {
    this.expenseList.push(expense);
  }

  getAll(): readonly IExpense[] {
    return [...this.expenseList]; // A copy protects the internal array.
  }

  find(id: number): IExpense | undefined {
    return this.expenseList.find(expense => expense.id === id);
  }

  remove(id: number): boolean {
    const index = this.expenseList.findIndex(expense => expense.id === id);
    if (index === -1) return false;
    this.expenseList.splice(index, 1);
    return true;
  }

  replace(expense: IExpense): void {
    const index = this.expenseList.findIndex(item => item.id === expense.id);
    if (index === -1) throw new Error("Expense not found.");
    this.expenseList[index] = expense;
  }

  get total(): number {
    return roundMoney(this.expenseList.reduce((sum, e) => sum + e.amount, 0));
  }

  get totalTips(): number {
    return roundMoney(this.expenseList.reduce((sum, e) => sum + e.tip, 0));
  }

  get businessTotal(): number {
    // Unlike an interface, a class has a runtime identity: instanceof works.
    return roundMoney(this.expenseList.reduce(
      (sum, e) => sum + (e instanceof BusinessExpense ? e.amount : 0), 0,
    ));
  }

  print(): void {
    for (const expense of this.expenseList) {
      console.log(`${expense.name}: CHF ${expense.amount.toFixed(2)}`);
    }
  }
}
