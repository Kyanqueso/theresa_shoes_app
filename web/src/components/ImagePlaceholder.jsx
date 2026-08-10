import { Image } from 'lucide-react'

export default function ImagePlaceholder({ className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-gray-300 text-gray-500 ${className}`}>
      <Image size={32} strokeWidth={1.5} />
    </div>
  )
}
