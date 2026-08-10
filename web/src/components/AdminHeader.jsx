import PillNav from './PillNav.jsx'
import LogoutButton from './LogoutButton.jsx'

const NAV_LINKS = [
  { label: 'Clients', to: '/admin/companies' },
  { label: 'Analytics', to: '/admin/analytics' },
]

export default function AdminHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-y-2 sm:px-6 sm:py-4">
        <span className="order-1 font-serif-display text-lg font-bold text-primary sm:text-2xl">Theresa Shoes</span>
        <div className="order-2">
          <PillNav links={NAV_LINKS} />
        </div>
        <div className="order-3">
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
