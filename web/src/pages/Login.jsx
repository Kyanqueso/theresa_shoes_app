import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PinPad from '../components/PinPad.jsx'
import ForgotPinOverlay from '../components/ForgotPinOverlay.jsx'
import { isDeviceRecognized, verifyPin } from '../lib/auth.js'
import { isDemoMode } from '../lib/demoMode.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isForgotOpen, setIsForgotOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    isDeviceRecognized().then((ok) => {
      if (cancelled) return
      if (!ok) {
        navigate('/403', { replace: true })
        return
      }
      setIsChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleSuccess = () => {
    navigate(location.state?.from?.pathname ?? '/admin', { replace: true })
  }

  if (isChecking) return null

  return (
    <section className="flex flex-col items-center px-6 py-20 text-center">
      {isDemoMode && (
        <p className="mb-6 max-w-xs rounded-lg bg-golden-brown/10 px-4 py-3 text-sm font-semibold text-golden-brown">
          Demo mode: enter any 4 digits — no real PIN needed.
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
