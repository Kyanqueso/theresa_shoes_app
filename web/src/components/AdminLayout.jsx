import { Outlet } from 'react-router-dom'
import AdminHeader from './AdminHeader.jsx'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
