import { Link } from 'react-router-dom'

export default function ErrorPage({ icon: Icon, code, title, message }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 text-center">
      <Icon size={48} strokeWidth={1.5} className="text-primary" />
      <p className="mt-6 font-serif-display text-5xl font-bold text-black">{code}</p>
      <h1 className="mt-2 text-xl font-bold text-black">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-600">{message}</p>
      <Link
        to="/"
        className="mt-8 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  )
}
