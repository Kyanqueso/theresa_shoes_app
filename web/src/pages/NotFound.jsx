import { SearchX } from 'lucide-react'
import ErrorPage from '../components/ErrorPage.jsx'

export default function NotFound() {
  return (
    <ErrorPage
      icon={SearchX}
      code="404"
      title="Page Not Found"
      message="The page you're looking for doesn't exist or may have been moved."
    />
  )
}
