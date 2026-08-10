import { NavLink } from 'react-router-dom'

const navLinkClasses = ({ isActive }) =>
  `rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
    isActive ? 'bg-primary text-white' : 'text-gray-500 hover:text-black'
  }`

export default function PillNav({ links }) {
  return (
    <nav className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} className={navLinkClasses}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
