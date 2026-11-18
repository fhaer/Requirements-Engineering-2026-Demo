import type { IExpense } from "./IExpense";

const roundCHF = (value: number): number => Math.round(value * 100) / 100;

/** Base implementation shared by consumer and business expenses. */
export class Expense implements IExpense {
  public tip = 0;

  // Parameter properties declare and initialise fields in one place.
  // readonly prevents reassigning an identifier after construction.
  constructor(
    public readonly id: number,
    public name: string,
    public amount: number,
    public category: string,
  ) {}

  addTip(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError("Tip must be positive.");
    }

    // Keep the lecture's convention: amount is the total INCLUDING tips.
    // Money is rounded to cents to avoid displaying floating-point artefacts.
    this.tip = roundCHF(this.tip + value);
    this.amount = roundCHF(this.amount + value);
  }
}
