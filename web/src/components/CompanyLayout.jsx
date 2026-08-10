import { Outlet } from 'react-router-dom'
import CompanyHeader from './CompanyHeader.jsx'

export default function CompanyLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyHeader />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
