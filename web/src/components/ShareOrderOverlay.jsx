import { MessageCircle, Phone, X } from 'lucide-react'

export default function ShareOrderOverlay({ isOpen, onClose, summaryText }) {
  if (!isOpen) return null

  const shareToViber = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
    } catch {
      // clipboard access can fail (e.g. insecure context) — opening Viber below still helps
    }
    window.open(`viber://forward?text=${encodeURIComponent(summaryText)}`, '_blank', 'noopener,noreferrer')
  }

  const shareToMessenger = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
    } catch {
      // clipboard access can fail (e.g. insecure context) — opening Messenger below still helps
    }
    window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-accent p-6 text-center shadow-xl"
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

        <h3 className="text-lg font-bold text-black">Share Order</h3>
        <p className="mt-1 text-sm text-gray-600">Copies the order summary and opens the app.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={shareToViber}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#7C6FE0] px-3 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Phone size={18} />
            Viber
          </button>
          <button
            type="button"
            onClick={shareToMessenger}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#2196F3] px-3 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle size={18} />
            Messenger
          </button>
        </div>
      </div>
    </div>
  )
}
