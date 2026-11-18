import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronDown, CircleAlert, X } from "lucide-react";
import {
  CATEGORIES,
  type Category,
  type ExpenseDTO,
  type ExpenseDraft,
  type ExpenseKind,
} from "../../src/contracts";
import { CHF, today } from "./ui";

/**
 * Controlled HTML inputs produce strings, even when type="number" is used.
 * Keeping the form's intermediate representation separate from ExpenseDraft
 * allows temporarily empty fields without weakening the API's number types.
 */
interface DraftForm {
  kind: ExpenseKind;
  name: string;
  category: Category;
  date: string;
  amount: string;
  tip: string;
  tripId: string;
}

function emptyDraft(): DraftForm {
  return {
    kind: "consumer",
    name: "",
    category: "Food",
    date: today(),
    amount: "",
    tip: "0",
    tripId: "",
  };
}

/** DTO.amount includes its tip; the edit form displays the base amount. */
function toForm(expense: ExpenseDTO): DraftForm {
  return {
    kind: expense.kind,
    name: expense.name,
    category: expense.category,
    date: expense.date,
    amount: (Math.round((expense.amount - expense.tip) * 100) / 100).toString(),
    tip: expense.tip.toString(),
    tripId: expense.tripId?.toString() ?? "",
  };
}

/** Convert the input representation into an API request object. */
function toDraft(form: DraftForm): ExpenseDraft {
  return {
    kind: form.kind,
    name: form.name.trim(),
    category: form.category,
    date: form.date,
    amount: Number(form.amount),
    tip: Number(form.tip || 0),
    ...(form.kind === "business" ? { tripId: Number(form.tripId) } : {}),
  };
}

interface OverlayProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Shared dialog backdrop; the effect subscribes to and cleans up Escape. */
export function Overlay({ title, onClose, children }: OverlayProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </section>
    </div>
  );
}

interface ExpenseModalProps {
  original: ExpenseDTO | null;
  close: () => void;
  save: (data: ExpenseDraft) => Promise<void>;
}

/**
 * The modal owns only the form state. Its parent supplies a save operation,
 * which may create or replace an expense. Promise<void> describes completion
 * of that operation without binding the component to HTTP implementation details.
 */
export function ExpenseModal({ original, close, save }: ExpenseModalProps) {
  const [form, setForm] = useState<DraftForm>(() => original ? toForm(original) : emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The type parameter K couples each field name with its corresponding value
  // type. This avoids a generic stringly typed form updater.
  function update<K extends keyof DraftForm>(key: K, value: DraftForm[K]): void {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); // React, rather than a browser navigation, handles submission.
    setError("");

    if (!form.name.trim() || !(Number(form.amount) > 0)) {
      setError("Enter a description and a positive amount.");
      return;
    }
    if (form.kind === "business" &&
      (!Number.isSafeInteger(Number(form.tripId)) || Number(form.tripId) <= 0)) {
      setError("Enter a positive, whole-number trip ID.");
      return;
    }

    setBusy(true);
    try {
      // Await the server operation before closing the dialog. On rejection,
      // the form remains open and presents the error returned by the API.
      await save(toDraft(form));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false); // Executes whether the Promise fulfils or rejects.
    }
  }

  return (
    <Overlay title={original ? "Edit expense" : "New expense"} onClose={close}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">YOUR EXPENSES</span>
          <h2>{original ? "Edit expense" : "Add an expense"}</h2>
          <p>Keep the details simple and clear.</p>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button>
      </div>

      <form className="expense-form" onSubmit={submit}>
        <div className="field">
          <span className="form-field-label">Expense type</span>
          <div className="segmented" role="group" aria-label="Expense type">
            <button
              type="button"
              className={form.kind === "consumer" ? "selected" : ""}
              onClick={() => update("kind", "consumer")}
            >Personal</button>
            <button
              type="button"
              className={form.kind === "business" ? "selected" : ""}
              onClick={() => update("kind", "business")}
            >Business</button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="expense-name">Description</label>
          <input
            id="expense-name" maxLength={80} required autoFocus
            placeholder="e.g. Lunch with team"
            value={form.name}
            onChange={event => update("name", event.target.value)}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="expense-amount">Base amount (CHF)</label>
            <input
              id="expense-amount" type="number" min="0.01" max="999999"
              step="0.01" required placeholder="0.00"
              value={form.amount}
              onChange={event => update("amount", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="expense-tip">Tip (CHF)</label>
            <input
              id="expense-tip" type="number" min="0" max="999999"
              step="0.01" required
              value={form.tip}
              onChange={event => update("tip", event.target.value)}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="expense-category">Category</label>
            <span className="select-wrap">
              <select
                id="expense-category"
                value={form.category}
                onChange={event => update("category", event.target.value as Category)}
              >
                {CATEGORIES.map(category => <option key={category}>{category}</option>)}
              </select>
              <ChevronDown size={15} />
            </span>
          </div>
          <div className="field">
            <label htmlFor="expense-date">Date</label>
            <input
              id="expense-date" type="date" required value={form.date}
              onChange={event => update("date", event.target.value)}
            />
          </div>
        </div>

        {form.kind === "business" && (
          <div className="field">
            <label htmlFor="expense-trip">Business trip ID</label>
            <input
              id="expense-trip" type="number" min="1" step="1" required
              placeholder="e.g. 2042" value={form.tripId}
              onChange={event => update("tripId", event.target.value)}
            />
          </div>
        )}
        {error && <div className="inline-error"><CircleAlert size={16} /> {error}</div>}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={close}>Cancel</button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : original ? "Save changes" : "Add expense"} <Check size={16} />
          </button>
        </div>
      </form>
    </Overlay>
  );
}

interface TipModalProps {
  expense: ExpenseDTO;
  close: () => void;
  save: (tip: number) => Promise<void>;
}

/** A PATCH request adds a tip without replacing the rest of the expense. */
export function TipModal({ expense, close, save }: TipModalProps) {
  const [tip, setTip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!(Number(tip) > 0)) {
      setError("Enter a positive tip.");
      return;
    }
    setBusy(true);
    try {
      await save(Number(tip));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay title="Add a tip" onClose={close}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">ADD TIP</span>
          <h2>{expense.name}</h2>
          <p>Current tip: {CHF.format(expense.tip)}</p>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close"><X size={19} /></button>
      </div>
      <form className="expense-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="tip-value">Additional tip (CHF)</label>
          <input
            id="tip-value" autoFocus type="number" min="0.01" max="999999"
            step="0.01" required value={tip} placeholder="0.00"
            onChange={event => setTip(event.target.value)}
          />
        </div>
        {error && <div className="inline-error"><CircleAlert size={16} /> {error}</div>}
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={close}>Cancel</button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Add tip"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
