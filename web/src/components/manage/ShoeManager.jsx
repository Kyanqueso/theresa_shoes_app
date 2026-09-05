import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Eye, EyeOff, Footprints, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import EmptyState from '../EmptyState.jsx'
import ConfirmButton from '../ConfirmButton.jsx'
import LoadingSpinner from '../LoadingSpinner.jsx'
import Modal from './Modal.jsx'
import CollectionCard from './CollectionCard.jsx'
import {
  createShoe,
  deleteShoe,
  deleteShoeImage,
  listShoes,
  updateShoe,
  updateShoeImage,
  uploadShoeImage,
} from '../../lib/shoesApi.js'
import { sanitizeText } from '../../lib/textInput.js'
import { errorDetail } from '../../lib/apiClient.js'

const MAX_IMAGES = 5
const MAX_DESCRIPTION = 1000

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ShoeForm({ initial, onCancel, onSave, saving, error }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial?.price ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const nextKeyRef = useRef(0)
  const [images, setImages] = useState(() =>
    (initial?.images ?? []).map((img) => ({
      key: `existing-${img.id}`,
      type: 'existing',
      id: img.id,
      url: img.image_url,
    })),
  )
  const [removedImageIds, setRemovedImageIds] = useState([])
  const [dragKey, setDragKey] = useState(null)

  const isEdit = Boolean(initial)

  const handleFiles = (event) => {
    const files = Array.from(event.target.files ?? [])
    const newItems = files.map((file) => ({
      key: `new-${nextKeyRef.current++}`,
      type: 'new',
      file,
      url: URL.createObjectURL(file),
    }))
    setImages((current) => [...current, ...newItems].slice(0, MAX_IMAGES))
    event.target.value = ''
  }

  const removeImage = (key) => {
    setImages((current) => {
      const target = current.find((img) => img.key === key)
      if (target?.type === 'existing') setRemovedImageIds((ids) => [...ids, target.id])
      return current.filter((img) => img.key !== key)
    })
  }

  // Drag-to-reorder is mouse-only (HTML5 drag events never fire from touch), so these
  // arrows are the way to reorder photos on a phone or tablet.
  const moveImage = (key, direction) => {
    setImages((current) => {
      const from = current.findIndex((img) => img.key === key)
      const to = from + direction
      if (from === -1 || to < 0 || to >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const handleDragOver = (event, overKey) => {
    event.preventDefault()
    if (!dragKey || dragKey === overKey) return
    setImages((current) => {
      const fromIndex = current.findIndex((img) => img.key === dragKey)
      const toIndex = current.findIndex((img) => img.key === overKey)
      if (fromIndex === -1 || toIndex === -1) return current
      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const canSubmit = name.trim() && price !== '' && (isEdit || images.length >= 1)

  return (
    <div className="flex flex-col gap-4 text-left">
      <div>
        <label className="text-sm font-semibold text-black">Shoe Name</label>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(event) => setName(sanitizeText(event.target.value))}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-black">Price</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-black">Description</label>
        <textarea
          value={description}
          maxLength={MAX_DESCRIPTION}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {description.length} / {MAX_DESCRIPTION}
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold text-black">
          Upload Images ({isEdit ? `up to ${MAX_IMAGES}` : `1-${MAX_IMAGES} required`})
        </label>

        <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-gray-300 bg-white">
          <label className="flex cursor-pointer items-center border-r border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Choose Files
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={images.length >= MAX_IMAGES}
              className="hidden"
            />
          </label>
          <div className="flex-1" />
        </div>

        {images.length > 0 && (
          <>
            <p className="mt-3 text-xs text-gray-500">Drag to reorder – first = main photo</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {images.map((img, index) => (
                <div
                  key={img.key}
                  draggable
                  onDragStart={() => setDragKey(img.key)}
                  onDragOver={(event) => handleDragOver(event, img.key)}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={() => setDragKey(null)}
                  className="relative h-24 w-24 cursor-grab overflow-hidden rounded-lg border border-gray-300"
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                  >
                    <X size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 p-0.5">
                    <button
                      type="button"
                      onClick={() => moveImage(img.key, -1)}
                      disabled={index === 0}
                      aria-label="Move image earlier"
                      className="flex h-5 w-5 items-center justify-center rounded bg-black/70 text-white disabled:opacity-30"
                    >
                      <ArrowLeft size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(img.key, 1)}
                      disabled={index === images.length - 1}
                      aria-label="Move image later"
                      className="flex h-5 w-5 items-center justify-center rounded bg-black/70 text-white disabled:opacity-30"
                    >
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-gray-500 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={() =>
            onSave({
              name: name.trim(),
              price: Number(price),
              description: description.trim() || null,
              images,
              removedImageIds,
            })
          }
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function ShoeManager() {
  const [shoes, setShoes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalMode, setModalMode] = useState(null) // null | 'add' | shoe object being edited
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const refresh = (isCancelled = () => false) => {
    listShoes({ includeHidden: true })
      .then((data) => {
        if (isCancelled()) return
        setShoes(data)
        setLoadError(null)
      })
      .catch(() => {
        if (!isCancelled()) setLoadError('Could not load shoes right now.')
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

  const visibleShoes = shoes.filter((shoe) => shoe.name.toLowerCase().includes(search.trim().toLowerCase()))

  const closeModal = () => {
    setModalMode(null)
    setFormError(null)
  }

  const handleSave = async ({ name, price, description, images, removedImageIds }) => {
    setSaving(true)
    setFormError(null)
    try {
      let shoe
      if (modalMode === 'add') {
        shoe = await createShoe({ name, price, description })
      } else {
        shoe = await updateShoe(modalMode.id, { name, price, description })
        await Promise.all(removedImageIds.map((imageId) => deleteShoeImage(shoe.id, imageId)))
      }

      for (let index = 0; index < images.length; index += 1) {
        const img = images[index]
        if (img.type === 'new') {
          await uploadShoeImage(shoe.id, img.file, index)
        } else {
          await updateShoeImage(shoe.id, img.id, index)
        }
      }

      closeModal()
      refresh()
    } catch (err) {
      setFormError(errorDetail(err, 'Could not save this shoe. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleHidden = async (shoe) => {
    try {
      await updateShoe(shoe.id, { is_hidden: !shoe.is_hidden })
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not update that shoe. Please try again.'))
    }
  }

  const handleDelete = async (shoe) => {
    try {
      await deleteShoe(shoe.id)
      refresh()
    } catch (err) {
      setLoadError(errorDetail(err, 'Could not delete that shoe. Please try again.'))
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
            placeholder="Search Shoe Name"
            className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalMode('add')}
          className="flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:justify-self-end"
        >
          <Plus size={16} />
          Add New Shoe to Display
        </button>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <LoadingSpinner label="Loading Shoes..." />
        ) : loadError ? (
          <p className="text-center text-danger">{loadError}</p>
        ) : visibleShoes.length === 0 ? (
          <EmptyState icon={Footprints} title="No shoes yet" message="Add your first shoe to get started." />
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visibleShoes.map((shoe) => (
              <CollectionCard
                key={shoe.id}
                image={shoe.images?.[0]?.image_url}
                title={shoe.name}
                titleClassName="text-xl"
                subtitle={shoe.description}
                isHidden={shoe.is_hidden}
                badge={
                  shoe.images?.length > 0 && (
                    <>
                      <Camera size={12} />
                      {shoe.images.length} Photos
                    </>
                  )
                }
                meta={
                  <div className="mt-3 flex items-end justify-between">
                    <span className="text-xl font-bold text-black">₱{shoe.price}</span>
                    <span className="text-right text-xs text-gray-400">
                      Added
                      <br />
                      {formatDate(shoe.created_at)}
                    </span>
                  </div>
                }
                actions={[
                  <button
                    key="hide"
                    type="button"
                    onClick={() => toggleHidden(shoe)}
                    className="flex items-center justify-center gap-1 py-3 text-gray-500 hover:text-black"
                  >
                    {shoe.is_hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    {shoe.is_hidden ? 'Unhide' : 'Hide'}
                  </button>,
                  <button
                    key="edit"
                    type="button"
                    onClick={() => setModalMode(shoe)}
                    className="flex items-center justify-center gap-1 py-3 text-blue-600 hover:opacity-80"
                  >
                    <Pencil size={14} /> Edit
                  </button>,
                  <ConfirmButton
                    key="delete"
                    label="Delete"
                    icon={Trash2}
                    question={`Delete "${shoe.name}"? This can't be undone.`}
                    onConfirm={() => handleDelete(shoe)}
                    triggerClassName="flex w-full items-center justify-center gap-1 py-3 text-danger hover:opacity-80"
                  />,
                ]}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalMode !== null} onClose={closeModal} title={modalMode === 'add' ? 'Add New Shoe' : 'Edit Shoe'}>
        <ShoeForm
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
