import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ShieldCheck } from 'lucide-react'
import PinInput from '../components/PinInput.jsx'
import { claimPairingCode } from '../lib/devicesApi.js'
import { errorDetail } from '../lib/apiClient.js'
import { sanitizeText } from '../lib/textInput.js'

const CODE_LENGTH = 6

/** Where an unrecognised browser goes to join the device allowlist. Reuses the same PinInput
 * keypad as the login screen so the interaction is already familiar — big targets, no
 * keyboard, and it matches how the PIN is entered. */
export default function PairDevice() {
  const navigate = useNavigate()
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success
  const [error, setError] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  const handleComplete = async (code) => {
    setStatus('submitting')
    setError(null)
    try {
      await claimPairingCode(code, label)
      setStatus('success')
      // Give the confirmation a beat to register before moving on.
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(errorDetail(err, 'Could not pair this device. Please try again.'))
      setStatus('idle')
      setResetKey((key) => key + 1)
    }
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
          <Check size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-black">Device paired!</h1>
        <p className="mt-2 text-sm text-gray-600">Taking you to the PIN screen…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
        <ShieldCheck size={30} />
      </div>

      <h1 className="mt-6 text-2xl font-bold text-black">Pair this device</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-600">
        On a device that&apos;s already set up, go to <span className="font-semibold">Devices</span> and tap
        <span className="font-semibold"> Add Device</span>. Enter the {CODE_LENGTH}-digit code it shows you.
      </p>

      <div className="mt-6 w-full max-w-xs">
        <label className="text-sm font-semibold text-black">Name this device (optional)</label>
        <input
          type="text"
          value={label}
          maxLength={50}
          onChange={(event) => setLabel(sanitizeText(event.target.value))}
          placeholder="e.g. Shop iPad"
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="mt-5 max-w-xs text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-6">
        <PinInput
          key={resetKey}
          length={CODE_LENGTH}
          onComplete={handleComplete}
          disabled={status === 'submitting'}
        />
      </div>

      {status === 'submitting' && <p className="mt-4 text-sm text-gray-600">Pairing…</p>}
    </div>
  )
}
