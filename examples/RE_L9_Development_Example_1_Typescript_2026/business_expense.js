"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessExpense = void 0;
const expense_1 = require("./expense");
class BusinessExpense extends expense_1.Expense {
    tripId;
    constructor(id) {
        super();
        this.tripId = id;
    }
    setBusinessTrip(tripId) {
        this.tripId = tripId;
    }
}
exports.BusinessExpense = BusinessExpense;
//# sourceMappingURL=business_expense.js.map