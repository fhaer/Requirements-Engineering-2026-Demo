"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
class Expense {
    id;
    name;
    amount;
    category;
    tip;
    constructor() {
        this.id = 0;
        this.name = "";
        this.amount = 0;
        this.category = "";
        this.tip = 0;
    }
    addTip(tip) {
        console.log(`adding tip ${tip} to expense amount ...`);
        this.amount += tip;
        this.tip = tip;
        console.log(`new expense amount: ${this.amount}`);
    }
}
exports.Expense = Expense;
//# sourceMappingURL=expense.js.map