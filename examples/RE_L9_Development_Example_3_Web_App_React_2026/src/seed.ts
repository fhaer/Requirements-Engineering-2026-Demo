import type { ExpenseDraft } from "./contracts";

const day = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

/** Sample data on first launch only; later changes are saved to data/expenses.json. */
export const examples: ExpenseDraft[] = [
  { kind: "consumer", name: "Morning coffee & pastry", amount: 12.5, tip: 1.5, category: "Food", date: day(0) },
  { kind: "business", name: "Train to Bern", amount: 48, tip: 0, category: "Travel", tripId: 2042, date: day(1) },
  { kind: "business", name: "Team lunch at the bistro", amount: 64, tip: 6, category: "Food", tripId: 2042, date: day(2) },
  { kind: "consumer", name: "Notebook & pens", amount: 18.9, tip: 0, category: "Office", date: day(3) },
  { kind: "consumer", name: "Groceries for the week", amount: 86.7, tip: 0, category: "Shopping", date: day(5) },
  { kind: "consumer", name: "Weekend museum tickets", amount: 28, tip: 0, category: "Other", date: day(7) },
  { kind: "business", name: "Client meeting — taxi", amount: 36, tip: 4, category: "Travel", tripId: 2043, date: day(9) },
];
