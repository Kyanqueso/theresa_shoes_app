import { X } from 'lucide-react'
import NotesBlockList from './NotesBlockList.jsx'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  )
}

function SectionTitle({ children }) {
  return <p className="mt-4 text-sm font-bold text-black first:mt-0">{children}</p>
}

export default function ReviewOrderOverlay({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  shoe,
  material,
  colorCode,
  moldType,
  heelType,
  withBuckle,
  withFlatform,
  withSlingback,
  size,
  heelSize,
  quantity,
  notesBlocks,
  clientName,
  companyName,
  contactNumber,
}) {
  if (!isOpen) return null

  const totalPrice = shoe.price * quantity

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-accent shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-black/10 px-6 py-4">
          <h3 className="text-lg font-bold text-black">Review the order</h3>
          <p className="text-sm text-gray-500">
            {shoe.name} - ₱{shoe.price.toLocaleString()} each
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-gray-500 hover:text-black"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <SectionTitle>Customization</SectionTitle>
          <div className="divide-y divide-gray-200/70">
            <Row label="Material" value={material?.name ?? '—'} />
            <Row label="Color/Code" value={colorCode || '—'} />
            <Row label="Mold Type" value={moldType?.name ?? '—'} />
            <Row label="Heel Type" value={heelType?.name ?? '—'} />
            <Row label="Buckle" value={withBuckle} />
            <Row label="Flatform" value={withFlatform} />
            <Row label="Slingback" value={withSlingback} />
          </div>

          <SectionTitle>Fit</SectionTitle>
          <div className="divide-y divide-gray-200/70">
            <Row label="Size" value={size} />
            <Row label="Heel Size" value={heelSize} />
            <Row label="Quantity" value={quantity} />
          </div>

          {notesBlocks?.length > 0 && (
            <>
              <SectionTitle>Notes</SectionTitle>
              <div className="rounded-xl bg-white p-3">
                <NotesBlockList blocks={notesBlocks} />
              </div>
            </>
          )}

          <SectionTitle>Contact</SectionTitle>
          <div className="divide-y divide-gray-200/70">
            <Row label="Name" value={clientName} />
            <Row label="Company" value={companyName || '—'} />
            <Row label="Contact #" value={contactNumber || '—'} />
          </div>
        </div>

        <div className="border-t border-black/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-black">Total Price</span>
            <span className="text-lg font-bold text-black">₱{totalPrice.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="mt-3 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting…' : 'Confirm Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
