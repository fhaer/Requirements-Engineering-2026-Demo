/**
 * Shared definitions for the server and browser. Importing a TypeScript type
 * does not import server implementation code into the browser bundle.
 */
export const CATEGORIES = ["Food", "Travel", "Shopping", "Office", "Other"] as const;

// `as const` preserves literal values; indexed access produces a union such
// as "Food" | "Travel" | ... instead of the unrestricted type string.
export type Category = (typeof CATEGORIES)[number];
export type ExpenseKind = "consumer" | "business";

/**
 * Data Transfer Object (DTO): a plain JSON-compatible representation of an
 * expense. Class methods are not transmitted in JSON and are not needed by
 * React, which only displays data and sends requested changes to the server.
 */
export interface ExpenseDTO {
  id: number;
  kind: ExpenseKind;
  name: string;
  category: Category;
  date: string; // ISO calendar date: YYYY-MM-DD
  amount: number; // Total INCLUDING tips, matching the lecture model.
  tip: number;
  tripId?: number; // Optional: present only for business expenses.
}

/**
 * Input for creation/replacement. Here `amount` is the BASE amount and `tip`
 * is added separately. The store constructs an Expense and invokes addTip().
 */
export interface ExpenseDraft {
  kind: ExpenseKind;
  name: string;
  category: Category;
  date: string;
  amount: number;
  tip: number;
  tripId?: number;
}

export interface ExpenseListResponse {
  expenses: ExpenseDTO[];
  summary: {
    count: number;
    total: number;
    tips: number;
    businessTotal: number;
  };
}
