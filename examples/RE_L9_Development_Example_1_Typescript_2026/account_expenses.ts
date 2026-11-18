import { IExpense } from "./iexpense";
import { Expense } from './expense';
import { BusinessExpense } from './business_expense';


export class AccountExpenses {
    expenseList: IExpense[] = [];
    addExpense(expense: IExpense): void {
        console.log(`Adding new expense ...`);
        this.expenseList.push(expense);
    }    
    print(): void {
        for (let e of this.expenseList) {
            if (e instanceof Expense) {
                console.log(`${e.name}, ${e.amount} CHF`);
            }    
        }    
    }    
}    

let my_expense = new AccountExpenses()
let e1 = new BusinessExpense(0);
e1.name = "Test"
e1.amount = 99.99
my_expense.addExpense( e1 );
my_expense.print()

let a = new AccountExpenses();
let e : BusinessExpense = new BusinessExpense(0);
e.name = "Flux compensation";
e.amount = 42.41;
a.addExpense(e);
e = new BusinessExpense(1);
e.name = "Flux capacitor";
e.amount = 99.99;
a.addExpense(e);

a.print();





