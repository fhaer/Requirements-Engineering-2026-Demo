import { Expense } from "./Expense";

/**
 * The personal-expense subtype currently introduces no additional fields.
 * Keeping it explicit makes the distinction visible in the domain model and
 * leaves room for personal-specific rules without modifying the base class.
 */
export class ConsumerExpense extends Expense {}
