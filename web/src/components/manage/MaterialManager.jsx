import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Layers, Plus, Search, Trash2 } from 'lucide-react'
import EmptyState from '../EmptyState.jsx'
import ConfirmButton from '../ConfirmButton.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import Modal from './Modal.jsx'
import ColorDropzone from './ColorDropzone.jsx'
import { createAttributeOption, deleteAttributeOption, listAttributeOptions, updateAttributeOption } from '../../lib/attributesApi.js'
import { sanitizeText } from '../../lib/textInput.js'

function AddMaterialForm({ onCancel, onSave, saving, error }) {
  const [name, setName] = useState('')

  return (
    <div className="flex flex-col gap-4 text-left">
      <div>
        <label className="text-sm font-semibold text-black">Material Name</label>
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
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-500 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim() || saving}
          onClick={() => onSave(name.trim())}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

function AddSwatchForm({ onCancel, onSave, saving, error }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('')

  return (
    <div className="flex flex-col gap-4 text-left">
      <ColorDropzone label="Swatch Color" color={color} onChange={setColor} />

      <div>
        <label className="text-sm font-semibold text-black">Swatch Name</label>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(event) => setName(sanitizeText(event.target.value))}
          placeholder="e.g. Chestnut"
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
          disabled={!name.trim() || !color || saving}
          onClick={() => onSave({ name: name.trim(), color })}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

function SwatchCard({ swatch, onDelete, onDragStart }) {
  const outOfStock = !swatch.is_active
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, swatch.id)}
      className="relative flex cursor-grab flex-col items-center gap-2 rounded-lg bg-white p-2"
    >
      <ConfirmButton
        label=""
        icon={Trash2}
        question={`Delete "${swatch.name}"?`}
        onConfirm={() => onDelete(swatch)}
        triggerClassName="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white"
      />
      <div
        className="aspect-[3/4] w-full rounded-md border border-black/10"
        style={{ backgroundColor: swatch.swatch_color ?? '#cccccc' }}
      />
      <p className="text-sm font-medium text-black">{swatch.name}</p>
      {outOfStock && <p className="-mt-1 text-xs font-semibold text-golden-brown">OUT OF STOCK</p>}
    </div>
  )
}

function MaterialGroup({ group, swatches, onChanged, onError }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddingSwatch, setIsAddingSwatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const available = swatches.filter((s) => s.is_active)
  const unavailable = swatches.filter((s) => !s.is_active)

  const handleAddSwatch = async ({ name, color }) => {
    setSaving(true)
    setFormError(null)
    try {
      await createAttributeOption({ category: 'material', name, swatch_color: color, parent_id: group.id })
      setIsAddingSwatch(false)
      onChanged()
    } catch {
      setFormError('Could not add this swatch. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSwatch = async (swatch) => {
    try {
      await deleteAttributeOption(swatch.id)
      onChanged()
    } catch {
      onError?.('Could not delete that swatch. Please try again.')
    }
  }

  const handleDeleteGroup = async () => {
    try {
      await deleteAttributeOption(group.id)
      onChanged()
    } catch {
      onError?.('Could not delete that material. Please try again.')
    }
  }

  const handleDragStart = (event, swatchId) => {
    event.dataTransfer.setData('text/plain', swatchId)
  }

  const handleDrop = async (event, targetActive) => {
    event.preventDefault()
    const swatchId = event.dataTransfer.getData('text/plain')
    const swatch = swatches.find((s) => s.id === swatchId)
    if (!swatch || swatch.is_active === targetActive) return
    try {
      await updateAttributeOption(swatchId, { is_active: targetActive })
      onChanged()
    } catch {
      onError?.('Could not update that swatch. Please try again.')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="flex w-full items-center justify-between bg-primary px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex flex-1 items-center gap-2 text-left font-semibold"
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {group.name}
        </button>
        <span className="flex items-center gap-4 text-sm">
          <span>
            {available.length} available | {unavailable.length} unavailable
          </span>
          <ConfirmButton
            label=""
            icon={Trash2}
            question={`Delete "${group.name}" and all its swatches?`}
            onConfirm={handleDeleteGroup}
            triggerClassName="flex h-7 w-7 items-center justify-center rounded-md bg-danger text-white"
          />
        </span>
      </div>

      {isOpen && (
        <div className="bg-accent p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-black">
              Available <span className="ml-1 font-normal text-gray-500">{available.length} In Stock</span>
            </p>
            <button
              type="button"
              onClick={() => setIsAddingSwatch(true)}
              className="flex items-center gap-2 rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={14} />
              Add New Swatch
            </button>
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, true)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-white p-3 sm:grid-cols-5"
          >
            {available.map((swatch) => (
              <SwatchCard key={swatch.id} swatch={swatch} onDelete={handleDeleteSwatch} onDragStart={handleDragStart} />
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-black">
            Unavailable <span className="ml-1 font-normal text-golden-brown">{unavailable.length} Unavailable</span>
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, false)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-gray-100 p-3 sm:grid-cols-5"
          >
            {unavailable.map((swatch) => (
              <SwatchCard key={swatch.id} swatch={swatch} onDelete={handleDeleteSwatch} onDragStart={handleDragStart} />
            ))}
          </div>

          <Modal isOpen={isAddingSwatch} onClose={() => setIsAddingSwatch(false)} title="Add New Swatch">
            <AddSwatchForm onCancel={() => setIsAddingSwatch(false)} onSave={handleAddSwatch} saving={saving} error={formError} />
          </Modal>
        </div>
      )}
    </div>
  )
}

export default function MaterialManager() {
  const [options, setOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const refresh = (showLoading = false, isCancelled = () => false) => {
    if (showLoading) setIsLoading(true)
    setLoadError(null)
    listAttributeOptions('material')
      .then((data) => {
        if (!isCancelled()) setOptions(data)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load materials right now.')
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

  const groups = options
    .filter((option) => !option.parent_id)
    .filter((group) => group.name.toLowerCase().includes(search.trim().toLowerCase()))

  const handleAddGroup = async (name) => {
    setSaving(true)
    setFormError(null)
    try {
      await createAttributeOption({ category: 'material', name })
      setIsAddingGroup(false)
      refresh()
    } catch {
      setFormError('Could not add this material. Please try again.')
    } finally {
      setSaving(false)
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
            placeholder="Search Material Name"
            className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setIsAddingGroup(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:justify-self-end"
        >
          <Plus size={16} />
          Add Material
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {isLoading ? (
          <LoadingSpinner label="Loading Materials..." />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : groups.length === 0 ? (
          <EmptyState icon={Layers} title="No materials yet" message="Add materials to use when listing shoe details." />
        ) : (
          groups.map((group) => (
            <MaterialGroup
              key={group.id}
              group={group}
              swatches={options.filter((option) => option.parent_id === group.id)}
              onChanged={refresh}
              onError={setLoadError}
            />
          ))
        )}
      </div>

      <Modal isOpen={isAddingGroup} onClose={() => setIsAddingGroup(false)} title="Add Material">
        <AddMaterialForm onCancel={() => setIsAddingGroup(false)} onSave={handleAddGroup} saving={saving} error={formError} />
      </Modal>
    </div>
  )
}
