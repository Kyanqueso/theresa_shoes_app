import { ShoppingBag, X } from 'lucide-react'
import { setAttributeAvailability } from '../lib/attributesApi.js'

function SwatchTile({ item, selected, disabled, onClick, onDragStart }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onDragStart(event, item.id)}
      onClick={onClick}
      className="flex cursor-grab flex-col items-center gap-2 rounded-lg p-2 text-left transition-opacity hover:opacity-80 active:cursor-grabbing"
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
  onChanged,
  onManageClick,
  manageLabel = 'Manage Swatches',
}) {
  if (!isOpen) return null

  const available = items.filter((item) => item.is_active)
  const unavailable = items.filter((item) => !item.is_active)

  const handleDragStart = (event, itemId) => {
    event.dataTransfer.setData('text/plain', itemId)
  }

  // Public, unauthenticated toggle by design — anyone can drag a swatch/variant between
  // Available and Unavailable here, per client request.
  const handleDrop = async (event, targetActive) => {
    event.preventDefault()
    const itemId = event.dataTransfer.getData('text/plain')
    const item = items.find((option) => option.id === itemId)
    if (!item || item.is_active === targetActive) return
    try {
      await setAttributeAvailability(itemId, targetActive)
      onChanged?.()
    } catch {
      // best-effort - if this fails the item just stays where it was
    }
  }

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
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, true)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-white p-3 sm:grid-cols-4 md:grid-cols-5"
          >
            {available.length === 0 && <p className="col-span-full py-4 text-center text-sm text-gray-400">None available yet.</p>}
            {available.map((item) => (
              <SwatchTile
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onClick={() => onSelect(item)}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-semibold text-black">
            Unavailable <span className="ml-1 font-normal text-golden-brown">{unavailable.length} Unavailable</span>
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, false)}
            className="mt-2 grid min-h-24 grid-cols-3 gap-3 rounded-lg bg-gray-100 p-3 sm:grid-cols-4 md:grid-cols-5"
          >
            {unavailable.length === 0 && <p className="col-span-full py-4 text-center text-sm text-gray-400">Nothing here.</p>}
            {unavailable.map((item) => (
              <SwatchTile key={item.id} item={item} disabled onDragStart={handleDragStart} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
