import { useEffect, useState } from 'react'
import { Ban, CheckCircle2, KeyRound, Plus, Smartphone, Trash2 } from 'lucide-react'
import EmptyState from '../../components/EmptyState.jsx'
import ConfirmButton from '../../components/ConfirmButton.jsx'
import LoadingSpinner from '../../components/LoadingSpinner.jsx'
import Modal from '../../components/manage/Modal.jsx'
import { deleteDevice, issuePairingCode, listDevices, updateDevice } from '../../lib/devicesApi.js'
import PinInput from '../../components/PinInput.jsx'
import { setDevicePin } from '../../lib/auth.js'
import { errorDetail, hasPairedDevice } from '../../lib/apiClient.js'

function formatDate(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** Presentational — the parent fetches the code in its click handler, so nothing here has to
 * kick off work from an effect. The only effect is the ticking clock, and it just advances
 * `now`; the remaining time is derived during render rather than stored in state. */
function PairingCodeModal({ isOpen, onClose, code, expiresAt, error, isLoading }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isOpen || !expiresAt) return undefined
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isOpen, expiresAt])

  const secondsLeft = expiresAt ? Math.max(0, Math.round((new Date(expiresAt) - now) / 1000)) : 0
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Device">
      <div className="text-center">
        {isLoading ? (
          <p className="py-8 text-sm text-gray-600">Creating code…</p>
        ) : error ? (
          <p className="py-8 text-sm font-semibold text-danger">{error}</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              On the new device, open the site and enter this code when it asks you to pair.
            </p>
            <p className="my-6 font-mono text-4xl font-bold tracking-[0.3em] text-primary">{code}</p>
            {secondsLeft > 0 ? (
              <p className="text-xs text-gray-500">
                Expires in {minutes}:{seconds}
              </p>
            ) : (
              <p className="text-xs font-semibold text-danger">This code has expired — close and try again.</p>
            )}
            <p className="mt-4 text-xs text-gray-400">
              The code works once. Creating a new one cancels any previous code.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Changes the PIN of the device you're sitting at. The current PIN is asked for again even
 * though a session is already open — otherwise anyone who found an unlocked screen could
 * lock the real owner out of their own device. */
function ChangePinModal({ isOpen, onClose }) {
  const [stage, setStage] = useState('current') // current | next | done
  const [currentPin, setCurrentPin] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const restart = () => {
    setStage('current')
    setCurrentPin('')
    setError(null)
    setResetKey((k) => k + 1)
  }

  const handleCurrent = (pin) => {
    setCurrentPin(pin)
    setError(null)
    setStage('next')
    setResetKey((k) => k + 1)
  }

  const handleNext = async (pin) => {
    setIsSaving(true)
    setError(null)
    try {
      await setDevicePin(currentPin, pin)
      setStage('done')
    } catch (err) {
      setError(errorDetail(err, 'Could not change the PIN. Please try again.'))
      restart()
    } finally {
      setIsSaving(false)
    }
  }

  const close = () => {
    restart()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Change this device's PIN">
      <div className="flex flex-col items-center text-center">
        {stage === 'done' ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
              <CheckCircle2 size={24} />
            </div>
            <p className="mt-4 text-sm font-semibold text-black">PIN updated for this device.</p>
            <button
              type="button"
              onClick={close}
              className="mt-5 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {stage === 'current' ? 'Enter your current PIN.' : 'Enter the new 4-digit PIN.'}
            </p>
            {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
            <div className="mt-4">
              <PinInput
                key={`${stage}-${resetKey}`}
                length={4}
                onComplete={stage === 'current' ? handleCurrent : handleNext}
                disabled={isSaving}
              />
            </div>
            {isSaving && <p className="mt-3 text-sm text-gray-600">Saving…</p>}
          </>
        )}
      </div>
    </Modal>
  )
}

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [pairing, setPairing] = useState({ code: null, expiresAt: null, error: null, isLoading: false })
  const [isChangingPin, setIsChangingPin] = useState(false)

  const refresh = (isCancelled = () => false) => {
    listDevices()
      .then((data) => {
        if (isCancelled()) return
        setDevices(data)
        setLoadError(null)
      })
      .catch((err) => {
        if (!isCancelled()) setLoadError(errorDetail(err, 'Could not load devices right now.'))
      })
      .finally(() => {
        if (!isCancelled()) setIsLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    refresh(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  // Fetching here rather than in the modal's effect: the modal only ever opens from this
  // click, so there's nothing an effect would add beyond an extra render cycle.
  const handleAddDevice = async () => {
    setIsAdding(true)
    setPairing({ code: null, expiresAt: null, error: null, isLoading: true })
    try {
      const data = await issuePairingCode()
      setPairing({ code: data.code, expiresAt: data.expires_at, error: null, isLoading: false })
    } catch (err) {
      setPairing({
        code: null,
        expiresAt: null,
        error: errorDetail(err, 'Could not create a pairing code.'),
        isLoading: false,
      })
    }
  }

  const handleToggle = async (device) => {
    try {
      await updateDevice(device.id, { is_active: !device.is_active })
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not update that device.'))
    }
  }

  const handleDelete = async (device) => {
    try {
      await deleteDevice(device.id)
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not remove that device.'))
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-black">Devices</h1>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsChangingPin(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-black"
          >
            <KeyRound size={16} />
            Change my PIN
          </button>
          <button
            type="button"
            onClick={handleAddDevice}
            className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Add Device
          </button>
        </div>
      </div>

      <p className="mt-2 max-w-2xl text-sm text-gray-600">
        Only devices on this list can reach the admin PIN screen, and each one has its own PIN.
        Blocking a device cuts it off without changing anyone else&apos;s PIN.
      </p>

      {!hasPairedDevice() && (
        <div className="mt-4 rounded-lg bg-golden-brown/10 px-4 py-3 text-sm text-golden-brown">
          <span className="font-semibold">This browser hasn&apos;t paired yet.</span> It&apos;s still using the
          old shared token that ships in the site itself. Pair your real devices, then remove{' '}
          <code className="font-mono">VITE_DEVICE_ID</code> from Vercel so the list can actually turn
          strangers away.
        </div>
      )}

      {loadError && <p className="mt-4 text-sm font-semibold text-danger">{loadError}</p>}

      <div className="mt-6">
        {isLoading ? (
          <LoadingSpinner label="Loading Devices..." />
        ) : devices.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No devices yet"
            message="Add a device to let it reach the admin panel."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => {
              // Flagged by the server — tokens are never sent to the browser.
              const isThisDevice = device.is_current
              return (
                <div key={device.id} className="rounded-xl bg-accent p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-black">
                        {device.label || 'Unnamed device'}
                        {isThisDevice && (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            THIS DEVICE
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">Added {formatDate(device.created_at)}</p>
                      <p className="text-xs text-gray-500">Last seen {formatDate(device.last_seen_at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          device.is_active ? 'bg-success/20 text-success' : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {device.is_active ? 'Active' : 'Blocked'}
                      </span>
                      {!device.has_own_pin && (
                        <span
                          title="Paired before per-device PINs existed — still uses the old shared PIN."
                          className="rounded-full bg-golden-brown/15 px-2.5 py-1 text-[10px] font-semibold text-golden-brown"
                        >
                          SHARED PIN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {!isThisDevice && (
                    <ConfirmButton
                      label={device.is_active ? 'Block' : 'Allow'}
                      icon={device.is_active ? Ban : CheckCircle2}
                      iconSize={14}
                      question={
                        device.is_active
                          ? `Block "${device.label || 'this device'}"? It will be locked out immediately.`
                          : `Allow "${device.label || 'this device'}" back in?`
                      }
                      onConfirm={() => handleToggle(device)}
                      triggerClassName="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2 text-xs font-semibold text-gray-700 transition-colors hover:text-black"
                    />
                    )}
                    {!isThisDevice && (
                      <ConfirmButton
                        label=""
                        icon={Trash2}
                        iconSize={14}
                        ariaLabel="Remove device"
                        question={`Permanently remove "${device.label || 'this device'}"? It would need a new pairing code to return.`}
                        onConfirm={() => handleDelete(device)}
                        triggerClassName="flex h-9 w-9 items-center justify-center rounded-lg bg-danger text-white transition-opacity hover:opacity-90"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ChangePinModal isOpen={isChangingPin} onClose={() => { setIsChangingPin(false); refresh() }} />

      <PairingCodeModal
        isOpen={isAdding}
        onClose={() => { setIsAdding(false); refresh() }}
        code={pairing.code}
        expiresAt={pairing.expiresAt}
        error={pairing.error}
        isLoading={pairing.isLoading}
      />
    </div>
  )
}
