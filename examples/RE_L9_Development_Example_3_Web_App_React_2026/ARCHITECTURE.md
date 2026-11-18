# Architecture and implementation notes



## 1. Execution environments and responsibilities

```text
Browser (React / TypeScript)                  Node.js (Express / TypeScript)

App.tsx    React state and rendering
    |
    v
web/src/api.ts  fetch('/api/expenses')   --> src/api.ts   HTTP validation
    ^                                        |
    |    JSON response (ExpenseDTO)          v
    +-----------------------------------  src/store.ts   persistence boundary
                                              |
                                              v
                                         AccountExpenses
                                              |
                                    IExpense / Expense
                                    /             \
                             ConsumerExpense   BusinessExpense
                                              |
                                         expenses.json
```

- **Node.js** executes server-side JavaScript, including the compiled TypeScript
  domain classes and the file-system operations.
- **Express** is an HTTP framework. A *route* associates an HTTP method and a
  URL pattern with an application callback; *middleware* is a callback that
  participates in the request-processing pipeline. For example,
  `express.json()` reads JSON request bodies before a route uses `req.body`.
- **React** renders the interface as components: functions whose JSX output
  depends on current state. Updating state causes React to evaluate the
  relevant component again.
- **Vite** provides frontend compilation and a development server. The proxy
  in `web/vite.config.ts` forwards `/api/...` to Express during development.

The HTTP boundary is important even on one computer: browser JavaScript cannot
invoke `store.create()` directly, nor can it access the server's `fs` module.
It communicates through a request and receives an HTTP response.

## 2. Why both classes and interfaces?

`IExpense` expresses a structural contract. `Expense` provides the common
implementation; `BusinessExpense` and `ConsumerExpense` inherit it, and
`AccountExpenses` aggregates an `IExpense[]`. That collection can accept either
subtype without knowing its concrete class. In contrast to an interface,
`BusinessExpense` has a runtime constructor, enabling `instanceof`.

TypeScript's `implements` and interface annotations are checked during
compilation but erased from emitted JavaScript. The compiler cannot guarantee
that data received over HTTP is well formed. That is why `src/api.ts` first
accepts a request body as `unknown` and validates it with type guards.

A **DTO** (*Data Transfer Object*) is the JSON-compatible shape exchanged
between client and server. `ExpenseDTO` contains data, not `addTip()` or other
methods. The conversion lives in the store. This separation prevents HTTP and
serialization concerns from becoming part of the core domain classes.

### Monetary invariant

`Expense.amount` is the **total paid, including tips**, consistent with the
lecture example. The edit form uses a base amount and an explicitly entered tip:

```text
Form:    amount = 48.00, tip = 2.00
                   |
                   v
Store:   new BusinessExpense(..., 48.00, ...)
         expense.addTip(2.00)
                   |
                   v
DTO:     amount = 50.00, tip = 2.00
```

That distinction makes `Expense.addTip()` meaningful, but it does mean that
`ExpenseDraft.amount` and `ExpenseDTO.amount` have different interpretations.
The interfaces and conversion functions document the difference explicitly.

## 3. Following one `POST` request

1. The user submits `ExpenseModal`, a React component with controlled form
   fields. Its handler converts string-valued input fields to an `ExpenseDraft`.
2. `App.saveExpense()` awaits `expensesApi.create(draft)` in `web/src/api.ts`.
3. The client calls `fetch('/api/expenses', { method: 'POST', body: ... })`. The
   browser serialises the object with `JSON.stringify()` and sends HTTP.
4. Express's `express.json()` middleware parses the request body. The
   `app.post('/api/expenses', handler)` callback receives it as `req.body`.
5. `parseDraft()` performs runtime validation, refining `unknown` into a
   well-typed `ExpenseDraft`. TypeScript alone cannot validate arbitrary JSON.
6. `ExpenseStore.create()` constructs the appropriate class, applies any tip,
   adds the instance to `AccountExpenses` and writes the JSON snapshot.
7. Express sends status **201 Created** and a JSON representation of the new
   entry. The browser parses the reply, refreshes the list and updates state.
8. React renders the table and summary values from that updated state.

The `PUT`, `PATCH` and `DELETE` operations follow the same structure. They
represent replacement, partial change and removal respectively. Express uses
`:id` in route patterns to capture a parameter from the requested URL.

## 4. Promises and asynchronous execution

`fetch()` returns a `Promise<Response>`. The network response is not
necessarily available when `fetch()` returns. The Promise represents its
future success or failure. Calling `response.json()` similarly returns a
Promise while the response body is read and parsed.

```ts
async function load(): Promise<ExpenseDTO[]> {
  const response = await fetch('/api/expenses');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result: ExpenseListResponse = await response.json();
  return result.expenses;
}
```

`await` suspends **this asynchronous function**, not the browser's event loop.
It does not create a separate thread or force every operation to execute
synchronously. An `async` function always returns a Promise; for example,
`Promise<void>` means that no meaningful value is returned upon completion.

The initial request in `App.tsx` deliberately uses Promise chaining:

```ts
expensesApi.list()
  .then(result => setData(result))
  .catch(error => setNotice({ text: error.message, error: true }))
  .finally(() => setLoading(false));
```

The mutation handlers use `async`/`await` instead. These are two syntactic ways
of working with Promises, not separate asynchronous execution models.

A network failure causes `fetch()` to reject. A valid HTTP reply carrying
status `400` or `500` generally does **not** reject `fetch()`; the HTTP client
checks `response.ok` and raises an error explicitly. The form catches that
error and displays an appropriate message, while `finally` restores the
button's enabled state.

## 5. React state, effects and derived data

`useState` retains UI state between renders. `useEffect` initiates the first
HTTP load after rendering. Its cleanup flag prevents a late response from
updating an obsolete effect instance, which is relevant when React StrictMode
replays effects during development.

Filters, ordering and category totals are **derived** from server data with
`useMemo`. No separate server request is needed when the user types into the
search field. After a mutation, the application retrieves authoritative data
again: this favours correctness and an easily inspected data flow over the
complexity of optimistic UI updates.

The display components use the transport type `ExpenseDTO`; the domain classes
never cross the network boundary. This makes explicit which part of the system
is responsible for rules and which part is responsible for presentation.

## 6. Persistence and scope

`ExpenseStore` writes to a temporary file and then renames it over the current
snapshot. This reduces the chance of leaving a partially written file, but is
not a substitute for a transactional database. The synchronous file operations
also block the Node.js event loop briefly. Both are acceptable constraints for
a local teaching example and would be revised for a multi-user service.

The principal extension exercise is to replace the JSON snapshot with a
persistent database while keeping `createApp()` and the React client largely
unchanged. The exercise tests whether the application boundaries have been
chosen for the right reasons, rather than merely whether a new library can be
added.
