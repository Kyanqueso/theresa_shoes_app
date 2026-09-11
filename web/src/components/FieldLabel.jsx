/** The label above every form control.
 *
 * Labels were hard to pick out because they shared the brand maroon with the *selected*
 * option — "Select Mold Type" sat directly over a maroon "None" button and read as part of
 * that row. This treatment separates them by form, not just colour:
 *
 *  - a gold underline beneath the label's words, over a faint line running the full width,
 *    so each field reads as its own section. No button or input on the form has a line, so
 *    nothing here can be mistaken for something to tap or type in.
 *  - gold for the accent, leaving maroon to mean one thing: "this option is selected".
 *  - 15px, bold, sentence case — the easiest of the options to read at arm's length.
 *  - optional fields say so, beside the underline rather than under it.
 *
 * The full-width line is translucent gold rather than a fixed colour, so it stays faint but
 * visible on both the white guest card and the cream admin modals.
 *
 * `as="p"` is for labels that sit over a group of buttons (Yes/No, pill pickers) rather than
 * a single input, where a <label> element would have nothing to point at.
 */
export default function FieldLabel({ children, as: Tag = 'label', htmlFor, optional = false, hint, className = '' }) {
  return (
    <div className={`pb-0.5 ${className}`}>
      <div className="flex flex-wrap items-end gap-x-2 border-b border-golden-brown/30">
        {/* -mb-px lets the 2px gold underline sit on top of the 1px rule instead of below it. */}
        <Tag
          htmlFor={Tag === 'label' ? htmlFor : undefined}
          className="-mb-px border-b-2 border-golden-brown pb-1.5 text-[15px] font-bold leading-snug text-primary"
        >
          {children}
        </Tag>
        {optional && (
          <span className="mb-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary/70">
            Optional
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-gray-500">{hint}</p>}
    </div>
  )
}
