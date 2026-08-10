import { useState } from 'react'
import { Check, Filter } from 'lucide-react'
import { SORT_OPTIONS } from './SortSelect.jsx'

export default function FilterMenu({ label, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 text-sm font-semibold text-black"
      >
        <Filter size={18} />
        {label}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {option.label}
                {value === option.value && <Check size={14} className="text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
