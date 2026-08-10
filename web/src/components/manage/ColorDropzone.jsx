import { Palette } from 'lucide-react'

export default function ColorDropzone({ label, color, onChange }) {
  return (
    <div>
      {label && <p className="text-sm font-semibold text-black">{label}</p>}
      <label
        className="mt-2 flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 transition-opacity hover:opacity-90"
        style={{ backgroundColor: color || '#ffffff' }}
      >
        <div
          className={`flex flex-col items-center gap-2 rounded-md px-3 py-2 ${
            color ? 'bg-black/40 text-white' : 'text-primary'
          }`}
        >
          <Palette size={24} />
          <span className="text-sm font-semibold">{color ? 'Change Color' : 'Add Color'}</span>
        </div>
        <input
          type="color"
          value={color || '#8b5a2b'}
          onChange={(event) => onChange(event.target.value)}
          className="hidden"
        />
      </label>
    </div>
  )
}
