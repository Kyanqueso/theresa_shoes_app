import { useState } from 'react'
import { Delete } from 'lucide-react'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function PinInput({ length = 4, onComplete, onChange, disabled = false }) {
  const [pin, setPin] = useState('')

  const update = (next) => {
    setPin(next)
    onChange?.(next)
    if (next.length === length) onComplete?.(next)
  }

  const handleDigit = (digit) => {
    if (disabled || pin.length >= length) return
    update(pin + digit)
  }

  const handleBackspace = () => {
    if (disabled) return
    update(pin.slice(0, -1))
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3">
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            className={`h-3 w-3 rounded-full border-2 border-primary ${
              index < pin.length ? 'bg-primary' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-accent p-8">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-xl font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            {digit}
          </button>
        ))}

        <span />

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-xl font-bold text-primary transition-colors hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleBackspace}
          aria-label="Delete last digit"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  )
}
