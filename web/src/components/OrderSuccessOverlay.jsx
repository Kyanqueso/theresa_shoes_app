import { Check, MessageCircle, Phone, X } from 'lucide-react'

export default function OrderSuccessOverlay({ isOpen, onClose, companyName, onMessengerShare }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-8 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
          <Check size={32} />
        </div>

        <h2 className="mt-4 text-xl font-bold uppercase text-black">
          {companyName ? `Order Added to ${companyName}!` : 'Order Added!'}
        </h2>

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-300" />
          <span className="text-xs text-gray-500">Share Order Summary</span>
          <span className="h-px flex-1 bg-gray-300" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg bg-[#7C6FE0] px-2 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Phone size={16} />
            Andrea&apos;s Viber
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-lg bg-primary px-2 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Phone size={16} />
            Owner&apos;s Viber
          </button>
          <button
            type="button"
            onClick={onMessengerShare}
            className="flex flex-col items-center gap-1 rounded-lg bg-[#2196F3] px-2 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle size={16} />
            Messenger
          </button>
        </div>
      </div>
    </div>
  )
}
