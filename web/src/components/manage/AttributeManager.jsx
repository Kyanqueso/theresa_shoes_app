import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import EmptyState from '../EmptyState.jsx'
import ConfirmButton from '../ConfirmButton.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import Modal from './Modal.jsx'
import CollectionCard from './CollectionCard.jsx'
import ImageDropzone from './ImageDropzone.jsx'
import {
  createAttributeOption,
  deleteAttributeOption,
  listAttributeOptions,
  updateAttributeOption,
  uploadAttributeImage,
} from '../../lib/attributesApi.js'
import { sanitizeText } from '../../lib/textInput.js'
import { errorDetail } from '../../lib/apiClient.js'

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OptionForm({ itemLabel, initial, onCancel, onSave, saving, error }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [file, setFile] = useState(null)

  const isEdit = Boolean(initial)
  const previewUrl = file ? URL.createObjectURL(file) : initial?.image_url

  const canSubmit = name.trim() && (isEdit || file)

  return (
    <div className="flex flex-col gap-4 text-left">
      <ImageDropzone
        label={`Upload ${itemLabel} Image (1 only allowed)`}
        previewUrl={previewUrl}
        onFileSelect={setFile}
      />

      <div>
        <label className="text-sm font-semibold text-black">{itemLabel} Name</label>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(event) => setName(sanitizeText(event.target.value))}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

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
          disabled={!canSubmit || saving}
          onClick={() => onSave({ name: name.trim(), file })}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function AttributeManager({ category, icon: Icon, label, itemLabel, addLabel, searchPlaceholder }) {
  const [options, setOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'add' | option being edited
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const refresh = (isCancelled = () => false) => {
    listAttributeOptions(category)
      .then((data) => {
        if (isCancelled()) return
        setOptions(data)
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load right now.')
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
    // refresh is redefined every render; the fetch should only re-run when the category
    // this manager is showing actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const visible = options.filter((option) => option.name.toLowerCase().includes(search.trim().toLowerCase()))

  const closeModal = () => {
    setModalMode(null)
    setFormError(null)
  }

  const handleSave = async ({ name, file }) => {
    setSaving(true)
    setFormError(null)
    try {
      let option
      if (modalMode === 'add') {
        option = await createAttributeOption({ category, name })
      } else {
        option = await updateAttributeOption(modalMode.id, { name })
      }
      if (file) await uploadAttributeImage(option.id, file)
      closeModal()
      refresh()
    } catch (err) {
      setFormError(errorDetail(err, 'Could not save. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (option) => {
    try {
      await updateAttributeOption(option.id, { is_active: !option.is_active })
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not update that item. Please try again.'))
    }
  }

  const handleDelete = async (option) => {
    try {
      await deleteAttributeOption(option.id)
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not delete that item. Please try again.'))
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
        <div />
        <div className="flex items-center gap-2 border-b border-gray-400 px-1 py-1 md:mx-auto md:w-80">
          <Search size={16} className="text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalMode('add')}
          className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:justify-self-end"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <LoadingSpinner label={`Loading ${label}...`} />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : visible.length === 0 ? (
          <EmptyState icon={Icon} title={`No ${label.toLowerCase()} yet`} message={`Add ${label.toLowerCase()} to use when listing shoe details.`} />
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((option) => (
              <CollectionCard
                key={option.id}
                image={option.image_url}
                title={option.name}
                titleClassName="text-xl"
                titleRight={
                  <span className="whitespace-nowrap text-right text-xs text-gray-400">
                    Added {formatDate(option.created_at)}
                  </span>
                }
                isHidden={!option.is_active}
                actions={[
                  <button
                    key="hide"
                    type="button"
                    onClick={() => toggleActive(option)}
                    className="flex items-center justify-center gap-1 py-3 text-gray-500 hover:text-black"
                  >
                    {option.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                    {option.is_active ? 'Hide' : 'Unhide'}
                  </button>,
                  <button
                    key="edit"
                    type="button"
                    onClick={() => setModalMode(option)}
                    className="flex items-center justify-center gap-1 py-3 text-blue-600 hover:opacity-80"
                  >
                    <Pencil size={14} /> Edit
                  </button>,
                  <ConfirmButton
                    key="delete"
                    label="Delete"
                    icon={Trash2}
                    question={`Delete "${option.name}"? This can't be undone.`}
                    onConfirm={() => handleDelete(option)}
                    triggerClassName="flex w-full items-center justify-center gap-1 py-3 text-danger hover:opacity-80"
                  />,
                ]}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalMode === 'add' ? addLabel : `Edit ${itemLabel}`}>
        <OptionForm
          itemLabel={itemLabel}
          initial={modalMode === 'add' ? null : modalMode}
          onCancel={closeModal}
          onSave={handleSave}
          saving={saving}
          error={formError}
        />
      </Modal>
    </div>
  )
}
