export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      {Icon && <Icon size={40} strokeWidth={1.5} className="text-primary" />}
      <h2 className="mt-4 text-lg font-bold text-black">{title}</h2>
      {message && <p className="mt-1 max-w-sm text-sm text-gray-500">{message}</p>}
    </div>
  )
}
