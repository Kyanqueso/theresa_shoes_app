import { AlertTriangle, X } from 'lucide-react'

export default function CloseMatchCompanyOverlay({ isOpen, newName, existingName, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-accent p-8 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-golden-brown text-white">
          <AlertTriangle size={24} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-black">
          Add New Company
          <br />
          {newName}?
        </h2>

        <p className="mt-3 text-sm text-gray-600">
          This closely matches an existing company: <span className="font-semibold text-black">&quot;{existingName}&quot;</span>.
          Make sure this isn&apos;t a typo before continuing.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-neutral-900 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Yes, Create Company and Add Order
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
