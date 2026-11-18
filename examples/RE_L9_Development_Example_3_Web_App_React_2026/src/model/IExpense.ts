/**
 * An interface specifies the operations and data that an expense must expose.
 * It does not prescribe how those operations are implemented. Both concrete
 * expense classes can therefore be handled through the same IExpense type.
 *
 * TypeScript removes interfaces during compilation: they do not exist as
 * runtime objects, which is why HTTP input requires separate validation.
 */
export interface IExpense {
  readonly id: number;
  name: string;
  category: string;
  date: string;
  amount: number; // Total paid, including any tip.
  tip: number;
  addTip(tipAmount: number): void;
}
