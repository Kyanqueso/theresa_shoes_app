import { ShieldAlert } from 'lucide-react'
import ErrorPage from '../components/ErrorPage.jsx'

export default function Forbidden() {
  return (
    <ErrorPage
      icon={ShieldAlert}
      code="403"
      title="Access Denied"
      message="This device isn't authorized to view this page."
    />
  )
}
