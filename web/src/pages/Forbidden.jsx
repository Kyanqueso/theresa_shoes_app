import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorPage from '../components/ErrorPage.jsx'

export default function Forbidden() {
  return (
    <ErrorPage
      icon={ShieldAlert}
      code="403"
      title="Access Denied"
      message="This device isn't authorized to view this page."
    >
      {/* Without this an unrecognised device is simply stuck. The login screen is the way back
          in for both kinds of visitor: it shows the PIN pad to a known device and the pairing
          steps to one the shop hasn't added yet. */}
      <Link
        to="/login"
        className="mt-4 text-sm font-semibold text-primary underline underline-offset-4"
      >
        Set up this device
      </Link>
    </ErrorPage>
  )
}
