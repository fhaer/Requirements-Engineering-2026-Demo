/**
 * The common contract from the lecture's class model.
 *
 * AccountExpenses depends on IExpense rather than a particular subclass.
 * This is structural typing: an object is assignable when it provides the
 * required members, regardless of where its class was declared.
 *
 * Interfaces disappear during compilation; they provide no runtime checks.
 */
export interface IExpense {
  readonly id: number;
  name: string;
  amount: number; // Current total, including all tips (lecture convention).
  category: string;
  tip: number;
  addTip(value: number): void;
}
