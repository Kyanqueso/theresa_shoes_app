import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Pencil, Trash2, Undo2, X } from 'lucide-react'
import NotesBlockList from './NotesBlockList.jsx'
import { sanitizeText } from '../lib/textInput.js'

const NOTE_COLORS = ['#000000', '#ef4444', '#2563eb', '#16a34a']

function TextBlock({ value, onChange }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(sanitizeText(event.target.value))}
      maxLength={50}
      rows={2}
      placeholder="Type here..."
      className="w-full resize-none rounded-lg border-0 bg-transparent px-0.5 py-1 text-sm text-gray-700 focus:outline-none focus:ring-0"
    />
  )
}

function PhotoBlock({ file, onRemove }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  return (
    <div className="relative inline-block">
      <img
        src={previewUrl}
        alt=""
        className="h-36 w-36 rounded-lg border border-gray-200 object-cover sm:h-48 sm:w-48"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
      >
        <X size={12} />
      </button>
    </div>
  )
}

function DrawingBlock({ onRemove, onStateChange }) {
  const [color, setColor] = useState(NOTE_COLORS[0])
  const [hasDrawn, setHasDrawn] = useState(false)
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const historyRef = useRef([])

  useEffect(() => {
    onStateChange({ canvasRef, hasDrawn })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrawn])

  const startDraw = (event) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    // Pointer capture keeps drag events targeting this canvas even if a finger drifts
    // slightly off it mid-stroke — without it, touch drawing drops strokes constantly.
    canvas.setPointerCapture?.(event.pointerId)
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    isDrawingRef.current = true
    setHasDrawn(true)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
  }

  const draw = (event) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
    ctx.stroke()
  }

  const stopDraw = () => {
    isDrawingRef.current = false
  }

  const handleUndo = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const last = historyRef.current.pop()
    if (last) ctx.putImageData(last, 0, 0)
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (historyRef.current.length === 0) setHasDrawn(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    historyRef.current = []
    setHasDrawn(false)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {NOTE_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Use ${swatch} pen color`}
              onClick={() => setColor(swatch)}
              className={`h-5 w-5 rounded-full border-2 ${color === swatch ? 'border-black' : 'border-transparent'}`}
              style={{ backgroundColor: swatch }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Custom pen color"
            className="h-5 w-5 cursor-pointer rounded-full border border-gray-300 p-0"
          />
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <button type="button" onClick={handleUndo} aria-label="Undo last stroke" className="hover:text-black">
            <Undo2 size={14} />
          </button>
          <button type="button" onClick={handleClear} aria-label="Clear drawing" className="hover:text-black">
            <Trash2 size={14} />
          </button>
          <button type="button" onClick={onRemove} aria-label="Remove drawing" className="hover:text-danger">
            <X size={14} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={130}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={stopDraw}
        onPointerLeave={stopDraw}
        onPointerCancel={stopDraw}
        className="max-w-full touch-none rounded-lg border border-gray-200 bg-white"
      />
    </div>
  )
}

let blockIdCounter = 0
const nextBlockId = () => `block-${++blockIdCounter}`

function ensureTrailingText(list) {
  if (list.length === 0 || list[list.length - 1].type !== 'text') {
    return [...list, { id: nextBlockId(), type: 'text', text: '' }]
  }
  return list
}

export default function NotesEditor({ selectionBlocks, onChange }) {
  const [blocks, setBlocks] = useState(() => [{ id: nextBlockId(), type: 'text', text: '' }])
  const drawingRegistry = useRef({})

  useEffect(() => {
    onChange?.({ blocks, drawingRegistry })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  const addPhoto = (file) => {
    setBlocks((current) => ensureTrailingText([...current, { id: nextBlockId(), type: 'photo', file }]))
  }

  const addDrawing = () => {
    setBlocks((current) => ensureTrailingText([...current, { id: nextBlockId(), type: 'drawing' }]))
  }

  const updateText = (id, text) => {
    setBlocks((current) => current.map((block) => (block.id === id ? { ...block, text } : block)))
  }

  const removeBlock = (id) => {
    delete drawingRegistry.current[id]
    setBlocks((current) => ensureTrailingText(current.filter((block) => block.id !== id)))
  }

  return (
    <div>
      <p className="text-sm font-semibold text-black">Notes</p>
      <div className="mt-2 rounded-lg border border-gray-300 bg-white p-3">
        {selectionBlocks.length > 0 && (
          <div className="mb-3 border-b border-gray-100 pb-3">
            <NotesBlockList blocks={selectionBlocks} />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {blocks.map((block) => {
            if (block.type === 'text') {
              return <TextBlock key={block.id} value={block.text} onChange={(value) => updateText(block.id, value)} />
            }
            if (block.type === 'photo') {
              return <PhotoBlock key={block.id} file={block.file} onRemove={() => removeBlock(block.id)} />
            }
            if (block.type === 'drawing') {
              return (
                <DrawingBlock
                  key={block.id}
                  onRemove={() => removeBlock(block.id)}
                  onStateChange={(state) => {
                    drawingRegistry.current[block.id] = state
                  }}
                />
              )
            }
            return null
          })}
        </div>

        <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:text-black">
            <ImagePlus size={14} />
            Insert Photo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) addPhoto(file)
                event.target.value = ''
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={addDrawing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:text-black"
          >
            <Pencil size={14} />
            Scribble
          </button>
        </div>
      </div>
    </div>
  )
}
