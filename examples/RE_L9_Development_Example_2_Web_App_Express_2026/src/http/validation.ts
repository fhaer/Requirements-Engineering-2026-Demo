/**
 * Types at the HTTP boundary require special care: JSON originates outside
 * TypeScript's compiler. We initially represent it as unknown and narrow it
 * through checks that also execute in JavaScript at runtime.
 */
export class ValidationError extends Error {}

export type NewExpense = {
  name: string;
  category: string;
  amount: number;
  tip: number;
} & (
  | { kind: "consumer" }
  | { kind: "business"; tripId: number }
);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

export function parseNewExpense(value: unknown): NewExpense {
  if (!isObject(value)) throw new ValidationError("Expected a JSON object.");
  const { kind, name, category, amount, tip = 0, tripId } = value;

  if (typeof name !== "string" || !name.trim() || name.length > 80) {
    throw new ValidationError("Description is required (1–80 characters).");
  }
  if (typeof category !== "string" || !category.trim() || category.length > 40) {
    throw new ValidationError("Category is required (1–40 characters).");
  }
  if (!isMoney(amount) || amount === 0 || !isMoney(tip)) {
    throw new ValidationError("Amount and tip must be valid non-negative CHF amounts (two decimals).");
  }

  const common = { name: name.trim(), category: category.trim(), amount, tip };
  if (kind === "consumer") return { ...common, kind };
  if (kind === "business" && Number.isSafeInteger(tripId) && Number(tripId) > 0) {
    return { ...common, kind, tripId: tripId as number };
  }
  throw new ValidationError("Select a valid expense type and, for business, a positive trip ID.");
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ValidationError("Invalid expense ID.");
  return id;
}

export function parseTip(value: unknown): number {
  if (!isObject(value) || !isMoney(value.tip) || value.tip === 0) {
    throw new ValidationError("Tip must be a positive CHF amount (two decimals).");
  }
  return value.tip;
}
