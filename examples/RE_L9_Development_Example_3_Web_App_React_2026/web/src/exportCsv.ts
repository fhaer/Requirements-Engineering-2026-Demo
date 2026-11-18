import type { ExpenseDTO } from "../../src/contracts";

/**
 * Export exactly the rows currently visible in the expense table. No server
 * request is needed because React already holds the filtered data in memory.
 *
 * Double-quote escaping follows CSV conventions. Prefixing formula-like
 * values reduces spreadsheet formula injection when users open exported CSVs.
 */
export function exportCsv(expenses: ExpenseDTO[]): void {
  const columns = [
    "Date", "Description", "Category", "Type", "Base CHF", "Tip CHF", "Total CHF", "Trip ID",
  ];

  function safeCell(value: string | number): string {
    const text = String(value);
    const needsPrefix = /^[=+@\-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text);
    const escaped = (needsPrefix ? `'${text}` : text).replaceAll('"', '""');
    return `"${escaped}"`;
  }

  const rows = expenses.map(expense => [
    expense.date,
    expense.name,
    expense.category,
    expense.kind,
    (expense.amount - expense.tip).toFixed(2),
    expense.tip.toFixed(2),
    expense.amount.toFixed(2),
    expense.tripId ?? "",
  ]);
  const csv = [columns, ...rows].map(row => row.map(safeCell).join(",")).join("\r\n");

  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ledger-expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
}
