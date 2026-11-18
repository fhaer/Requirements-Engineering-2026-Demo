import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { AccountExpenses } from "./model/AccountExpenses";
import { BusinessExpense } from "./model/BusinessExpense";
import { ConsumerExpense } from "./model/ConsumerExpense";
import { toRecord } from "./model/expenseRecord";
import { JsonExpenseStore } from "./persistence/JsonExpenseStore";
import { parseId, parseNewExpense, parseTip, ValidationError } from "./http/validation";

/**
 * Express supplies the HTTP infrastructure; the domain classes perform the
 * actual expense operations. This factory also allows tests to supply their
 * own isolated account and persistence file rather than starting a real port.
 *
 * An HTTP endpoint is identified by its method and URL. Express matches that
 * pair and invokes the corresponding handler (often called a route handler).
 */
export function createApp(account: AccountExpenses, store: JsonExpenseStore) {
  const app = express();
  let nextId = Math.max(0, ...account.getAll().map(expense => expense.id)) + 1;

  // Middleware transforms JSON request bodies into values available as req.body.
  // Parsing JSON does not validate its structure: that remains our responsibility.
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/api/expenses", (_req, res) => {
    res.json({
      expenses: account.getAll().map(toRecord),
      summary: { count: account.getAll().length, total: account.total, tips: account.totalTips },
    });
  });

  app.post("/api/expenses", async (req, res) => {
    const draft = parseNewExpense(req.body as unknown);
    const expense = draft.kind === "business"
      ? new BusinessExpense(nextId++, draft.name, draft.amount, draft.category, draft.tripId)
      : new ConsumerExpense(nextId++, draft.name, draft.amount, draft.category);
    if (draft.tip > 0) expense.addTip(draft.tip);
    account.addExpense(expense);

    // Persist before confirming success. This awaits disk I/O; the Node.js event
    // loop remains able to process other work while the Promise is pending.
    await store.save(account);
    res.status(201).json(toRecord(expense));
  });

  app.patch("/api/expenses/:id/tip", async (req, res) => {
    // :id denotes the variable URL segment; Express exposes it as a string.
    const expense = account.find(parseId(req.params.id));
    if (!expense) { res.status(404).json({ error: "Expense not found." }); return; }

    expense.addTip(parseTip(req.body as unknown));
    await store.save(account);
    res.json(toRecord(expense));
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    if (!account.remove(parseId(req.params.id))) {
      res.status(404).json({ error: "Expense not found." }); return;
    }
    await store.save(account);
    res.sendStatus(204); // Successful deletion; the response has no body.
  });

  // The frontend is plain HTML/CSS and browser-compatible JavaScript compiled
  // from src/client.ts. Serving it from the same origin avoids CORS complexity.
  app.get("/client.js", (_req, res) => res.sendFile(path.join(__dirname, "client.js")));
  app.use(express.static(path.join(__dirname, "..", "public")));
  app.use("/api", (_req, res) => res.status(404).json({ error: "Unknown API endpoint." }));

  // Express 5 forwards rejected Promises from async handlers here. We separate
  // expected client errors (400) from unexpected failures (500), rather than
  // exposing internal exception details to the browser.
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (isMalformedJSON(error)) {
      res.status(400).json({ error: "Malformed JSON request." });
    } else {
      console.error("Unhandled request error:", error);
      res.status(500).json({ error: "Unable to complete request." });
    }
  };
  app.use(errorHandler);
  return app;
}

function isMalformedJSON(error: unknown): boolean {
  return typeof error === "object" && error !== null
    && "type" in error && error.type === "entity.parse.failed";
}
