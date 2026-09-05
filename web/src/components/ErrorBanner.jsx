import { AlertTriangle, X } from 'lucide-react'

/** Dismissible error strip shown *above* a table rather than in place of it.
 *
 * A failed save is not a reason to hide the data — the previous behaviour swapped the whole
 * table for an error string, so the rows being edited vanished and the only way back was a
 * page reload. This keeps the table on screen and lets the message be dismissed.
 *
 * Reserved for recoverable action failures. A failed *load* still replaces the table, because
 * in that case there genuinely is nothing to show.
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null

  return (
    <div className="mt-4 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" />
      <p className="flex-1 text-sm font-medium text-danger">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded p-0.5 text-danger/70 transition-colors hover:text-danger"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
