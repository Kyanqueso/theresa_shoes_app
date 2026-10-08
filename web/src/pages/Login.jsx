import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad.jsx'
import ForgotPinOverlay from '../components/ForgotPinOverlay.jsx'
import DeviceSetup from '../components/DeviceSetup.jsx'
import { isDeviceRecognized, verifyPin } from '../lib/auth.js'
import { isDemoMode } from '../lib/demoMode.js'

/** The one door into the admin, for both kinds of visitor.
 *
 * A device the shop has added gets the PIN pad. One it hasn't gets the pairing steps right
 * here, instead of being bounced to a 403 with a link on it — the person holding a new tablet
 * can't be expected to notice a link, let alone be told a URL. Nothing is unlocked by the
 * swap: pairing still needs a live code read out from a device that already works, and the
 * PIN still stands between a paired device and any order.
 */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('checking') // checking | pin | setup
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  // Bumped once pairing finishes, to re-ask the server who this device is now.
  const [deviceCheck, setDeviceCheck] = useState(0)

  useEffect(() => {
    let cancelled = false
    isDeviceRecognized().then((ok) => {
      if (!cancelled) setMode(ok ? 'pin' : 'setup')
    })
    return () => {
      cancelled = true
    }
  }, [deviceCheck])

  const handleSuccess = () => {
    navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
  }

  if (mode === 'checking') return null

  if (mode === 'setup') {
    return (
      <section className="flex flex-col items-center px-6 py-16">
        <DeviceSetup onPaired={() => setDeviceCheck((count) => count + 1)} />
      </section>
    )
  }

  return (
    <section className="flex flex-col items-center px-6 py-20 text-center">
      {isDemoMode && (
        <p className="mb-6 max-w-xs rounded-lg bg-golden-brown/10 px-4 py-3 text-sm font-semibold text-golden-brown">
          Demo mode: enter any 4 digits — no real PIN needed.
        </p>
      )}
      {deviceCheck > 0 && (
        <p className="mb-6 max-w-xs rounded-lg bg-success/15 px-4 py-3 text-sm font-semibold text-success">
          This device is set up. Enter the PIN you just chose.
        </p>
      )}
      <PinPad onSubmit={verifyPin} onSuccess={handleSuccess} />

      <button
        type="button"
        onClick={() => setIsForgotOpen(true)}
        className="mt-8 text-sm font-semibold text-primary underline underline-offset-4"
      >
        Forgot Pin?
      </button>

      <ForgotPinOverlay isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} />
    </section>
  )
}
