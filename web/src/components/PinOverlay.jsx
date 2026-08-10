import { X } from 'lucide-react'
import PinPad from './PinPad.jsx'

export default function PinOverlay({ isOpen, onClose, onSubmit, onSuccess }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-sm flex-col items-center overflow-y-auto rounded-2xl bg-white p-8 text-center shadow-xl"
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

        <PinPad onSubmit={onSubmit} onSuccess={onSuccess} />
      </div>
    </div>
  )
}
