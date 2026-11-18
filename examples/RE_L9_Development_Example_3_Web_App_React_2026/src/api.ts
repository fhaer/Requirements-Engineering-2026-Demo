import express, { type ErrorRequestHandler } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, type ExpenseDraft } from "./contracts";
import { ExpenseStore } from "./store";

/** Invalid client input is different from an unexpected programming error. */
class ClientError extends Error {}

/**
 * A type guard refines `unknown` after a runtime check. Incoming JSON is
 * untrusted: a TypeScript interface alone cannot guarantee its shape, because
 * types are erased in the JavaScript sent to Node.js or the browser.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

/** Validate an HTTP request and construct a well-typed ExpenseDraft. */
function parseDraft(raw: unknown): ExpenseDraft {
  if (!isRecord(raw)) throw new ClientError("Expected a JSON object.");
  const { kind, name, category, date, amount, tip = 0, tripId } = raw;

  if (kind !== "consumer" && kind !== "business") {
    throw new ClientError("Choose consumer or business.");
  }
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    throw new ClientError("Description must be 1–80 characters.");
  }
  if (typeof category !== "string" ||
      !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    throw new ClientError("Choose a valid category.");
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new ClientError("Choose a valid date (YYYY-MM-DD).");
  }
  if (!isMoney(amount) || amount <= 0) {
    throw new ClientError("Amount must be positive, with up to 2 decimals.");
  }
  if (!isMoney(tip)) {
    throw new ClientError("Tip must be non-negative, with up to 2 decimals.");
  }
  if (kind === "business" &&
      (typeof tripId !== "number" || !Number.isSafeInteger(tripId) || tripId <= 0)) {
    throw new ClientError("Business expenses require a positive trip ID.");
  }

  return {
    kind,
    name: name.trim(),
    category: category as ExpenseDraft["category"],
    date,
    amount,
    tip,
    ...(kind === "business" ? { tripId: tripId as number } : {}),
  };
}

function positiveId(raw: string | string[] | undefined): number {
  const id = Number(raw);
  if (typeof raw !== "string" || !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(id) || id <= 0) {
    throw new ClientError("Invalid expense ID.");
  }
  return id;
}

/**
 * Construct the Express application without opening a network port. Separating
 * app creation from `listen()` allows HTTP tests to start it on a temporary port.
 *
 * A route associates an HTTP method and URL pattern with a callback. Express
 * invokes the matching callback when an incoming request arrives.
 */
export function createApp(store = new ExpenseStore()) {
  const app = express();
  app.disable("x-powered-by");

  // Middleware runs before route callbacks. express.json() parses the request
  // body and puts the resulting object into req.body. The size limit prevents
  // unnecessarily large payloads for this small API.
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next(); // Continue to the next matching middleware or route.
  });

  app.get("/api/expenses", (_req, res) => {
    res.json(store.list()); // HTTP 200 + serialised JSON response.
  });

  app.post("/api/expenses", (req, res) => {
    const draft = parseDraft(req.body as unknown);
    res.status(201).json(store.create(draft)); // 201: resource created.
  });

  app.put("/api/expenses/:id", (req, res) => {
    const id = positiveId(req.params.id); // :id is a URL parameter.
    const updated = store.update(id, parseDraft(req.body as unknown));
    if (!updated) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }
    res.json(updated);
  });

  app.patch("/api/expenses/:id/tip", (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body) || !isMoney(body.tip) || body.tip <= 0) {
      throw new ClientError("Enter a positive tip (max. 2 decimals).");
    }
    const updated = store.addTip(positiveId(req.params.id), body.tip);
    if (!updated) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }
    res.json(updated);
  });

  app.delete("/api/expenses/:id", (req, res) => {
    if (!store.remove(positiveId(req.params.id))) {
      res.status(404).json({ error: "Expense not found." });
      return;
    }
    res.sendStatus(204); // Success without a response body.
  });

  // Unknown /api paths should return JSON, not the React site's HTML.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  // After `npm run build`, Express serves the same static React site that
  // Vite serves during development. The browser still calls /api/expenses.
  const site = path.resolve(__dirname, "../web/dist");
  if (existsSync(site)) {
    app.use(express.static(site));
    app.get("/", (_req, res) => res.sendFile(path.join(site, "index.html")));
  }

  // Express invokes error-handling middleware with four parameters. We expose
  // controlled client errors while avoiding internal details in HTTP 500s.
  const handleErrors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof ClientError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (isRecord(error) && error.type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON." });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Unexpected server error." });
  };
  app.use(handleErrors);

  return app;
}
