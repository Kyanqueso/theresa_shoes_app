import { useNavigate } from 'react-router-dom'
import DeviceSetup from '../components/DeviceSetup.jsx'

/** The standalone pairing URL.
 *
 * Pairing normally happens without anyone visiting this page: an unrecognised device that
 * opens the admin gets the same steps in place of the PIN pad (see Login). This URL stays
 * for the case where someone was sent the link, and runs the identical flow.
 */
export default function PairDevice() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-accent px-6 py-12">
      <DeviceSetup onPaired={() => navigate('/login', { replace: true })} />
    </div>
  )
}
