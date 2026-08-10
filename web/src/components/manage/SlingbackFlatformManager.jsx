import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import CollectionCard from './CollectionCard.jsx'
import Modal from './Modal.jsx'
import ImageDropzone from './ImageDropzone.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import { listAttributeOptions, uploadAttributeImage } from '../../lib/attributesApi.js'

function EditImageForm({ label, initialUrl, onCancel, onSave, saving, error }) {
  const [file, setFile] = useState(null)
  const previewUrl = file ? URL.createObjectURL(file) : initialUrl

  return (
    <div className="flex flex-col gap-4 text-left">
      <ImageDropzone label={`Upload ${label} Image (1 only allowed)`} previewUrl={previewUrl} onFileSelect={setFile} />

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!file || saving}
          onClick={() => onSave(file)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function FixedOptionCard({ label, option, onChanged }) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const closeModal = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async (file) => {
    if (!option) return
    setSaving(true)
    setError(null)
    try {
      await uploadAttributeImage(option.id, file)
      closeModal()
      onChanged()
    } catch {
      setError('Could not save this image. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CollectionCard
        image={option?.image_url}
        title={label}
        actions={[
          <button
            key="edit"
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={!option}
            className="flex w-full items-center justify-center gap-1 py-3 text-blue-600 hover:opacity-80 disabled:opacity-50"
          >
            <Pencil size={14} />
            Edit Image
          </button>,
        ]}
      />

      <Modal isOpen={isEditing} onClose={closeModal} title={`Edit ${label} Image`}>
        <EditImageForm
          label={label}
          initialUrl={option?.image_url}
          onCancel={closeModal}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      </Modal>
    </>
  )
}

export default function SlingbackFlatformManager() {
  const [slingback, setSlingback] = useState(null)
  const [flatform, setFlatform] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = (showLoading = false, isCancelled = () => false) => {
    if (showLoading) setIsLoading(true)
    Promise.all([listAttributeOptions('slingback'), listAttributeOptions('flatform')])
      .then(([slingbackOptions, flatformOptions]) => {
        if (isCancelled()) return
        setSlingback(slingbackOptions[0] ?? null)
        setFlatform(flatformOptions[0] ?? null)
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load right now.')
      })
      .finally(() => {
        if (showLoading && !isCancelled()) setIsLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    refresh(true, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) return <LoadingSpinner label="Loading..." />
  if (loadError) return <p className="text-center text-danger">{loadError}</p>

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
      <FixedOptionCard label="Slingback" option={slingback} onChanged={refresh} />
      <FixedOptionCard label="Flatform" option={flatform} onChanged={refresh} />
    </div>
  )
}
