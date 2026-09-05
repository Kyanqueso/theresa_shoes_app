import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import NotesEditor from '../NotesEditor.jsx'
import PhoneNumberInput, { CONTACT_LENGTH, CONTACT_PREFIX } from '../PhoneNumberInput.jsx'
import { createOrder, uploadNotesImage } from '../../lib/ordersApi.js'
import { sanitizeText } from '../../lib/textInput.js'
import { ApiError } from '../../lib/apiClient.js'

const MIN_DATE = '2000-01-01'
// The shop is in Marikina (UTC+8). Sending a bare "2026-09-05T21:30" lets the server read it
// as UTC, which pushes an evening order onto the next day. The offset makes it unambiguous.
const BUSINESS_UTC_OFFSET = '+08:00'

// FastAPI validation errors (422) return `detail` as an array of objects, not a string —
// rendering that straight into JSX would crash. Only ever use it when it's actually a string.
function detailOf(err, fallback) {
  return err instanceof ApiError && typeof err.detail === 'string' ? err.detail : fallback
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function NumberField({ label, value, onChange, min = 1, max, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold text-black">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const raw = Number(event.target.value)
          const clamped = Math.min(max ?? Infinity, Math.max(min, Number.isFinite(raw) ? raw : min))
          onChange(clamped)
        }}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold text-black">{label}</label>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Select…</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function YesNoRadio({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-semibold text-black">{label}</label>
      <div className="mt-2 flex items-center gap-4">
        {['Yes', 'No'].map((option) => (
          <label key={option} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="radio"
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-primary"
            />
            {option}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function AddOrderOverlay({ isOpen, onClose, companyId, attributeOptions, onCreated }) {
  const [clientName, setClientName] = useState('')
  const [contactNumber, setContactNumber] = useState(CONTACT_PREFIX)
  const [modelName, setModelName] = useState('')
  const [orderDate, setOrderDate] = useState(todayIso())
  const [size, setSize] = useState(1)
  const [material, setMaterial] = useState(null)
  const [colorCode, setColorCode] = useState('')
  const [moldTypeChoice, setMoldType] = useState(null)
  const [heelType, setHeelType] = useState(null)
  const [heelSize, setHeelSize] = useState(1)
  const [withBuckle, setWithBuckle] = useState('No')
  const [withFlatform, setWithFlatform] = useState('No')
  const [withSlingback, setWithSlingback] = useState('No')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState({ blocks: [], drawingRegistry: { current: {} } })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // See ShoeDetails: derived, not set from an effect.
  const defaultMoldTypeId =
    (attributeOptions.mold_type ?? []).find((option) => option.name.trim().toLowerCase() === 'none')?.id ?? null
  const moldType = moldTypeChoice ?? defaultMoldTypeId

  const findOption = (category, id) => (attributeOptions[category] ?? []).find((option) => option.id === id) ?? null
  const materialOption = findOption('material', material)
  const moldTypeOption = findOption('mold_type', moldType)
  const heelTypeOption = findOption('heel_type', heelType)
  const flatformOption = attributeOptions.flatform?.[0] ?? null
  const slingbackOption = attributeOptions.slingback?.[0] ?? null

  const selectionBlocks = useMemo(() => {
    const list = []
    if (materialOption) list.push({ type: 'material', label: materialOption.name, value: materialOption.swatch_color ?? null })
    if (moldTypeOption && moldTypeOption.name.trim().toLowerCase() !== 'none') {
      list.push({ type: 'mold_type', label: moldTypeOption.name, value: moldTypeOption.image_url ?? null })
    }
    if (heelTypeOption) list.push({ type: 'heel_type', label: heelTypeOption.name, value: heelTypeOption.image_url ?? null })
    if (withBuckle === 'Yes') list.push({ type: 'buckle', label: 'Yes', value: null })
    if (withFlatform === 'Yes') {
      list.push({ type: 'flatform', label: flatformOption?.name ?? 'Yes', value: flatformOption?.image_url ?? null })
    }
    if (withSlingback === 'Yes') {
      list.push({ type: 'slingback', label: slingbackOption?.name ?? 'Yes', value: slingbackOption?.image_url ?? null })
    }
    return list
  }, [materialOption, moldTypeOption, heelTypeOption, withBuckle, withFlatform, withSlingback, flatformOption, slingbackOption])

  const isFormComplete =
    clientName.trim() !== '' &&
    modelName.trim() !== '' &&
    material !== null &&
    colorCode.trim() !== '' &&
    moldType !== null &&
    heelType !== null &&
    Number(price) > 0 &&
    orderDate >= MIN_DATE &&
    orderDate <= todayIso() &&
    (contactNumber === CONTACT_PREFIX || contactNumber.length === CONTACT_LENGTH)

  const reset = () => {
    setClientName('')
    setContactNumber(CONTACT_PREFIX)
    setModelName('')
    setOrderDate(todayIso())
    setSize(1)
    setMaterial(null)
    setColorCode('')
    setMoldType(null)
    setHeelType(null)
    setHeelSize(1)
    setWithBuckle('No')
    setWithFlatform('No')
    setWithSlingback('No')
    setQuantity(1)
    setPrice('')
    setNotes({ blocks: [], drawingRegistry: { current: {} } })
    setSubmitError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  const buildNotesBlocks = async () => {
    const result = selectionBlocks.map((block) => ({ ...block }))
    for (const block of notes.blocks) {
      if (block.type === 'text') {
        if (block.text?.trim()) result.push({ type: 'text', value: block.text.trim(), label: null })
      } else if (block.type === 'photo') {
        const { image_url } = await uploadNotesImage(block.file)
        result.push({ type: 'photo', value: image_url, label: null })
      } else if (block.type === 'drawing') {
        const state = notes.drawingRegistry.current[block.id]
        if (state?.hasDrawn && state.canvasRef?.current) {
          const blob = await new Promise((resolve) => state.canvasRef.current.toBlob(resolve, 'image/png'))
          if (blob) {
            const { image_url } = await uploadNotesImage(blob)
            result.push({ type: 'drawing', value: image_url, label: null })
          }
        }
      }
    }
    return result
  }

  const handleConfirm = async () => {
    if (!isFormComplete) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const notesBlocks = await buildNotesBlocks()
      const now = new Date()
      const timeOfDay = now.toTimeString().slice(0, 8)
      await createOrder({
        company_id: companyId,
        client_name: clientName.trim(),
        contact_number: contactNumber === CONTACT_PREFIX ? null : contactNumber,
        custom_model_name: modelName.trim(),
        material_id: material,
        mold_type_id: moldType,
        heel_type_id: heelType,
        color_code: colorCode.trim(),
        size,
        heel_size: heelSize,
        quantity,
        with_buckle: withBuckle === 'Yes',
        with_flatform: withFlatform === 'Yes',
        with_slingback: withSlingback === 'Yes',
        unit_price: Number(price),
        notes_blocks: notesBlocks,
        custom_created_at: `${orderDate}T${timeOfDay}${BUSINESS_UTC_OFFSET}`,
      })
      handleClose()
      onCreated?.()
    } catch (err) {
      setSubmitError(detailOf(err, 'Could not add the order. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8" onClick={handleClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-accent shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <h2 className="text-xl font-bold text-black">Add New Order</h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="text-gray-500 hover:text-black">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-black">Client Name</label>
              <input
                type="text"
                value={clientName}
                maxLength={50}
                onChange={(event) => setClientName(sanitizeText(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black">Contact Number</label>
              <PhoneNumberInput value={contactNumber} onChange={setContactNumber} className="mt-2 bg-white" />
            </div>

            <div>
              <label className="text-sm font-semibold text-black">Model Ordered</label>
              <input
                type="text"
                value={modelName}
                maxLength={50}
                onChange={(event) => setModelName(sanitizeText(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-black">Order Date</label>
              <input
                type="date"
                value={orderDate}
                min={MIN_DATE}
                max={todayIso()}
                onChange={(event) => setOrderDate(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumberField label="Size" value={size} onChange={setSize} min={1} max={125} />
            <SelectField label="Material" value={material} onChange={setMaterial} options={attributeOptions.material ?? []} />
            <div>
              <label className="text-sm font-semibold text-black">Color</label>
              <input
                type="text"
                value={colorCode}
                maxLength={50}
                onChange={(event) => setColorCode(sanitizeText(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField label="Mold Type" value={moldType} onChange={setMoldType} options={attributeOptions.mold_type ?? []} />
            <SelectField label="Heel Type" value={heelType} onChange={setHeelType} options={attributeOptions.heel_type ?? []} />
            <NumberField label="Heel Size" value={heelSize} onChange={setHeelSize} min={1} max={20} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <YesNoRadio label="Buckle" value={withBuckle} onChange={setWithBuckle} />
            <YesNoRadio label="Flatform" value={withFlatform} onChange={setWithFlatform} />
            <YesNoRadio label="Slingback" value={withSlingback} onChange={setWithSlingback} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField label="Quantity" value={quantity} onChange={setQuantity} min={1} max={100} />
            <div>
              <label className="text-sm font-semibold text-black">Price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="mt-4">
            <NotesEditor selectionBlocks={selectionBlocks} onChange={setNotes} />
          </div>

          {submitError && <p className="mt-4 text-sm font-semibold text-danger">{submitError}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-danger px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormComplete || isSubmitting}
            className="rounded-lg bg-success px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
