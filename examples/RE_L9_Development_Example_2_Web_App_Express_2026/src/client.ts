/**
 * Browser controller for the HTML view. No frontend framework is required here:
 * the DOM API is sufficient for a form and an expense table. The server remains
 * authoritative; every mutation is followed by a fresh GET request.
 */

// The HTTP response is JSON, not a class instance: methods such as addTip()
// are used on the server, while the browser works with this data shape.
interface ExpenseView {
  id: number;
  kind: "consumer" | "business";
  name: string;
  category: string;
  amount: number;
  tip: number;
  tripId?: number;
}
interface ExpenseListResponse {
  expenses: ExpenseView[];
  summary: { count: number; total: number; tips: number };
}

// Generic querySelector<T> allows the compiler to check element-specific APIs.
// The non-null assertion is appropriate for elements defined by this fixed page.
const form = document.querySelector<HTMLFormElement>("#expense-form")!;
const kind = document.querySelector<HTMLSelectElement>("#kind")!;
const tripField = document.querySelector<HTMLElement>("#trip-field")!;
const rows = document.querySelector<HTMLTableSectionElement>("#rows")!;
const info = document.querySelector<HTMLElement>("#message")!;
const CHF = new Intl.NumberFormat("en-CH", { style: "currency", currency: "CHF" });

function cell(text: string, className = ""): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = className;
  // Do not interpolate user-controlled strings into innerHTML. textContent
  // treats them as data, which also avoids a potential HTML injection issue.
  td.textContent = text;
  return td;
}

/**
 * fetch() returns Promise<Response>. An HTTP error does not normally reject
 * the Promise: network errors reject, while 400/500 responses must be checked
 * with response.ok. response.json() is a second asynchronous operation.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

async function refresh(): Promise<void> {
  const data = await request<ExpenseListResponse>("/api/expenses");
  document.querySelector<HTMLElement>("#total")!.textContent = CHF.format(data.summary.total);
  document.querySelector<HTMLElement>("#tips")!.textContent = CHF.format(data.summary.tips);
  document.querySelector<HTMLElement>("#count")!.textContent = String(data.summary.count);

  // Replace the table in one step rather than accumulating duplicate rows.
  rows.replaceChildren(...data.expenses.map(renderExpense));
}

function renderExpense(expense: ExpenseView): HTMLTableRowElement {
  const row = document.createElement("tr");
  const description = `${expense.name} · ${expense.category}`;
  const classification = expense.kind === "business"
    ? `Business · trip ${expense.tripId}` : "Consumer";
  row.append(
    cell(description), cell(classification),
    cell(CHF.format(expense.amount - expense.tip), "right"),
    cell(CHF.format(expense.tip), "right"),
    cell(CHF.format(expense.amount), "right"),
  );

  const actions = document.createElement("td");
  const tipInput = document.createElement("input");
  tipInput.className = "tip-input";
  tipInput.type = "number";
  tipInput.min = "0.01";
  tipInput.step = "0.01";
  tipInput.placeholder = "CHF";
  tipInput.setAttribute("aria-label", `Tip for ${expense.name}`);
  const tipButton = document.createElement("button");
  tipButton.className = "small";
  tipButton.textContent = "+ Tip";
  const deleteButton = document.createElement("button");
  deleteButton.className = "small subtle";
  deleteButton.textContent = "Delete";
  actions.append(tipInput, tipButton, deleteButton);
  row.append(actions);

  // Event handlers can be asynchronous. We deliberately handle errors inside
  // each operation; otherwise a rejected Promise in a click handler may become
  // an unhandled rejection without useful feedback to the user.
  tipButton.addEventListener("click", () => {
    void mutate(`/api/expenses/${expense.id}/tip`, "PATCH", { tip: Number(tipInput.value) }, "Tip added.");
  });
  deleteButton.addEventListener("click", () => {
    void mutate(`/api/expenses/${expense.id}`, "DELETE", undefined, "Expense deleted.");
  });
  return row;
}

async function mutate(url: string, method: string, body: object | undefined, success: string): Promise<void> {
  try {
    await request(url, { method, ...(body && { body: JSON.stringify(body) }) });
    await refresh();
    info.textContent = success;
    info.classList.remove("error");
  } catch (error) {
    info.textContent = error instanceof Error ? error.message : String(error);
    info.classList.add("error");
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const values = new FormData(form);
  const business = values.get("kind") === "business";
  const draft = {
    kind: business ? "business" : "consumer",
    name: String(values.get("name")),
    amount: Number(values.get("amount")),
    category: String(values.get("category")),
    tip: Number(values.get("tip") || 0),
    ...(business ? { tripId: Number(values.get("tripId")) } : {}),
  };
  try {
    await request("/api/expenses", { method: "POST", body: JSON.stringify(draft) });
    form.reset();
    toggleTrip();
    await refresh();
    info.textContent = "Expense added.";
    info.classList.remove("error");
  } catch (error) {
    info.textContent = error instanceof Error ? error.message : String(error);
    info.classList.add("error");
  }
});

function toggleTrip(): void {
  tripField.hidden = kind.value !== "business";
  document.querySelector<HTMLInputElement>("#trip-id")!.required = !tripField.hidden;
}
kind.addEventListener("change", toggleTrip);
toggleTrip();
void refresh().catch(error => {
  info.textContent = error instanceof Error ? error.message : String(error);
  info.classList.add("error");
});
