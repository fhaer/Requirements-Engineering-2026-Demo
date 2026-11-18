import { Expense } from "./Expense";

/** A specialised expense with an additional business-trip identifier. */
export class BusinessExpense extends Expense {
  constructor(
    id: number,
    name: string,
    amount: number,
    category: string,
    public tripId: number,
  ) {
    super(id, name, amount, category);
  }

  setBusinessTrip(tripId: number): void {
    if (!Number.isSafeInteger(tripId) || tripId <= 0) {
      throw new RangeError("Business trip ID must be a positive integer.");
    }
    this.tripId = tripId;
  }
}
