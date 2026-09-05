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
      {/* Without this an unrecognised device is simply stuck — pairing is the way back in. */}
      <Link
        to="/pair"
        className="mt-4 text-sm font-semibold text-primary underline underline-offset-4"
      >
        Pair this device
      </Link>
    </ErrorPage>
  )
}
