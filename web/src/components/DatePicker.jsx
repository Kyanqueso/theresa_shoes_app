import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { EARLIEST_DATE, MONTHS, WEEKDAYS, formatIsoDate, parseIso, toIso, todayIso } from '../lib/dates.js'


/** A date field with a calendar that makes going back decades easy.
 *
 * The browser's native date input hides year navigation behind a tiny header click on
 * desktop and a scroll wheel on phones — reaching 1998 means dozens of taps. Here the month
 * and year are ordinary dropdowns, so any date since 1998 is two selections and a tap.
 *
 * Opens as a centred overlay rather than a popover: these fields live inside tables that
 * scroll horizontally, and a popover anchored in one would be clipped by the table's edge.
 */
export default function DatePicker({
  value,
  onChange,
  min = EARLIEST_DATE,
  max,
  disabled = false,
  placeholder = 'Pick a date',
  clearable = false,
  compact = false,
  ariaLabel,
}) {
  const maxIso = max ?? todayIso()
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState({ year: 0, month: 0 })

  const minParts = parseIso(min)
  const maxParts = parseIso(maxIso)

  const open = () => {
    if (disabled) return
    // Start on the selected date's month, or the latest allowed month if nothing is set.
    const start = parseIso(value) ?? maxParts
    setView({ year: start.year, month: start.month })
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const pick = (iso) => {
    onChange(iso)
    setIsOpen(false)
  }

  const shiftMonth = (delta) => {
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + delta, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
    })
  }

  const years = []
  for (let y = maxParts.year; y >= minParts.year; y -= 1) years.push(y)

  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const isOutOfRange = (iso) => iso < min || iso > maxIso
  const atStart = view.year === minParts.year && view.month === minParts.month
  const atEnd = view.year === maxParts.year && view.month === maxParts.month
  const today = todayIso()

  const triggerClass = compact
    ? 'min-w-[7.5rem] px-1.5 py-1 text-xs'
    : 'w-full px-3 py-2 text-sm'

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white text-left text-gray-700 transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${triggerClass}`}
      >
        <span className={value ? '' : 'text-gray-400'}>{value ? formatIsoDate(value) : placeholder}</span>
        <CalendarDays size={compact ? 13 : 16} className="shrink-0 text-primary/70" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4" onClick={() => setIsOpen(false)}>
          <div
            role="dialog"
            aria-label="Choose a date"
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-left shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-primary">Choose a date</p>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close" className="text-gray-500 hover:text-black">
                <X size={20} />
              </button>
            </div>

            {/* Month + year as dropdowns: jumping from today to 1998 is two selections. */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={atStart}
                aria-label="Previous month"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:text-black disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <select
                value={view.month}
                onChange={(event) => setView((v) => ({ ...v, month: Number(event.target.value) }))}
                aria-label="Month"
                className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={view.year}
                onChange={(event) => setView((v) => ({ ...v, year: Number(event.target.value) }))}
                aria-label="Year"
                className="h-10 w-24 shrink-0 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={atEnd}
                aria-label="Next month"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:text-black disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1 text-xs font-semibold text-gray-500">
                  {day}
                </span>
              ))}
              {cells.map((day, index) => {
                if (day === null) return <span key={`blank-${index}`} />
                const iso = toIso(view.year, view.month, day)
                const selected = iso === value
                const outside = isOutOfRange(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={outside}
                    onClick={() => pick(iso)}
                    className={`h-10 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:text-gray-300 ${
                      selected
                        ? 'bg-primary text-white'
                        : iso === today
                          ? 'border border-primary/40 text-primary hover:bg-primary/10'
                          : 'text-gray-800 hover:bg-primary/10'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => pick(today)}
                disabled={isOutOfRange(today)}
                className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-40"
              >
                Today
              </button>
              {clearable && value && (
                <button
                  type="button"
                  onClick={() => pick('')}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 hover:text-danger"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
