import type { IExpense } from "./IExpense";

// Round to cents at the domain boundary, rather than exposing floating-point
// artefacts such as 0.1 + 0.2 = 0.30000000000000004 to the interface.
const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Shared behaviour for personal and business expenses.
 *
 * `implements IExpense` is a compile-time check of the class's public shape.
 * Constructor parameter properties (`public name: string`, etc.) both declare
 * instance fields and initialise them; this is concise, idiomatic TypeScript.
 */
export class Expense implements IExpense {
  public tip = 0;

  constructor(
    public readonly id: number,
    public name: string,
    public amount: number,
    public category: string,
    public date: string,
  ) {}

  /** A tip changes both the separately recorded gratuity and the total. */
  addTip(tipAmount: number): void {
    if (!Number.isFinite(tipAmount) || tipAmount <= 0) {
      throw new RangeError("Tip must be positive.");
    }
    this.tip = roundMoney(this.tip + tipAmount);
    this.amount = roundMoney(this.amount + tipAmount);
  }
}
