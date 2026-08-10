import { X } from 'lucide-react'
import NotesBlockList from './NotesBlockList.jsx'

export default function NotesViewOverlay({ isOpen, onClose, blocks }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-black">Notes</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>
        <div className="mt-4 rounded-lg bg-white p-3">
          <NotesBlockList blocks={blocks} />
        </div>
      </div>
    </div>
  )
}
