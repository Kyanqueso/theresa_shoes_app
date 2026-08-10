import { useState } from 'react'
import { X } from 'lucide-react'

export default function TransferOrderOverlay({ isOpen, onClose, companies, currentCompanyId, onConfirm, isSubmitting }) {
  const [selected, setSelected] = useState('')

  if (!isOpen) return null

  const options = companies.filter((company) => company.id !== currentCompanyId)

  const handleClose = () => {
    setSelected('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">Transfer Order</h3>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Move this order to a different company.</p>

        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select a company…</option>
          {options.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || isSubmitting}
            onClick={() => onConfirm(selected)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}
