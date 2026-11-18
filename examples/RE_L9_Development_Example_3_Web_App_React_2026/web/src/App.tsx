import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowUpRight, BriefcaseBusiness, Check,
  ChevronDown, LayoutDashboard, Pencil, Plus, Receipt,
  Search, Trash2, Wallet, X, Sparkles, RefreshCw, CircleAlert,
} from "lucide-react";
import { CATEGORIES, type ExpenseDTO, type ExpenseDraft, type ExpenseKind, type ExpenseListResponse } from "../../src/contracts";
import { expensesApi } from "./api";
import { ExpenseModal, Overlay, TipModal } from "./ExpenseDialogs";
import { exportCsv } from "./exportCsv";
import { CHF, readableDate, categoryIcons, categoryColors } from "./ui";

/**
 * App coordinates server data, derived views and user interactions. It does
 * not construct Expense classes: the authoritative model lives on the server,
 * while the browser works with JSON-compatible ExpenseDTO values.
 */
export default function App() {
  // React state persists across renders. Updating it requests a new render;
  // it does not mutate the existing DOM directly.
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  // `null` means that a dialog is closed; an ExpenseDTO identifies its subject.
  // The literal "new" distinguishes creation from editing without a separate flag.
  const [editing, setEditing] = useState<ExpenseDTO | "new" | null>(null);
  const [tipping, setTipping] = useState<ExpenseDTO | null>(null);
  const [removing, setRemoving] = useState<ExpenseDTO | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ExpenseKind>("all");
  const [sort, setSort] = useState<"recent" | "largest">("recent");
  const [saving, setSaving] = useState(false);

  // useCallback keeps the function identity stable; its only task is to
  // retrieve authoritative server state after a successful change.
  const refresh = useCallback(async (): Promise<void> => {
    const result = await expensesApi.list();
    setData(result);
  }, []);

  // Effects run after React has rendered. This uses Promise chaining to show
  // the same asynchronous control flow expressed with async/await elsewhere.
  // StrictMode may mount effects twice in development, so the cleanup flag
  // prevents a completed request from updating an obsolete component instance.
  useEffect(() => {
    let active = true;
    expensesApi.list()
      .then(result => { if (active) setData(result); })
      .catch(error => {
        if (active) setNotice({ text: (error as Error).message, error: true });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const expenses = data?.expenses ?? [];

  // Search, filtering and sorting are derived from the loaded data. They do
  // not require new HTTP requests or an additional source of React state.
  const shown = useMemo(() => expenses
    .filter(expense =>
      (filter === "all" || expense.kind === filter) &&
      `${expense.name} ${expense.category} ${expense.tripId ?? ""}`
        .toLowerCase().includes(search.toLowerCase().trim()),
    )
    .sort((a, b) => sort === "largest"
      ? b.amount - a.amount
      : b.date.localeCompare(a.date) || b.id - a.id,
    ), [expenses, search, filter, sort]);

  const categories = useMemo(() => CATEGORIES.map(category => ({
    category,
    total: expenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0),
  })).filter(item => item.total > 0).sort((a, b) => b.total - a.total), [expenses]);
  const maxCategory = Math.max(1, ...categories.map(category => category.total));

  // Higher-order function: the caller provides the asynchronous operation.
  // Only once it succeeds do we reload the server's updated representation.
  async function applyChange(action: () => Promise<unknown>, message: string): Promise<void> {
    await action();
    await refresh();
    setNotice({ text: message });
  }

  async function saveExpense(draft: ExpenseDraft): Promise<void> {
    const editingExpense = editing && editing !== "new" ? editing : null;
    await applyChange(
      () => editingExpense
        ? expensesApi.update(editingExpense.id, draft)
        : expensesApi.create(draft),
      editingExpense ? "Expense updated successfully." : "Expense added successfully.",
    );
    setEditing(null);
  }

  async function addTip(tip: number): Promise<void> {
    if (!tipping) return;
    await applyChange(() => expensesApi.addTip(tipping.id, tip), "Tip added successfully.");
    setTipping(null);
  }

  async function deleteExpense(): Promise<void> {
    if (!removing) return;
    setSaving(true);
    try {
      await applyChange(() => expensesApi.remove(removing.id), "Expense removed.");
      setRemoving(null);
    } catch (error) {
      setNotice({ text: (error as Error).message, error: true });
      setRemoving(null);
    } finally {
      // finally executes for fulfilled and rejected Promises.
      setSaving(false);
    }
  }

  // JSX expresses the UI as a function of state. Components such as the two
  // dialogs are mounted conditionally, which also controls their local state.
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol"><Receipt size={21} strokeWidth={2.1} /></div>
          <span>ledger<span className="brand-dot">.</span></span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="navigation" aria-label="Main navigation">
          <a className="active" href="#overview"><LayoutDashboard size={18} /> Overview</a>
          <a href="#expenses"><Receipt size={18} /> All expenses</a>
          <a href="#insights"><BriefcaseBusiness size={18} /> Spending insights</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={18} />
            <strong>Small by design.</strong>
            <span>Your expenses, without the clutter.</span>
          </div>
          <div className="sidebar-user">
            <span className="avatar">L</span>
            <span><strong>My workspace</strong><small>Local expense tracker</small></span>
          </div>
        </div>
      </aside>

      <main className="main" id="overview">
        <div className="topbar">
          <span className="crumb">Workspace <span>/</span> <strong>Overview</strong></span>
          <span className="top-status"><span className="status-dot" /> Saved locally</span>
        </div>
        <div className="heading-row">
          <div>
            <div className="eyebrow">YOUR FINANCIAL OVERVIEW</div>
            <h1>Every expense.<br /><em>Clearly accounted for.</em></h1>
            <p>Keep track of personal and business spending in one calm place.</p>
          </div>
          <button className="button primary new-button" onClick={() => setEditing("new")}>
            <Plus size={18} /> New expense
          </button>
        </div>

        {notice && (
          <div className={`toast ${notice.error ? "toast-error" : ""}`} role="status">
            <span>
              {notice.error ? <CircleAlert size={18} /> : <Check size={18} />}
              {" "}{notice.text}
            </span>
            <button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={15} /></button>
          </div>
        )}
        {loading && (
          <div className="loading"><RefreshCw className="spinner" size={22} /> Loading expenses…</div>
        )}
        {!loading && !data && (
          <div className="load-error">
            <CircleAlert size={24} />
            <h2>Couldn't reach the server</h2>
            <p>Start Express with <code>npm run dev:api</code>, then refresh this page.</p>
            <button className="button secondary" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {data && (
          <>
            {/* Summary values come from the server, not a second UI calculation. */}
            <section className="stats-grid" aria-label="Overview metrics">
              <div className="stat-card total-card">
                <div className="card-orbit orbit-one" />
                <div className="card-orbit orbit-two" />
                <div className="stat-label light">Total expenses <ArrowUpRight size={17} /></div>
                <strong className="total-figure">{CHF.format(data.summary.total)}</strong>
                <div className="hero-divider" />
                <div className="hero-meta">
                  <span>Across all transactions</span>
                  <span className="hero-count">{data.summary.count} entries</span>
                </div>
              </div>
              <div className="stat-card light-card">
                <div className="stat-icon neutral"><Receipt size={20} /></div>
                <div className="stat-label">Transactions</div>
                <strong className="stat-figure">{data.summary.count}</strong>
                <small>Recorded expenses</small>
              </div>
              <div className="stat-card light-card">
                <div className="stat-icon mint"><BriefcaseBusiness size={20} /></div>
                <div className="stat-label">Business expenses</div>
                <strong className="stat-figure">{CHF.format(data.summary.businessTotal)}</strong>
                <small>Work-related spending</small>
              </div>
              <div className="stat-card light-card">
                <div className="stat-icon peach"><Wallet size={20} /></div>
                <div className="stat-label">Tips included</div>
                <strong className="stat-figure">{CHF.format(data.summary.tips)}</strong>
                <small>Added gratuities</small>
              </div>
            </section>

            <div className="content-grid">
              <section className="panel expenses-panel" id="expenses">
                <div className="panel-heading">
                  <div><h2>Recent expenses</h2><p>All your transactions, in one view.</p></div>
                  <button className="button subtle" onClick={() => exportCsv(shown)}>
                    <ArrowDownToLine size={16} /> Export CSV
                  </button>
                </div>
                <div className="table-controls">
                  <div className="search-wrap">
                    <Search size={17} />
                    <input
                      aria-label="Search expenses"
                      placeholder="Search expenses…"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                    />
                  </div>
                  <div className="filter-buttons" role="group" aria-label="Expense type">
                    <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All</button>
                    <button className={filter === "consumer" ? "selected" : ""} onClick={() => setFilter("consumer")}>Personal</button>
                    <button className={filter === "business" ? "selected" : ""} onClick={() => setFilter("business")}>Business</button>
                  </div>
                  <div className="sort-wrap">
                    <select aria-label="Sort expenses" value={sort} onChange={event => setSort(event.target.value as typeof sort)}>
                      <option value="recent">Newest</option>
                      <option value="largest">Highest</option>
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </div>

                {shown.length > 0 ? (
                  <div className="table-scroll">
                    <table className="expense-table">
                      <thead>
                        <tr>
                          <th>Expense</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th className="right">Amount</th>
                          <th className="actions-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map(expense => (
                          <tr key={expense.id}>
                            <td>
                              <div className="expense-cell">
                                <span className={`category-icon cat-${expense.category.toLowerCase()}`}>
                                  {categoryIcons[expense.category]}
                                </span>
                                <span>
                                  <strong>{expense.name}</strong>
                                  <small>{expense.category}{expense.tripId ? ` · Trip #${expense.tripId}` : ""}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className={`type-tag ${expense.kind}`}>
                                {expense.kind === "business" ? "Business" : "Personal"}
                              </span>
                            </td>
                            <td className="date-cell">{readableDate(expense.date)}</td>
                            <td className="amount-cell">
                              <strong>{CHF.format(expense.amount)}</strong>
                              {expense.tip > 0 && <small>incl. {CHF.format(expense.tip)} tip</small>}
                            </td>
                            <td>
                              <div className="row-actions">
                                <button title="Add tip" aria-label={`Add tip to ${expense.name}`} onClick={() => setTipping(expense)}>
                                  <Plus size={16} />
                                </button>
                                <button title="Edit" aria-label={`Edit ${expense.name}`} onClick={() => setEditing(expense)}>
                                  <Pencil size={15} />
                                </button>
                                <button title="Delete" aria-label={`Delete ${expense.name}`} onClick={() => setRemoving(expense)}>
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Receipt size={28} />
                    <strong>No expenses found</strong>
                    <p>{expenses.length === 0 ? "Add your first expense to get started." : "Try another search or filter."}</p>
                    <button className="button secondary" onClick={() => { setSearch(""); setFilter("all"); }}>
                      Clear filters
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span>Showing {shown.length} of {expenses.length} expenses</span>
                  <span>Amounts in CHF</span>
                </div>
              </section>

              <aside className="right-column" id="insights">
                <section className="panel category-panel">
                  <div className="panel-heading">
                    <div><h2>Spending breakdown</h2><p>Where your money goes.</p></div>
                  </div>
                  {categories.length === 0 ? (
                    <p className="no-chart">Add an expense to see your spending mix.</p>
                  ) : (
                    <div className="category-bars">
                      {categories.map(({ category, total }) => (
                        <div className="category-row" key={category}>
                          <div className="category-name">
                            <span className="cat-dot" style={{ background: categoryColors[category] }} />
                            <span>{category}</span>
                            <strong>{CHF.format(total)}</strong>
                          </div>
                          <div className="bar-track">
                            <div className="bar-fill" style={{
                              width: `${(total / maxCategory) * 100}%`,
                              backgroundColor: categoryColors[category],
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="category-foot">
                    <span>Categories</span><strong>{categories.length}</strong>
                  </div>
                </section>
                <section className="tip-panel">
                  <div className="tip-icon"><Sparkles size={21} /></div>
                  <h3>Clarity in every entry.</h3>
                  <p>Separate business and personal costs, record tips, and export your spending whenever you need it.</p>
                  <button onClick={() => setEditing("new")}>
                    Add your next expense <ArrowUpRight size={16} />
                  </button>
                </section>
              </aside>
            </div>
            <footer className="footer">
              <span>ledger. <span>— made with TypeScript, React &amp; Express</span></span>
              <span>Simple by design.</span>
            </footer>
          </>
        )}
      </main>

      {/* Dialog mounting follows the current selection in React state. */}
      {editing && (
        <ExpenseModal
          original={editing === "new" ? null : editing}
          close={() => setEditing(null)}
          save={saveExpense}
        />
      )}
      {tipping && (
        <TipModal expense={tipping} close={() => setTipping(null)} save={addTip} />
      )}
      {removing && (
        <Overlay title="Delete expense" onClose={() => setRemoving(null)}>
          <div className="modal-head">
            <div>
              <span className="eyebrow">CONFIRMATION</span>
              <h2>Delete this expense?</h2>
              <p>“{removing.name}” will be permanently removed.</p>
            </div>
            <button className="icon-button" onClick={() => setRemoving(null)} aria-label="Close">
              <X size={19} />
            </button>
          </div>
          <div className="confirm-actions">
            <button className="button secondary" onClick={() => setRemoving(null)}>Keep expense</button>
            <button className="button danger" disabled={saving} onClick={deleteExpense}>
              <Trash2 size={16} /> {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
