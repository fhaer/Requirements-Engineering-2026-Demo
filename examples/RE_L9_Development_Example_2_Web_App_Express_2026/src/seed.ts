import { AccountExpenses } from "./model/AccountExpenses";
import { BusinessExpense } from "./model/BusinessExpense";
import { ConsumerExpense } from "./model/ConsumerExpense";

/** Initial example data is used only when no saved file exists. */
export function seedAccount(): AccountExpenses {
  const account = new AccountExpenses();
  const coffee = new ConsumerExpense(1, "Coffee & croissant", 12.5, "Food");
  coffee.addTip(1.5);
  account.addExpense(coffee);
  account.addExpense(new BusinessExpense(2, "Train to Bern", 48, "Travel", 2042));
  const lunch = new BusinessExpense(3, "Team lunch", 64, "Food", 2042);
  lunch.addTip(6);
  account.addExpense(lunch);
  account.addExpense(new ConsumerExpense(4, "Notebook", 9.9, "Office"));
  return account;
}
