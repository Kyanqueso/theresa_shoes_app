import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'

const MIN_ZOOM = 1
const MAX_ZOOM = 3

export default function ImageLightbox({ isOpen, images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const imageRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex)
      setZoom(1)
    }
  }, [isOpen, initialIndex])

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goTo(Math.max(0, index - 1))
      if (event.key === 'ArrowRight') goTo(Math.min(images.length - 1, index + 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, index, images.length])

  // React's synthetic onWheel is passive, so preventDefault() there is a no-op (and warns).
  // Attach a real, non-passive listener so scrolling to zoom doesn't also scroll the page behind it.
  useEffect(() => {
    if (!isOpen) return undefined
    const node = imageRef.current
    if (!node) return undefined
    const handleWheel = (event) => {
      event.preventDefault()
      setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current - event.deltaY * 0.001)))
    }
    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [isOpen, index])

  if (!isOpen) return null

  const goTo = (newIndex) => {
    setIndex(newIndex)
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 text-white hover:opacity-80"
      >
        <X size={28} />
      </button>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-16" onClick={(event) => event.stopPropagation()}>
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(Math.max(0, index - 1))}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-4 text-white disabled:opacity-30"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <img
          ref={imageRef}
          src={images[index]?.image_url}
          alt=""
          style={{ transform: `scale(${zoom})` }}
          className="max-h-full max-w-full cursor-zoom-in select-none object-contain transition-transform duration-150"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(Math.min(images.length - 1, index + 1))}
            disabled={index === images.length - 1}
            aria-label="Next photo"
            className="absolute right-4 text-white disabled:opacity-30"
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pb-3 text-xs text-white/70">
        <ZoomOut size={14} />
        Scroll to zoom
        <ZoomIn size={14} />
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto pb-6" onClick={(event) => event.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                i === index ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
