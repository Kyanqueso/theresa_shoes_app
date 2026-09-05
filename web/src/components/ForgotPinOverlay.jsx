import { useState } from 'react'
import { X } from 'lucide-react'
import PinInput from './PinInput.jsx'
import { confirmPinReset, requestPinReset, verifyPinResetOtp } from '../lib/auth.js'
import { ApiError } from '../lib/apiClient.js'

// Must match the OTP length configured in Supabase (Authentication -> Email provider).
// Supabase allows 6-10; ours is 8. If you change it there, change it here or the keypad
// submits a truncated code and every verification fails.
const OTP_LENGTH = 8
const PIN_LENGTH = 4

function detailOf(err, fallback) {
  return err instanceof ApiError && typeof err.detail === 'string' ? err.detail : fallback
}

function Banner({ banner }) {
  if (!banner) return null
  const classes = banner.type === 'success' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
  return <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${classes}`}>{banner.message}</div>
}

export default function ForgotPinOverlay({ isOpen, onClose }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [banner, setBanner] = useState(null)
  const [otpResetKey, setOtpResetKey] = useState(0)
  const [pinDraft, setPinDraft] = useState('')
  const [pinResetKey, setPinResetKey] = useState(0)

  const reset = () => {
    setStep('email')
    setEmail('')
    setResetToken(null)
    setIsSubmitting(false)
    setBanner(null)
    setPinDraft('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      await requestPinReset(email.trim())
      setBanner(null)
      setStep('otp')
    } catch (err) {
      setBanner({ type: 'error', message: detailOf(err, 'Could not send the code. Please try again.') })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOtpComplete = async (otp) => {
    setIsSubmitting(true)
    try {
      const { reset_token } = await verifyPinResetOtp(email.trim(), otp)
      setResetToken(reset_token)
      setBanner({ type: 'success', message: 'Verified! Set your new PIN.' })
      setStep('set-pin')
    } catch {
      setBanner({ type: 'error', message: 'OTP has expired or is invalid. Please try again.' })
      setOtpResetKey((key) => key + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmChanges = async () => {
    if (pinDraft.length !== PIN_LENGTH) return
    setIsSubmitting(true)
    try {
      await confirmPinReset(resetToken, pinDraft)
      handleClose()
    } catch (err) {
      setBanner({ type: 'error', message: detailOf(err, 'Could not update your PIN. Please try again.') })
      setPinDraft('')
      setPinResetKey((key) => key + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={handleClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h2 className="text-lg font-bold text-black">Reset PIN</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <div className="pt-5">
          <Banner banner={banner} />

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="flex flex-col items-center text-center">
              <p className="text-sm text-gray-600">Enter the email linked to your admin account.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold text-black">Enter {OTP_LENGTH}-digit OTP</h3>
              <div className="mt-4">
                <PinInput key={otpResetKey} length={OTP_LENGTH} onComplete={handleOtpComplete} disabled={isSubmitting} />
              </div>
            </div>
          )}

          {step === 'set-pin' && (
            <div className="flex flex-col items-center text-center">
              <h3 className="text-xl font-bold text-black">Set New PIN</h3>
              <div className="mt-4">
                <PinInput key={pinResetKey} length={PIN_LENGTH} onChange={setPinDraft} disabled={isSubmitting} />
              </div>
              <button
                type="button"
                onClick={handleConfirmChanges}
                disabled={isSubmitting || pinDraft.length !== PIN_LENGTH}
                className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Confirm Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
