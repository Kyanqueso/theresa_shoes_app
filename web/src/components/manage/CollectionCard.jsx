import { EyeOff } from 'lucide-react'
import ImagePlaceholder from '../ImagePlaceholder.jsx'

const ACTION_COLS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }

export default function CollectionCard({
  image,
  title,
  titleClassName = '',
  titleRight,
  badge,
  isHidden,
  subtitle,
  meta,
  actions = [],
}) {
  return (
    <div className="overflow-hidden rounded-md bg-accent shadow-md">
      <div className="relative">
        <div className={isHidden ? 'pointer-events-none blur-sm' : ''}>
          <div className="relative">
            {image ? (
              <img src={image} alt={title} className="aspect-square w-full object-cover" />
            ) : (
              <ImagePlaceholder className="aspect-square w-full" />
            )}
            {badge && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white">
                {badge}
              </span>
            )}
          </div>

          <div className="p-4">
            <div className="flex items-end justify-between gap-2">
              <h3 className={`font-bold text-black ${titleClassName}`}>{title}</h3>
              {titleRight}
            </div>
            {subtitle && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{subtitle}</p>}
            {meta}
          </div>
        </div>

        {isHidden && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
            <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-black/70 text-white">
              <EyeOff size={22} />
            </span>
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              Hidden
            </span>
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div
          className={`grid ${ACTION_COLS[actions.length] ?? 'grid-cols-3'} divide-x divide-gray-300 border-t border-gray-300 text-sm font-semibold`}
        >
          {actions}
        </div>
      )}
    </div>
  )
}
