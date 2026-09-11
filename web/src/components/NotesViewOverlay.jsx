import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Pencil, Plus, X } from 'lucide-react'
import NotesBlockList from './NotesBlockList.jsx'
import { uploadNotesImage } from '../lib/ordersApi.js'
import { errorDetail } from '../lib/apiClient.js'
import { sanitizeText } from '../lib/textInput.js'

// Mirrors the order's own picks (material, mold, heel...). They're generated from those
// choices, not written by hand, so they're shown but never offered for editing here.
const SELECTION_TYPES = new Set(['material', 'mold_type', 'heel_type', 'buckle', 'flatform', 'slingback'])

// Same limits the API enforces on notes_blocks (see api/app/schema/order.py).
const MAX_BLOCKS = 20
const MAX_TEXT = 2000

let keySeed = 0
const nextKey = () => `note-${++keySeed}`

/** Turns saved blocks into something editable, keeping their order. */
function toDraft(blocks) {
  return blocks
    .filter((block) => !SELECTION_TYPES.has(block.type))
    .map((block) =>
      block.type === 'text'
        ? { key: nextKey(), kind: 'text', value: block.value ?? '' }
        : { key: nextKey(), kind: 'image', type: block.type, url: block.value },
    )
}

/** Read the notes on an order, and — where the order is still open — edit them in place.
 *
 * Text can be changed or removed, photos and drawings can be removed, and new text or photos
 * added. Anything taken out is deleted from storage by the server once the save lands.
 */
export default function NotesViewOverlay({ isOpen, onClose, blocks, canEdit = false, onSave }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const previewsRef = useRef(new Set())

  // Object URLs for not-yet-uploaded photos are released when the overlay goes away.
  useEffect(() => {
    const previews = previewsRef.current
    return () => previews.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  if (!isOpen) return null

  const selectionBlocks = blocks.filter((block) => SELECTION_TYPES.has(block.type))

  const startEditing = () => {
    setDraft(toDraft(blocks))
    setError(null)
    setIsEditing(true)
  }

  const stopEditing = () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewsRef.current.clear()
    setIsEditing(false)
    setError(null)
  }

  const atLimit = selectionBlocks.length + draft.length >= MAX_BLOCKS

  const addText = () => setDraft((current) => [...current, { key: nextKey(), kind: 'text', value: '' }])

  const addPhoto = (file) => {
    const preview = URL.createObjectURL(file)
    previewsRef.current.add(preview)
    setDraft((current) => [...current, { key: nextKey(), kind: 'new-photo', file, preview }])
  }

  const updateText = (key, value) =>
    setDraft((current) => current.map((item) => (item.key === key ? { ...item, value } : item)))

  const remove = (key) =>
    setDraft((current) => {
      const target = current.find((item) => item.key === key)
      if (target?.preview) {
        URL.revokeObjectURL(target.preview)
        previewsRef.current.delete(target.preview)
      }
      return current.filter((item) => item.key !== key)
    })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const edited = []
      for (const item of draft) {
        if (item.kind === 'text') {
          if (item.value.trim()) edited.push({ type: 'text', value: item.value.trim(), label: null })
        } else if (item.kind === 'image') {
          edited.push({ type: item.type, value: item.url, label: null })
        } else {
          // Uploaded only now, on save — a photo added and then cancelled never reaches storage.
          const { image_url } = await uploadNotesImage(item.file)
          edited.push({ type: 'photo', value: image_url, label: null })
        }
      }
      await onSave([...selectionBlocks, ...edited])
      stopEditing()
    } catch (err) {
      setError(errorDetail(err, 'Could not save the notes. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (isEditing) stopEditing()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={close}>
      <div
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-accent shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
          <h3 className="text-lg font-bold text-black">{isEditing ? 'Edit Notes' : 'Notes'}</h3>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
            <button type="button" onClick={close} aria-label="Close" className="text-gray-500 hover:text-black">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!isEditing ? (
            <div className="rounded-lg bg-white p-3">
              {blocks.length > 0 ? (
                <NotesBlockList blocks={blocks} />
              ) : (
                <p className="text-sm text-gray-500">No notes on this order.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selectionBlocks.length > 0 && (
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    From the order&apos;s selections — change these in the orders table.
                  </p>
                  <NotesBlockList blocks={selectionBlocks} />
                </div>
              )}

              {draft.length === 0 && <p className="text-sm text-gray-500">No written notes or photos yet.</p>}

              {draft.map((item) => (
                <div key={item.key} className="relative rounded-lg bg-white p-3">
                  <button
                    type="button"
                    onClick={() => remove(item.key)}
                    aria-label="Remove"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white"
                  >
                    <X size={12} />
                  </button>
                  {item.kind === 'text' ? (
                    <textarea
                      value={item.value}
                      maxLength={MAX_TEXT}
                      rows={3}
                      onChange={(event) => updateText(item.key, sanitizeText(event.target.value, MAX_TEXT))}
                      placeholder="Type a note…"
                      className="w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  ) : (
                    <img
                      src={item.kind === 'image' ? item.url : item.preview}
                      alt=""
                      className="h-36 w-36 rounded-lg border border-gray-200 object-cover"
                    />
                  )}
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addText}
                  disabled={atLimit}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:text-black disabled:opacity-40"
                >
                  <Plus size={14} />
                  Add text
                </button>
                <label
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:text-black ${
                    atLimit ? 'pointer-events-none opacity-40' : 'cursor-pointer'
                  }`}
                >
                  <ImagePlus size={14} />
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) addPhoto(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
              {atLimit && <p className="text-xs text-gray-500">An order can hold up to {MAX_BLOCKS} note items.</p>}

              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
            <button
              type="button"
              onClick={stopEditing}
              disabled={saving}
              className="rounded-lg bg-danger px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-success px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
