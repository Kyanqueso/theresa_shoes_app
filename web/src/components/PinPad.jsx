import { useState } from 'react'
import { Check, Lock, X } from 'lucide-react'
import PinInput from './PinInput.jsx'

const VERIFY_DELAY_MS = 2000
const SUCCESS_HOLD_MS = 900
const ERROR_HOLD_MS = 1400

const STATUS_CONFIG = {
  idle: { icon: Lock, iconClass: 'bg-primary', heading: 'Enter your PIN' },
  verifying: { icon: Lock, iconClass: 'bg-primary', heading: 'Verifying…' },
  success: { icon: Check, iconClass: 'bg-success', heading: 'Verified!' },
  error: { icon: X, iconClass: 'bg-danger', heading: 'Wrong PIN!' },
}

export default function PinPad({ onSubmit, onSuccess }) {
  const [status, setStatus] = useState('idle')
  const [resetKey, setResetKey] = useState(0)

  const handleComplete = async (pin) => {
    setStatus('verifying')

    try {
      await Promise.all([onSubmit(pin), new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS))])
      setStatus('success')
      setTimeout(() => onSuccess?.(), SUCCESS_HOLD_MS)
    } catch {
      setStatus('error')
      setTimeout(() => {
        setStatus('idle')
        setResetKey((key) => key + 1)
      }, ERROR_HOLD_MS)
    }
  }

  const { icon: Icon, iconClass, heading } = STATUS_CONFIG[status]

  return (
    <>
      <div
        className={`flex aspect-square h-16 w-16 shrink-0 items-center justify-center rounded-full text-white transition-colors ${iconClass}`}
      >
        <Icon size={26} />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-black">{heading}</h2>

      <div className="mt-4">
        <PinInput key={resetKey} length={4} onComplete={handleComplete} disabled={status !== 'idle'} />
      </div>
    </>
  )
}
