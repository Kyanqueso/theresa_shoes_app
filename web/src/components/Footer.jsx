import { MapPin, Phone, Mail } from 'lucide-react'
import { isDemoMode } from '../lib/demoMode.js'

const CONTACT_DETAILS = [
  { icon: MapPin, text: 'Marikina City, Metro Manila', sensitive: false },
  { icon: Phone, text: '0922-597-8596', sensitive: true },
  { icon: Mail, text: 'fernandovergara1950@gmail.com', sensitive: true },
]

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2">
        <div>
          <h2 className="font-serif-display text-2xl font-semibold">Theresa Shoes</h2>
          <p className="mt-4 max-w-md text-sm text-white/60">
            Crafting quality footwear since our establishment. Each pair is made with dedication
            to style, comfort, and lasting quality.
          </p>
        </div>

        <div>
          <h2 className="font-serif-display text-2xl font-semibold">Get in touch</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {CONTACT_DETAILS.map(({ icon: Icon, text, sensitive }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/70">
                <Icon size={18} className="shrink-0 text-gold" />
                <span className={sensitive && isDemoMode ? 'select-none blur-sm' : undefined}>{text}</span>
              </li>
            ))}
          </ul>
          {isDemoMode && (
            <p className="mt-3 text-xs italic text-white/40">
              Contact details are hidden on this demo.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-sm text-white/50">
        © {new Date().getFullYear()} Maria Theresa Shoes. All Rights Reserved.
      </div>
    </footer>
  )
}
