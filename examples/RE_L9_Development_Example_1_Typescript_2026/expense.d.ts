import { IExpense } from "./iexpense";
export declare class Expense implements IExpense {
    protected id: number;
    name: string;
    amount: number;
    category: string;
    tip: number;
    constructor();
    addTip(tip: number): void;
}
//# sourceMappingURL=expense.d.ts.map