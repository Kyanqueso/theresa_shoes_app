import ImagePlaceholder from './ImagePlaceholder.jsx'

// Read-only renderer for an ordered notes_blocks array (matches the backend NotesBlock
// shape: {type, value, label}). Reused for the live selection-blocks row in the order
// form's NotesEditor and for the full note preview in ReviewOrderOverlay.
export default function NotesBlockList({ blocks }) {
  if (!blocks || blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          if (!block.value) return null
          return (
            <p key={index} className="text-sm text-gray-600">
              {block.value}
            </p>
          )
        }

        if (block.type === 'photo' || block.type === 'drawing') {
          if (!block.value) return null
          return (
            <img
              key={index}
              src={block.value}
              alt=""
              className="h-36 w-36 rounded-lg border border-gray-200 object-cover sm:h-48 sm:w-48"
            />
          )
        }

        // Selection block (material / mold_type / heel_type / buckle / flatform / slingback)
        const isSwatch = typeof block.value === 'string' && block.value.startsWith('#')
        return (
          <div key={index} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
            {isSwatch ? (
              <div className="h-8 w-8 shrink-0 rounded" style={{ backgroundColor: block.value }} />
            ) : block.value ? (
              <img src={block.value} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
            ) : (
              <ImagePlaceholder className="h-8 w-8 shrink-0 rounded" />
            )}
            <span className="text-xs font-semibold text-gray-600">
              {block.type.replace('_', ' ')}: <span className="text-black">{block.label}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
