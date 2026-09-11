import { useEffect, useMemo, useState } from 'react'
import FieldLabel from '../FieldLabel.jsx'
import ImageDropzone from './ImageDropzone.jsx'
import { sanitizeText } from '../../lib/textInput.js'

/** Name + one image — the shape of a material swatch and of a buckle, for both adding and
 * editing.
 *
 * Swatches used to offer "colour or image"; they're image-only now, which makes a swatch and
 * a buckle the same thing to the person managing them. One form for both keeps the two
 * managers from drifting apart again.
 *
 * `initial` switches it to edit mode: the current image shows as the preview, choosing a new
 * file is optional, and Save stays disabled until something has actually changed.
 */
export default function ImageOptionForm({
  nameLabel,
  imageLabel,
  placeholder,
  initial = null,
  onCancel,
  onSave,
  saving,
  error,
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [file, setFile] = useState(null)
  const isEdit = Boolean(initial)

  // One object URL per chosen file, revoked when it's replaced or the form closes — creating
  // one on every render (as the old forms did) leaks a blob for each keystroke in the name.
  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => filePreview && URL.revokeObjectURL(filePreview), [filePreview])

  const trimmed = name.trim()
  const changed = !isEdit || trimmed !== initial.name || Boolean(file)
  const canSave = trimmed && (isEdit || file) && changed && !saving

  return (
    <div className="flex flex-col gap-4 text-left">
      <ImageDropzone
        label={isEdit ? `${imageLabel} (tap to replace)` : imageLabel}
        previewUrl={filePreview ?? initial?.image_url ?? null}
        onFileSelect={setFile}
      />

      <div>
        <FieldLabel>{nameLabel}</FieldLabel>
        <input
          type="text"
          value={name}
          maxLength={50}
          onChange={(event) => setName(sanitizeText(event.target.value))}
          placeholder={placeholder}
          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
          disabled={!canSave}
          onClick={() => onSave({ name: trimmed, file })}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}
