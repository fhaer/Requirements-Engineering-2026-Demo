import { Expense } from "./Expense";

/**
 * A specialised expense with a business-trip reference. Inheritance is useful
 * here because the subtype genuinely shares the monetary behaviour of Expense;
 * it only adds information and a constraint specific to business expenses.
 */
export class BusinessExpense extends Expense {
  constructor(
    id: number,
    name: string,
    amount: number,
    category: string,
    public tripId: number,
    date: string,
  ) {
    super(id, name, amount, category, date);
    this.setBusinessTrip(tripId);
  }

  setBusinessTrip(tripId: number): void {
    if (!Number.isSafeInteger(tripId) || tripId <= 0) {
      throw new RangeError("Invalid trip ID.");
    }
    this.tripId = tripId;
  }
}
