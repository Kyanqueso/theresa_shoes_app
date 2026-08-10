import { useState } from 'react'
import { X } from 'lucide-react'

export default function ConfirmButton({
  label,
  icon: Icon,
  iconSize = 16,
  ariaLabel,
  question,
  onConfirm,
  triggerClassName,
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={ariaLabel ?? (label || undefined)}
        className={triggerClassName}
      >
        {Icon && <Icon size={iconSize} />}
        {label}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-8 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-black">{question}</h2>

            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-danger px-8 py-2 font-semibold text-white transition-opacity hover:opacity-90"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onConfirm()
                }}
                className="rounded-lg bg-success px-8 py-2 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
