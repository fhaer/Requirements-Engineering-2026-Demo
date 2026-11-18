import type { ExpenseDTO, ExpenseDraft, ExpenseListResponse } from "../../src/contracts";

/**
 * A small, typed HTTP boundary between React and Express.
 *
 * `fetch()` returns Promise<Response>: the response becomes available later,
 * without blocking the browser's event loop. `await` suspends this async
 * function; it does not block rendering or make network I/O synchronous.
 *
 * The generic T expresses the response shape expected by the caller. It is a
 * compile-time contract, not a runtime validation of data from the server.
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  // HTTP 400/404/500 do not reject fetch() on their own. The browser receives
  // a valid HTTP response, so application code must inspect response.ok.
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  // 204 means success without JSON. response.json() itself returns a Promise.
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

/** The HTTP details stay here; React components call descriptive operations. */
export const expensesApi = {
  list: () => request<ExpenseListResponse>("/api/expenses"),

  create: (expense: ExpenseDraft) => request<ExpenseDTO>("/api/expenses", {
    method: "POST", body: JSON.stringify(expense),
  }),

  update: (id: number, expense: ExpenseDraft) => request<ExpenseDTO>(`/api/expenses/${id}`, {
    method: "PUT", body: JSON.stringify(expense),
  }),

  addTip: (id: number, tip: number) => request<ExpenseDTO>(`/api/expenses/${id}/tip`, {
    method: "PATCH", body: JSON.stringify({ tip }),
  }),

  remove: (id: number) => request<void>(`/api/expenses/${id}`, { method: "DELETE" }),
};
