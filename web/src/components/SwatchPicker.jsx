import { ShoppingBag, X } from 'lucide-react'

function SwatchTile({ item, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-lg p-2 text-left transition-opacity ${
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-80'
      }`}
    >
      <div
        className={`aspect-[3/4] w-full rounded-md border-2 ${
          selected ? 'border-primary' : 'border-black/10'
        } ${item.image_url ? 'overflow-hidden' : ''}`}
        style={item.swatch_color ? { backgroundColor: item.swatch_color } : undefined}
      >
        {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
      </div>
      <p className="text-sm font-medium text-black">{item.name}</p>
      {disabled && <p className="-mt-1 text-xs font-semibold text-golden-brown">OUT OF STOCK</p>}
    </button>
  )
}

export default function SwatchPicker({
  isOpen,
  onClose,
  title,
  instructionText,
  items,
  selectedId,
  onSelect,
  onManageClick,
  manageLabel = 'Manage Swatches',
}) {
  if (!isOpen) return null

  const available = items.filter((item) => item.is_active)
  const unavailable = items.filter((item) => !item.is_active)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-accent p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
          <div>
            <h3 className="font-serif-display text-xl font-bold text-black">{title}</h3>
            {instructionText && <p className="mt-1 text-xs text-gray-500">{instructionText}</p>}
          </div>
          {onManageClick && (
            <button
              type="button"
              onClick={onManageClick}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:text-sm"
            >
              <ShoppingBag size={14} />
              {manageLabel}
            </button>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-black">
            Available <span className="ml-1 font-normal text-gray-500">{available.length} In Stock</span>
          </p>
          <div className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-white p-3 sm:grid-cols-4 md:grid-cols-5">
            {available.length === 0 && <p className="col-span-full py-4 text-center text-sm text-gray-400">None available yet.</p>}
            {available.map((item) => (
              <SwatchTile key={item.id} item={item} selected={selectedId === item.id} onClick={() => onSelect(item)} />
            ))}
          </div>
        </div>

        {unavailable.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-black">
              Unavailable <span className="ml-1 font-normal text-golden-brown">{unavailable.length} Unavailable</span>
            </p>
            <div className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-gray-100 p-3 sm:grid-cols-4 md:grid-cols-5">
              {unavailable.map((item) => (
                <SwatchTile key={item.id} item={item} disabled />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
