import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import ImagePlaceholder from '../components/ImagePlaceholder.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ImagePreviewOverlay from '../components/ImagePreviewOverlay.jsx'
import ImageLightbox from '../components/ImageLightbox.jsx'
import ReviewOrderOverlay from '../components/ReviewOrderOverlay.jsx'
import OrderSuccessOverlay from '../components/OrderSuccessOverlay.jsx'
import NotesEditor from '../components/NotesEditor.jsx'
import PhoneNumberInput, { CONTACT_LENGTH, CONTACT_PREFIX } from '../components/PhoneNumberInput.jsx'
import SwatchPicker from '../components/SwatchPicker.jsx'
import PinOverlay from '../components/PinOverlay.jsx'
import CloseMatchCompanyOverlay from '../components/CloseMatchCompanyOverlay.jsx'
import { getShoe, listShoes } from '../lib/shoesApi.js'
import { listAttributeOptions } from '../lib/attributesApi.js'
import { listCompanies } from '../lib/companiesApi.js'
import { createOrder, uploadNotesImage } from '../lib/ordersApi.js'
import { ApiError } from '../lib/apiClient.js'
import { sanitizeText } from '../lib/textInput.js'
import { isDeviceRecognized, verifyPin } from '../lib/auth.js'
import { OWNER_VIBER_NUMBER } from '../lib/businessContact.js'
import { findCloseMatchingCompany } from '../lib/companySimilarity.js'

const NUMBER_OPTIONS = [1, 2, 3, 4, 5]
const POST_ORDER_COOLDOWN_MS = 30_000

function PillGroup({ label, options, value, onChange, onPreview }) {
  return (
    <div>
      <p className="text-sm font-semibold text-black">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              onChange(option.id)
              if (onPreview && option.image_url) onPreview(option)
            }}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
              value === option.id
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 text-gray-600 hover:text-black'
            }`}
          >
            {option.name}
          </button>
        ))}
        {options.length === 0 && <p className="text-xs text-gray-400">None available yet.</p>}
      </div>
    </div>
  )
}

function YesNoToggle({ label, value, onChange, onYes }) {
  return (
    <div>
      <p className="text-sm font-semibold text-black">{label}</p>
      <div className="mt-2 flex gap-2">
        {['Yes', 'No'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onChange(option)
              if (option === 'Yes') onYes?.()
            }}
            className={`rounded-lg border px-5 py-1.5 text-sm font-medium transition-colors ${
              value === option
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 text-gray-600 hover:text-black'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function NumberSelect({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-semibold text-black">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {NUMBER_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function NumberInput({ label, value, onChange, min = 1, max }) {
  return (
    <div>
      <label className="text-sm font-semibold text-black">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const clamped = Math.min(max ?? Infinity, Math.max(min, Number(event.target.value) || min))
          onChange(clamped)
        }}
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  )
}

function CompanyCombobox({ companies, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = companies.filter((company) => company.name.toLowerCase().includes(value.trim().toLowerCase()))

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-semibold text-black">Company Name</label>
      <input
        type="text"
        value={value}
        maxLength={50}
        onChange={(event) => {
          onChange(sanitizeText(event.target.value))
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search or type a new company"
        autoComplete="off"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => {
                onChange(company.name)
                setIsOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-accent"
            >
              {company.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ShoeOrderPanel({ shoe, attributeOptions, companies }) {
  const { tag } = useParams()
  const navigate = useNavigate()
  const [activeImage, setActiveImage] = useState(0)
  const [materialGroup, setMaterialGroup] = useState(null)
  const [materialSwatch, setMaterialSwatch] = useState(null)
  const [colorCode, setColorCode] = useState('')
  const [moldTypeChoice, setMoldType] = useState(null)
  const [heelType, setHeelType] = useState(null)
  const [size, setSize] = useState(1)
  const [heelSize, setHeelSize] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [withBuckle, setWithBuckle] = useState('No')
  const [buckleVariant, setBuckleVariant] = useState(null)
  const [withFlatform, setWithFlatform] = useState('No')
  const [withSlingback, setWithSlingback] = useState('No')
  const [manageTarget, setManageTarget] = useState(null)
  const [isPinOpen, setIsPinOpen] = useState(false)
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false)
  const [isBucklePickerOpen, setIsBucklePickerOpen] = useState(false)
  const [closeMatchCompany, setCloseMatchCompany] = useState(null)
  const [clientName, setClientName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactNumber, setContactNumber] = useState(CONTACT_PREFIX)
  const [notes, setNotes] = useState({ blocks: [], drawingRegistry: { current: {} } })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [preview, setPreview] = useState(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const images = shoe.images ?? []

  // A mold type literally named "None" is preselected when the guest hasn't chosen one.
  // Derived rather than pushed into state from an effect, so there's no render where the
  // value is briefly null and no second render to correct it.
  const defaultMoldTypeId =
    (attributeOptions.mold_type ?? []).find((option) => option.name.trim().toLowerCase() === 'none')?.id ?? null
  const moldType = moldTypeChoice ?? defaultMoldTypeId

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined
    const interval = setInterval(() => {
      setCooldownRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining])

  const findOption = (category, id) => (attributeOptions[category] ?? []).find((option) => option.id === id) ?? null
  const materialGroupOption = findOption('material', materialGroup)
  const materialSwatchOption = findOption('material', materialSwatch)
  const materialOption = materialSwatchOption ?? materialGroupOption
  const materialSwatches = (attributeOptions.material ?? []).filter((option) => option.parent_id === materialGroup)
  const moldTypeOption = findOption('mold_type', moldType)
  const heelTypeOption = findOption('heel_type', heelType)
  const buckleOption = findOption('buckle', buckleVariant)
  const flatformOption = attributeOptions.flatform?.[0] ?? null
  const slingbackOption = attributeOptions.slingback?.[0] ?? null

  const selectionBlocks = useMemo(() => {
    const list = []
    if (materialOption) {
      list.push({
        type: 'material',
        label: materialOption.name,
        value: materialOption.swatch_color ?? materialOption.image_url ?? null,
      })
    }
    if (moldTypeOption && moldTypeOption.name.trim().toLowerCase() !== 'none') {
      list.push({ type: 'mold_type', label: moldTypeOption.name, value: moldTypeOption.image_url ?? null })
    }
    if (heelTypeOption) {
      list.push({ type: 'heel_type', label: heelTypeOption.name, value: heelTypeOption.image_url ?? null })
    }
    if (withBuckle === 'Yes') {
      list.push({ type: 'buckle', label: buckleOption?.name ?? 'Yes', value: buckleOption?.image_url ?? null })
    }
    if (withFlatform === 'Yes') {
      list.push({ type: 'flatform', label: flatformOption?.name ?? 'Yes', value: flatformOption?.image_url ?? null })
    }
    if (withSlingback === 'Yes') {
      list.push({ type: 'slingback', label: slingbackOption?.name ?? 'Yes', value: slingbackOption?.image_url ?? null })
    }
    return list
  }, [materialOption, moldTypeOption, heelTypeOption, withBuckle, buckleOption, withFlatform, withSlingback, flatformOption, slingbackOption])

  // Uploads every photo/drawing block and returns the final ordered array to persist on the order.
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

  // Local-only preview (no uploads) of the same array, for the review overlay.
  const buildPreviewBlocks = () => {
    const result = selectionBlocks.map((block) => ({ ...block }))
    for (const block of notes.blocks) {
      if (block.type === 'text') {
        if (block.text?.trim()) result.push({ type: 'text', value: block.text.trim(), label: null })
      } else if (block.type === 'photo') {
        result.push({ type: 'photo', value: URL.createObjectURL(block.file), label: null })
      } else if (block.type === 'drawing') {
        const state = notes.drawingRegistry.current[block.id]
        if (state?.hasDrawn && state.canvasRef?.current) {
          result.push({ type: 'drawing', value: state.canvasRef.current.toDataURL(), label: null })
        }
      }
    }
    return result
  }

  const isFormComplete =
    materialGroup !== null &&
    colorCode.trim() !== '' &&
    moldType !== null &&
    heelType !== null &&
    clientName.trim() !== '' &&
    companyName.trim() !== '' &&
    contactNumber.length === CONTACT_LENGTH

  const handleReviewClick = () => {
    setSubmitError(null)
    if (!clientName.trim()) {
      setSubmitError('Please enter your name.')
      return
    }
    if (contactNumber !== CONTACT_PREFIX && contactNumber.length < CONTACT_LENGTH) {
      setSubmitError('Contact number must be 11 digits.')
      return
    }
    setIsReviewOpen(true)
  }

  const submitOrder = async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const notesBlocks = await buildNotesBlocks()
      await createOrder({
        client_name: clientName.trim(),
        company_name: companyName.trim() || null,
        contact_number: contactNumber === CONTACT_PREFIX ? null : contactNumber,
        shoe_id: shoe.id,
        material_id: materialSwatch ?? materialGroup,
        mold_type_id: moldType,
        heel_type_id: heelType,
        color_code: colorCode.trim() || null,
        size,
        heel_size: heelSize,
        quantity,
        with_buckle: withBuckle === 'Yes',
        buckle_id: withBuckle === 'Yes' ? buckleVariant : null,
        with_flatform: withFlatform === 'Yes',
        with_slingback: withSlingback === 'Yes',
        unit_price: shoe.price,
        notes_blocks: notesBlocks,
      })
      setIsReviewOpen(false)
      setIsSuccessOpen(true)
      setCooldownRemaining(POST_ORDER_COOLDOWN_MS / 1000)
    } catch (err) {
      const detail = err instanceof ApiError && typeof err.detail === 'string' ? err.detail : null
      setSubmitError(detail ?? 'Could not submit your order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmOrder = () => {
    const trimmedName = companyName.trim()
    if (trimmedName) {
      const exactMatch = companies.some((company) => company.name.trim().toLowerCase() === trimmedName.toLowerCase())
      if (!exactMatch) {
        const closeMatch = findCloseMatchingCompany(trimmedName, companies)
        if (closeMatch) {
          setIsReviewOpen(false)
          setCloseMatchCompany(closeMatch)
          return
        }
      }
    }
    submitOrder()
  }

  const handleConfirmCloseMatch = () => {
    setCloseMatchCompany(null)
    submitOrder()
  }

  const buildOrderSummaryText = () => {
    const noteText = notes.blocks
      .filter((block) => block.type === 'text' && block.text?.trim())
      .map((block) => block.text.trim())
      .join(' / ')
    const lines = [
      `${shoe.name} - ₱${shoe.price.toLocaleString()} each`,
      materialOption && `Material: ${materialOption.name}`,
      colorCode && `Color/Code: ${colorCode}`,
      moldTypeOption && `Mold Type: ${moldTypeOption.name}`,
      heelTypeOption && `Heel Type: ${heelTypeOption.name}`,
      `Buckle: ${withBuckle}`,
      `Flatform: ${withFlatform}`,
      `Slingback: ${withSlingback}`,
      `Size: ${size}`,
      `Heel Size: ${heelSize}`,
      `Quantity: ${quantity}`,
      noteText && `Notes: ${noteText}`,
      `Name: ${clientName}`,
      companyName && `Company: ${companyName}`,
      contactNumber !== CONTACT_PREFIX && `Contact #: ${contactNumber}`,
      `Total: ₱${(shoe.price * quantity).toLocaleString()}`,
    ].filter(Boolean)
    return lines.join('\n')
  }

  const handleMessengerShare = async () => {
    const summary = buildOrderSummaryText()
    if (navigator.share) {
      try {
        await navigator.share({ text: summary, title: 'Order Summary' })
        return
      } catch {
        // user cancelled the share sheet, or this payload isn't shareable here — fall back below
      }
    }
    try {
      await navigator.clipboard.writeText(summary)
    } catch {
      // clipboard access can fail (e.g. insecure context) — opening Messenger below still helps
    }
    window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer')
  }

  const handleViberShare = async () => {
    const summary = buildOrderSummaryText()
    try {
      await navigator.clipboard.writeText(summary)
    } catch {
      // clipboard access can fail (e.g. insecure context) - the forward dialog still opens
    }
    window.open(`viber://forward?text=${encodeURIComponent(summary)}`, '_blank', 'noopener,noreferrer')
  }

  const handleOwnerViberChat = async () => {
    const summary = buildOrderSummaryText()
    try {
      await navigator.clipboard.writeText(summary)
    } catch {
      // clipboard access can fail (e.g. insecure context) - the chat still opens, just unpasted
    }
    window.open(`viber://chat?number=${encodeURIComponent(OWNER_VIBER_NUMBER)}`, '_blank', 'noopener,noreferrer')
  }

  const handleManageClick = async (target) => {
    const ok = await isDeviceRecognized()
    if (!ok) {
      navigate('/403')
      return
    }
    setManageTarget(target)
    setIsPinOpen(true)
  }

  const handlePinSuccess = () => {
    setIsPinOpen(false)
    navigate(`/collection/${tag}/manage`, { state: { initialTab: manageTarget } })
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-2">
      <div>
        {images[activeImage] ? (
          <img
            src={images[activeImage].image_url}
            alt={shoe.name}
            onClick={() => setIsLightboxOpen(true)}
            className="aspect-square w-full cursor-zoom-in rounded-lg object-cover"
          />
        ) : (
          <ImagePlaceholder className="aspect-square w-full rounded-lg" />
        )}

        {images.length > 1 && (
          <div className="mt-4 flex gap-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${
                  activeImage === index ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img src={image.image_url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-gray-300 border-l-4 border-l-primary bg-white p-4 text-sm text-gray-600">
          {shoe.description}
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-bold text-black">{shoe.name}</h1>
        <p className="mt-1 text-gray-600">₱{shoe.price.toLocaleString()}</p>

        <div className="mt-5 flex flex-col gap-5">
          <PillGroup
            label="Select Material"
            options={(attributeOptions.material ?? []).filter((option) => !option.parent_id)}
            value={materialGroup}
            onChange={(id) => {
              setMaterialGroup(id)
              setMaterialSwatch(null)
              setColorCode('')
              setIsMaterialPickerOpen(true)
            }}
          />

          {materialGroupOption && (
            <button
              type="button"
              onClick={() => setIsMaterialPickerOpen(true)}
              className="flex w-fit items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-black"
            >
              {materialSwatchOption ? (
                <span
                  className="h-5 w-5 shrink-0 rounded"
                  style={materialSwatchOption.swatch_color ? { backgroundColor: materialSwatchOption.swatch_color } : undefined}
                >
                  {materialSwatchOption.image_url && (
                    <img src={materialSwatchOption.image_url} alt="" className="h-full w-full rounded object-cover" />
                  )}
                </span>
              ) : null}
              {materialSwatchOption ? `Color: ${materialSwatchOption.name}` : 'Choose Color'}
            </button>
          )}

          <SwatchPicker
            isOpen={isMaterialPickerOpen}
            onClose={() => setIsMaterialPickerOpen(false)}
            title={`${materialGroupOption?.name ?? ''} Leather Colors`}
            instructionText="Tap an available color to select it and auto-fill the color input."
            items={materialSwatches}
            selectedId={materialSwatch}
            onSelect={(swatch) => {
              setMaterialSwatch(swatch.id)
              setColorCode(swatch.name)
              setIsMaterialPickerOpen(false)
            }}
            onManageClick={() => handleManageClick('materials')}
            manageLabel="Manage Swatches"
          />

          <div>
            <label className="text-sm font-semibold text-black">Enter Color / Code</label>
            <input
              type="text"
              value={colorCode}
              maxLength={50}
              onChange={(event) => setColorCode(sanitizeText(event.target.value))}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <PillGroup
            label="Select Mold Type"
            options={attributeOptions.mold_type ?? []}
            value={moldType}
            onChange={setMoldType}
            onPreview={(option) => setPreview({ title: option.name, imageUrl: option.image_url })}
          />
          <PillGroup
            label="Select Heel Type"
            options={attributeOptions.heel_type ?? []}
            value={heelType}
            onChange={setHeelType}
            onPreview={(option) => setPreview({ title: option.name, imageUrl: option.image_url })}
          />

          <div className="grid grid-cols-3 gap-4">
            <NumberInput label="Size" value={size} onChange={setSize} min={1} max={125} />
            <NumberSelect label="Heel Size" value={heelSize} onChange={setHeelSize} />
            <NumberInput label="Quantity" value={quantity} onChange={setQuantity} min={1} max={100} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <YesNoToggle
              label="With Buckle?"
              value={withBuckle}
              onChange={(value) => {
                setWithBuckle(value)
                if (value === 'No') setBuckleVariant(null)
                else setIsBucklePickerOpen(true)
              }}
            />
            <YesNoToggle
              label="With Flatform?"
              value={withFlatform}
              onChange={setWithFlatform}
              onYes={() => {
                const flatform = attributeOptions.flatform?.[0]
                if (flatform?.image_url) setPreview({ title: 'Flatform', imageUrl: flatform.image_url })
              }}
            />
            <YesNoToggle
              label="With Slingback?"
              value={withSlingback}
              onChange={setWithSlingback}
              onYes={() => {
                const slingback = attributeOptions.slingback?.[0]
                if (slingback?.image_url) setPreview({ title: 'Slingback', imageUrl: slingback.image_url })
              }}
            />
          </div>

          {withBuckle === 'Yes' && (
            <button
              type="button"
              onClick={() => setIsBucklePickerOpen(true)}
              className="flex w-fit items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-black"
            >
              {buckleOption ? (
                <span className="h-5 w-5 shrink-0 overflow-hidden rounded">
                  {buckleOption.image_url && (
                    <img src={buckleOption.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
              ) : null}
              {buckleOption ? `Buckle: ${buckleOption.name}` : 'Choose Buckle'}
            </button>
          )}

          <SwatchPicker
            isOpen={isBucklePickerOpen}
            onClose={() => setIsBucklePickerOpen(false)}
            title="Buckle Variants"
            instructionText="Tap an available buckle to select it."
            items={attributeOptions.buckle ?? []}
            selectedId={buckleVariant}
            onSelect={(variant) => {
              setBuckleVariant(variant.id)
              setIsBucklePickerOpen(false)
            }}
            onManageClick={() => handleManageClick('buckles')}
            manageLabel="Manage Buckles"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-black">Enter Name</label>
              <input
                type="text"
                value={clientName}
                maxLength={50}
                onChange={(event) => setClientName(sanitizeText(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <CompanyCombobox companies={companies} value={companyName} onChange={setCompanyName} />
            <div>
              <label className="text-sm font-semibold text-black">Contact #</label>
              <PhoneNumberInput value={contactNumber} onChange={setContactNumber} className="mt-2" />
            </div>
          </div>

          <NotesEditor selectionBlocks={selectionBlocks} onChange={setNotes} />

          {submitError && !isReviewOpen && <p className="text-sm font-semibold text-danger">{submitError}</p>}
          <button
            type="button"
            onClick={handleReviewClick}
            disabled={cooldownRemaining > 0 || !isFormComplete}
            className="w-full rounded-lg bg-neutral-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {cooldownRemaining > 0 ? `Please wait ${cooldownRemaining}s…` : 'Review Order'}
          </button>
        </div>
      </div>

      <ImagePreviewOverlay
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title}
        imageUrl={preview?.imageUrl}
      />

      {isLightboxOpen && (
        <ImageLightbox images={images} initialIndex={activeImage} onClose={() => setIsLightboxOpen(false)} />
      )}

      <PinOverlay
        isOpen={isPinOpen}
        onClose={() => setIsPinOpen(false)}
        onSubmit={verifyPin}
        onSuccess={handlePinSuccess}
      />

      <CloseMatchCompanyOverlay
        isOpen={Boolean(closeMatchCompany)}
        newName={companyName.trim()}
        existingName={closeMatchCompany?.name}
        onConfirm={handleConfirmCloseMatch}
        onCancel={() => setCloseMatchCompany(null)}
      />

      <ReviewOrderOverlay
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirmOrder}
        isSubmitting={isSubmitting}
        shoe={shoe}
        material={materialOption}
        colorCode={colorCode}
        moldType={moldTypeOption}
        heelType={heelTypeOption}
        withBuckle={withBuckle}
        withFlatform={withFlatform}
        withSlingback={withSlingback}
        size={size}
        heelSize={heelSize}
        quantity={quantity}
        notesBlocks={isReviewOpen ? buildPreviewBlocks() : []}
        clientName={clientName}
        companyName={companyName}
        contactNumber={contactNumber === CONTACT_PREFIX ? '' : contactNumber}
      />
      {submitError && isReviewOpen && (
        <div className="fixed inset-x-0 bottom-4 z-[70] mx-auto w-fit rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {submitError}
        </div>
      )}

      <OrderSuccessOverlay
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        companyName={companyName.trim()}
        clientName={clientName}
        onViberShare={handleViberShare}
        onOwnerViberChat={handleOwnerViberChat}
        onMessengerShare={handleMessengerShare}
      />
    </div>
  )
}

export default function ShoeDetails() {
  const { tag, shoeId } = useParams()
  const navigate = useNavigate()
  const [shoe, setShoe] = useState(null)
  const [shoes, setShoes] = useState([])
  const [attributeOptions, setAttributeOptions] = useState({})
  const [companies, setCompanies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const groupAttributeOptions = (attributesData) =>
    attributesData.reduce((acc, option) => {
      // Out-of-stock material swatches and buckle variants still need to show (as
      // disabled/"Unavailable") so guests can see what's coming back - only a fully
      // hidden material group (no parent) or a hidden mold/heel/flatform/slingback
      // option should disappear entirely.
      const keepInactive = option.category === 'buckle' || (option.category === 'material' && option.parent_id)
      if (!option.is_active && !keepInactive) return acc
      acc[option.category] = acc[option.category] ?? []
      acc[option.category].push(option)
      return acc
    }, {})

  useEffect(() => {
    let cancelled = false

    // getShoe(shoeId) is what actually renders this page — it returns the shoe even when it
    // is hidden, so a hidden shoe's URL no longer reports "Shoe not found". listShoes() is
    // still fetched, but only to power the Prev/Next arrows through the visible catalogue.
    Promise.all([getShoe(shoeId), listShoes(), listAttributeOptions(), listCompanies()])
      .then(([shoeData, shoesData, attributesData, companiesData]) => {
        if (cancelled) return
        setShoe(shoeData)
        setShoes(shoesData)
        setAttributeOptions(groupAttributeOptions(attributesData))
        setCompanies(companiesData)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this shoe right now.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [shoeId])

  const sortedShoes = useMemo(
    () => [...shoes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [shoes],
  )
  const currentIndex = sortedShoes.findIndex((item) => item.id === shoeId)
  const prevShoe = currentIndex > 0 ? sortedShoes[currentIndex - 1] : null
  const nextShoe = currentIndex >= 0 && currentIndex < sortedShoes.length - 1 ? sortedShoes[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-accent">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(`/collection/${tag}`)}
          className="flex items-center gap-2 text-sm font-semibold text-black"
        >
          <ArrowLeft size={16} />
          Back to Collections
        </button>

        <div className="flex items-center overflow-hidden rounded-full bg-black text-sm font-semibold">
          <button
            type="button"
            disabled={!prevShoe}
            onClick={() => prevShoe && navigate(`/collection/${tag}/shoe/${prevShoe.id}`)}
            className="flex items-center gap-1 px-4 py-2 text-white/50 disabled:cursor-not-allowed enabled:text-white enabled:hover:opacity-80"
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="h-4 w-px bg-white/20" />
          <button
            type="button"
            disabled={!nextShoe}
            onClick={() => nextShoe && navigate(`/collection/${tag}/shoe/${nextShoe.id}`)}
            className="flex items-center gap-1 px-4 py-2 text-white/50 disabled:cursor-not-allowed enabled:text-white enabled:hover:opacity-80"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading..." />
      ) : loadError ? (
        <p className="px-6 py-12 text-center text-danger">{loadError}</p>
      ) : !shoe ? (
        <p className="px-6 py-12 text-center text-gray-500">Shoe not found.</p>
      ) : (
        <ShoeOrderPanel key={shoe.id} shoe={shoe} attributeOptions={attributeOptions} companies={companies} />
      )}
    </div>
  )
}
