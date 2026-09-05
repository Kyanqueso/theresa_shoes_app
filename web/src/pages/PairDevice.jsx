import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, KeyRound, ShieldCheck } from 'lucide-react'
import PinInput from '../components/PinInput.jsx'
import { claimPairingCode } from '../lib/devicesApi.js'
import { errorDetail } from '../lib/apiClient.js'
import { sanitizeText } from '../lib/textInput.js'

const CODE_LENGTH = 6
const PIN_LENGTH = 4

/** Where an unrecognised browser joins the device allowlist.
 *
 * Two steps: redeem the pairing code, then choose this device's own PIN. The PIN is sent
 * together with the claim — a device that has just paired holds no session yet, so it could
 * not reach any authenticated "set your PIN" endpoint afterwards.
 *
 * Reuses the login keypad so the interaction is already familiar: big targets, no keyboard. */
export default function PairDevice() {
  const navigate = useNavigate()
  const [step, setStep] = useState('code') // code | pin | done
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  const handleCodeComplete = (value) => {
    setCode(value)
    setError(null)
    setStep('pin')
  }

  const handlePinComplete = async (pin) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await claimPairingCode(code, label, pin)
      setStep('done')
      setTimeout(() => navigate('/login', { replace: true }), 1400)
    } catch (err) {
      setError(errorDetail(err, 'Could not pair this device. Please try again.'))
      // A rejected code has to be re-entered — it may have expired or been used already.
      setStep('code')
      setCode('')
      setResetKey((key) => key + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
          <Check size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-black">Device paired!</h1>
        <p className="mt-2 max-w-xs text-sm text-gray-600">
          Remember your PIN — it belongs to this device only.
        </p>
      </div>
    )
  }

  const onPin = step === 'pin'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 py-12 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${
          onPin ? 'bg-golden-brown' : 'bg-primary'
        }`}
      >
        {onPin ? <KeyRound size={30} /> : <ShieldCheck size={30} />}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Step {onPin ? '2' : '1'} of 2
      </p>

      {onPin ? (
        <>
          <h1 className="mt-2 text-2xl font-bold text-black">Choose a PIN</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            Pick 4 digits for this device. Each device has its own PIN — changing it here
            won&apos;t affect any other device.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-bold text-black">Pair this device</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            On a device that&apos;s already set up, go to <span className="font-semibold">Devices</span> and
            tap <span className="font-semibold">Add Device</span>. Enter the {CODE_LENGTH}-digit code it shows.
          </p>
        </>
      )}

      {!onPin && (
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
      )}

      {error && <p className="mt-5 max-w-xs text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-6">
        {onPin ? (
          <PinInput key={`pin-${resetKey}`} length={PIN_LENGTH} onComplete={handlePinComplete} disabled={isSubmitting} />
        ) : (
          <PinInput key={`code-${resetKey}`} length={CODE_LENGTH} onComplete={handleCodeComplete} disabled={isSubmitting} />
        )}
      </div>

      {isSubmitting && <p className="mt-4 text-sm text-gray-600">Pairing…</p>}

      {onPin && !isSubmitting && (
        <button
          type="button"
          onClick={() => { setStep('code'); setCode(''); setResetKey((k) => k + 1) }}
          className="mt-6 text-sm font-semibold text-primary underline underline-offset-4"
        >
          Back
        </button>
      )}
    </div>
  )
}
