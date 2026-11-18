import path from "node:path";
import { createApp } from "./api";
import { examples } from "./seed";
import { ExpenseStore } from "./store";

/** Application entry point: configure storage, create Express, listen for HTTP. */
const port = Number(process.env.PORT ?? 3000);
const file = process.env.DATA_FILE ?? path.resolve(process.cwd(), "data/expenses.json");
const store = new ExpenseStore(file, examples);

createApp(store).listen(port, () => {
  console.log(`Ledger API is running at http://localhost:${port}`);
});
