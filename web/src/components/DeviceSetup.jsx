import { useEffect, useState } from 'react'
import { Check, KeyRound, ShieldCheck, ShieldQuestion } from 'lucide-react'
import PinInput from './PinInput.jsx'
import FieldLabel from './FieldLabel.jsx'
import { claimPairingCode, isPairingOpen } from '../lib/devicesApi.js'
import { errorDetail } from '../lib/apiClient.js'
import { sanitizeText } from '../lib/textInput.js'

const CODE_LENGTH = 6
const PIN_LENGTH = 4

/** How a browser the shop doesn't know yet joins the device allowlist.
 *
 * This is what the admin PIN screen becomes on an unrecognised device, so nobody has to be
 * told a URL or notice a link — the person is handed the tablet, taps where they always tap,
 * and the screen asks for the code the shop is reading out to them. Two steps, both on the
 * same keypad as the PIN: redeem the code, then choose this device's own PIN. The PIN travels
 * with the claim because a device that has only just paired holds no session yet, so it could
 * not reach an authenticated "set your PIN" endpoint afterwards.
 *
 * The keypad only appears while a code is actually live. Outside that ten-minute window there
 * is nothing to type, so a stranger who finds the admin screen is told to ask the shop rather
 * than shown a keypad — the code itself was always the gate, this just stops advertising it.
 * "I have a code" is there for the case where the check is wrong or a code is issued a moment
 * later; it opens the keypad, which still refuses anything but a live code.
 */
export default function DeviceSetup({ onPaired }) {
  // checking -> (closed | code) -> pin -> done
  const [step, setStep] = useState('checking')
  const [label, setLabel] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    isPairingOpen().then((open) => {
      if (!cancelled) setStep(open ? 'code' : 'closed')
    })
    return () => {
      cancelled = true
    }
  }, [])

  const restartCodeEntry = () => {
    setStep('code')
    setCode('')
    setResetKey((key) => key + 1)
  }

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
      // Long enough to read, short enough not to feel stuck. The PIN pad comes next: pairing
      // proves the device may be here, the PIN proves who is holding it.
      setTimeout(onPaired, 1600)
    } catch (err) {
      setError(errorDetail(err, 'Could not pair this device. Please try again.'))
      // A rejected code has to be re-entered — it may have expired or been used already.
      restartCodeEntry()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'checking') return null

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
          <Check size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-black">Device paired!</h1>
        <p className="mt-2 max-w-xs text-sm text-gray-600">
          Now enter the PIN you just chose. It belongs to this device only.
        </p>
      </div>
    )
  }

  if (step === 'closed') {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-golden-brown/15 text-golden-brown">
          <ShieldQuestion size={30} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-black">This device isn&apos;t set up yet</h1>
        <p className="mt-3 max-w-sm text-sm text-gray-600">
          Only devices the shop has added can open the admin. Ask the owner to go to{' '}
          <span className="font-semibold">Devices</span> on a device that already works and tap{' '}
          <span className="font-semibold">Add Device</span> — then come back here.
        </p>
        <button
          type="button"
          onClick={restartCodeEntry}
          className="mt-8 text-sm font-semibold text-primary underline underline-offset-4"
        >
          I have a code
        </button>
      </div>
    )
  }

  const onPin = step === 'pin'

  return (
    <div className="flex flex-col items-center text-center">
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
          <h1 className="mt-2 text-2xl font-bold text-black">Set up this device</h1>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            Enter the {CODE_LENGTH}-digit code showing on the shop&apos;s device.
          </p>
        </>
      )}

      {!onPin && (
        <div className="mt-6 w-full max-w-xs text-left">
          <FieldLabel optional hint="Shows in the Devices list, e.g. Shop iPad.">Name this device</FieldLabel>
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
          onClick={restartCodeEntry}
          className="mt-6 text-sm font-semibold text-primary underline underline-offset-4"
        >
          Back
        </button>
      )}
    </div>
  )
}
