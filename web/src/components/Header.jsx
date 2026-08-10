import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Collection', to: '/collection' },
  { label: 'Contact', to: '/contact' },
  { label: 'About Us', to: '/about' },
  { label: 'Admin', to: '/login' },
]

const navLinkClasses = ({ isActive }) =>
  `pb-1 text-sm tracking-wide transition-colors hover:text-gray-400 ${
    isActive ? 'border-b-2 border-white text-white' : 'border-b-2 border-transparent text-white/90'
  }`

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pendingDestination, setPendingDestination] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Any nav link (or the logo) click while managing a collection would silently drop
  // out of Manage Mode without warning — confirm first, whichever tab they're headed to.
  const isManageMode = /^\/collection\/[^/]+\/manage$/.test(location.pathname)

  const confirmExit = () => {
    const destination = pendingDestination
    setPendingDestination(null)
    if (destination) navigate(destination)
  }

  const interceptIfManaging = (to) => (event) => {
    if (!isManageMode) return
    event.preventDefault()
    setIsMenuOpen(false)
    setPendingDestination(to)
  }

  const renderLink = (link, onNavigate) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.to === '/'}
      onClick={(event) => {
        interceptIfManaging(link.to)(event)
        if (!event.defaultPrevented) onNavigate?.()
      }}
      className={navLinkClasses}
    >
      {link.label}
    </NavLink>
  )

  return (
    <header className="bg-primary">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <NavLink
          to="/"
          onClick={interceptIfManaging('/')}
          className="font-serif-display text-2xl font-bold text-white"
        >
          Theresa Shoes
        </NavLink>

        <nav className="hidden items-center gap-8 md:flex">{NAV_LINKS.map((link) => renderLink(link))}</nav>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="text-white md:hidden"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-4 border-t border-white/10 px-6 py-4 md:hidden">
          {NAV_LINKS.map((link) => renderLink(link, () => setIsMenuOpen(false)))}
        </nav>
      )}

      {pendingDestination !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setPendingDestination(null)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-accent p-8 text-center shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPendingDestination(null)}
              aria-label="Close"
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-black">Do you want to exit manage mode?</h2>

            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setPendingDestination(null)}
                className="rounded-lg bg-danger px-8 py-2 font-semibold text-white transition-opacity hover:opacity-90"
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="rounded-lg bg-success px-8 py-2 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
