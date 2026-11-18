"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountExpenses = void 0;
const expense_1 = require("./expense");
const business_expense_1 = require("./business_expense");
class AccountExpenses {
    expenseList = [];
    addExpense(expense) {
        console.log(`Adding new expense ...`);
        this.expenseList.push(expense);
    }
    print() {
        for (let e of this.expenseList) {
            if (e instanceof expense_1.Expense) {
                console.log(`${e.name}, ${e.amount} CHF`);
            }
        }
    }
}
exports.AccountExpenses = AccountExpenses;
let my_expense = new AccountExpenses();
let e1 = new business_expense_1.BusinessExpense(0);
e1.name = "Test";
e1.amount = 99.99;
my_expense.addExpense(e1);
my_expense.print();
let a = new AccountExpenses();
let e = new business_expense_1.BusinessExpense(0);
e.name = "Flux compensation";
e.amount = 42.41;
a.addExpense(e);
e = new business_expense_1.BusinessExpense(1);
e.name = "Flux capacitor";
e.amount = 99.99;
a.addExpense(e);
a.print();
//# sourceMappingURL=account_expenses.js.map