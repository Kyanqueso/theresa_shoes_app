export const CONTACT_PREFIX = '09'
export const CONTACT_LENGTH = 11

export default function PhoneNumberInput({ value, onChange, className = '' }) {
  return (
    <div
      className={`flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 ${className}`}
    >
      <span className="text-sm text-gray-700">{CONTACT_PREFIX}</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={value.slice(CONTACT_PREFIX.length)}
        onChange={(event) => {
          const rest = event.target.value.replace(/\D/g, '').slice(0, CONTACT_LENGTH - CONTACT_PREFIX.length)
          onChange(CONTACT_PREFIX + rest)
        }}
        placeholder="171234567"
        className="w-full border-0 bg-transparent p-0 text-sm text-gray-700 focus:outline-none focus:ring-0"
      />
    </div>
  )
}
