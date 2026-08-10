import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticated } from '../lib/auth.js'

export default function RequireAdmin({ redirectTo = '/login' }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return <Outlet />
}
