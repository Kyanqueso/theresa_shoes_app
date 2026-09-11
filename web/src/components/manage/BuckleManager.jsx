import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import ImagePlaceholder from '../ImagePlaceholder.jsx'
import ConfirmButton from '../ConfirmButton.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import Modal from './Modal.jsx'
import ImageOptionForm from './ImageOptionForm.jsx'
import {
  createAttributeOption,
  deleteAttributeOption,
  listAttributeOptions,
  updateAttributeOption,
  uploadAttributeImage,
} from '../../lib/attributesApi.js'
import { errorDetail } from '../../lib/apiClient.js'

function BuckleCard({ buckle, onDelete, onDragStart, onToggle, onEdit }) {
  const outOfStock = !buckle.is_active
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, buckle.id)}
      className="relative flex cursor-grab flex-col items-center gap-2 rounded-lg bg-white p-2"
    >
      <button
        type="button"
        onClick={() => onEdit(buckle)}
        aria-label={`Edit ${buckle.name}`}
        title="Edit name and image"
        className="absolute right-8 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
      >
        <Pencil size={12} />
      </button>
      <ConfirmButton
        label=""
        icon={Trash2}
        question={`Delete "${buckle.name}"?`}
        onConfirm={() => onDelete(buckle)}
        triggerClassName="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white"
      />
      {buckle.image_url ? (
        <img src={buckle.image_url} alt={buckle.name} className="aspect-square w-full rounded-md object-cover" />
      ) : (
        <ImagePlaceholder className="aspect-square w-full rounded-md" />
      )}
      <p className="text-sm font-medium text-black">{buckle.name}</p>
      {outOfStock && <p className="-mt-1 text-xs font-semibold text-golden-brown">OUT OF STOCK</p>}

      {/* Touch devices never fire HTML5 drag events, so this is the only way to move a
          buckle between Available/Unavailable on a phone or tablet. */}
      <button
        type="button"
        onClick={() => onToggle(buckle)}
        className="mt-auto flex w-full items-center justify-center gap-1 rounded-md border border-gray-300 px-1 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:text-black"
      >
        <Undo2 size={11} />
        {outOfStock ? 'In stock' : 'Out of stock'}
      </button>
    </div>
  )
}

export default function BuckleManager() {
  const [options, setOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingBuckle, setEditingBuckle] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const refresh = (isCancelled = () => false) => {
    listAttributeOptions('buckle')
      .then((data) => {
        if (isCancelled()) return
        setOptions(data)
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load buckles right now.')
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

  const available = options.filter((o) => o.is_active)
  const unavailable = options.filter((o) => !o.is_active)

  const handleAdd = async ({ name, file }) => {
    setSaving(true)
    setFormError(null)
    try {
      const option = await createAttributeOption({ category: 'buckle', name })
      await uploadAttributeImage(option.id, file)
      setIsAdding(false)
      refresh()
    } catch (err) {
      setFormError(errorDetail(err, 'Could not add this buckle. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async ({ name, file }) => {
    const buckle = editingBuckle
    setSaving(true)
    setFormError(null)
    try {
      if (name !== buckle.name) await updateAttributeOption(buckle.id, { name })
      if (file) await uploadAttributeImage(buckle.id, file)
      setEditingBuckle(null)
      refresh()
    } catch (err) {
      setFormError(errorDetail(err, 'Could not save this buckle. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (buckle) => {
    try {
      await deleteAttributeOption(buckle.id)
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not delete that buckle. Please try again.'))
    }
  }

  const handleDragStart = (event, buckleId) => {
    event.dataTransfer.setData('text/plain', buckleId)
  }

  const handleDrop = async (event, targetActive) => {
    event.preventDefault()
    const buckleId = event.dataTransfer.getData('text/plain')
    const buckle = options.find((o) => o.id === buckleId)
    if (!buckle || buckle.is_active === targetActive) return
    try {
      await updateAttributeOption(buckleId, { is_active: targetActive })
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not update that buckle. Please try again.'))
    }
  }

  const handleToggle = async (buckle) => {
    try {
      await updateAttributeOption(buckle.id, { is_active: !buckle.is_active })
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not update that buckle. Please try again.'))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Add New Buckle
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading Buckles..." />
      ) : loadError ? (
        <p className="mt-8 text-center text-danger">{loadError}</p>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-black">
            Available <span className="ml-1 font-normal text-gray-500">{available.length} In Stock</span>
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, true)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-4 rounded-lg bg-white p-3 sm:grid-cols-5"
          >
            {available.map((buckle) => (
              <BuckleCard key={buckle.id} buckle={buckle} onDelete={handleDelete} onDragStart={handleDragStart} onToggle={handleToggle} onEdit={setEditingBuckle} />
            ))}
          </div>

          <p className="mt-6 text-sm font-semibold text-black">
            Unavailable <span className="ml-1 font-normal text-golden-brown">{unavailable.length} Unavailable</span>
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, false)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-4 rounded-lg bg-gray-100 p-3 sm:grid-cols-5"
          >
            {unavailable.map((buckle) => (
              <BuckleCard key={buckle.id} buckle={buckle} onDelete={handleDelete} onDragStart={handleDragStart} onToggle={handleToggle} onEdit={setEditingBuckle} />
            ))}
          </div>
        </>
      )}

      <Modal isOpen={isAdding} onClose={() => { setIsAdding(false); setFormError(null) }} title="Add Buckle">
        <ImageOptionForm
          nameLabel="Buckle Name"
          imageLabel="Buckle Image"
          onCancel={() => { setIsAdding(false); setFormError(null) }}
          onSave={handleAdd}
          saving={saving}
          error={formError}
        />
      </Modal>

      <Modal isOpen={editingBuckle !== null} onClose={() => { setEditingBuckle(null); setFormError(null) }} title="Edit Buckle">
        {editingBuckle && (
          <ImageOptionForm
            key={editingBuckle.id}
            nameLabel="Buckle Name"
            imageLabel="Buckle Image"
            initial={editingBuckle}
            onCancel={() => { setEditingBuckle(null); setFormError(null) }}
            onSave={handleEdit}
            saving={saving}
            error={formError}
          />
        )}
      </Modal>
    </div>
  )
}
