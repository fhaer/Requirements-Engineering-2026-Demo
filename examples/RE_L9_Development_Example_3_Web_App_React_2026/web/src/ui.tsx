import type { ReactNode } from "react";
import { Archive, Coffee, ShoppingBag, TrainFront, Utensils } from "lucide-react";
import type { Category } from "../../src/contracts";

// Presentation helpers belong in the browser: the server deals with amounts
// and ISO dates, not locale-specific formatting or icon selection.
export const CHF = new Intl.NumberFormat("en-CH", {
  style: "currency",
  currency: "CHF",
});

export function readableDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function today(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time.
}

// Record<Category, ...> makes TypeScript check that every defined category
// has a corresponding icon and a colour.
export const categoryIcons: Record<Category, ReactNode> = {
  Food: <Utensils size={18} />,
  Travel: <TrainFront size={18} />,
  Shopping: <ShoppingBag size={18} />,
  Office: <Archive size={18} />,
  Other: <Coffee size={18} />,
};

export const categoryColors: Record<Category, string> = {
  Food: "#dca775",
  Travel: "#91b7de",
  Shopping: "#c6b2db",
  Office: "#9fbeb0",
  Other: "#c9cdd3",
};
