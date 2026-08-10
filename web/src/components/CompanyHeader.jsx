import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PillNav from './PillNav.jsx'
import LogoutButton from './LogoutButton.jsx'

export default function CompanyHeader() {
  const navigate = useNavigate()
  const { companyId } = useParams()

  const NAV_LINKS = [
    { label: 'Current Orders', to: `/admin/companies/${companyId}/orders` },
    { label: 'Payment & Delivery', to: `/admin/companies/${companyId}/payments` },
    { label: 'Completed Orders', to: `/admin/companies/${companyId}/complete-orders` },
  ]

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-y-2 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={() => navigate('/admin/companies')}
          aria-label="Back to companies"
          className="order-1 flex h-9 w-9 items-center justify-center self-start rounded-lg border border-gray-300 text-gray-600 transition-colors hover:text-black sm:h-10 sm:w-10 sm:self-auto"
        >
          <ArrowLeft size={16} />
        </button>

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
