import { X } from 'lucide-react'

export default function ImagePreviewOverlay({ isOpen, onClose, title, imageUrl }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-black/10 px-6 py-4 text-center">
          <h3 className="text-lg font-bold text-black">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
          >
            <X size={20} />
          </button>
        </div>

        <img src={imageUrl} alt={title} className="max-h-96 w-full object-cover" />

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Ok
        </button>
      </div>
    </div>
  )
}
