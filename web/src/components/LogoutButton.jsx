import { useNavigate } from 'react-router-dom'
import ConfirmButton from './ConfirmButton.jsx'
import { logout } from '../lib/auth.js'

export default function LogoutButton() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <ConfirmButton
      label="Logout"
      question="Do you want to Logout?"
      onConfirm={handleLogout}
      triggerClassName="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:px-5 sm:py-2 sm:text-sm"
    />
  )
}
