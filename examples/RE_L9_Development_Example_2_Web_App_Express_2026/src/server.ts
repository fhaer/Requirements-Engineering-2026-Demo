import path from "node:path";
import { createApp } from "./app";
import { seedAccount } from "./seed";
import { JsonExpenseStore } from "./persistence/JsonExpenseStore";

async function main(): Promise<void> {
  // Bootstrapping is separate from createApp: the server can initialise data
  // asynchronously, while tests can instantiate the HTTP app independently.
  const filename = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "expenses.json");
  const store = new JsonExpenseStore(filename);
  let account = await store.load();
  if (account === null) {
    account = seedAccount();
    await store.save(account);
  }

  const port = Number(process.env.PORT ?? 3000);
  createApp(account, store).listen(port, () => {
    console.log(`Expense Tracker: http://localhost:${port}`);
    console.log(`Data file: ${filename}`);
  });
}

// Keep startup errors visible and give the process a failing exit status.
main().catch(error => {
  console.error("Could not start the server:", error);
  process.exitCode = 1;
});
