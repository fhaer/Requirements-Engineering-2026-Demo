import { Expense } from './expense';

export class BusinessExpense extends Expense {
    tripId: number;
    constructor(id : number) {
        super();
        this.tripId = id;
    }
    setBusinessTrip(tripId : number): void {
        this.tripId = tripId;
    }
}
