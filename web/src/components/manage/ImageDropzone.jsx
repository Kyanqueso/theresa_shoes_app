import { ImagePlus } from 'lucide-react'

export default function ImageDropzone({ label, previewUrl, onFileSelect }) {
  return (
    <div>
      {label && <p className="text-sm font-semibold text-black">{label}</p>}
      <label className="mt-2 flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-primary/40 bg-white text-primary transition-colors hover:bg-primary/5">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus size={28} />
            <span className="text-sm font-semibold">Add Photo</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
    </div>
  )
}
