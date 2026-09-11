/** The label above every form control.
 *
 * Previously every label was 14px bold black — the same weight and colour as the headings
 * around it, so a dense form read as one undifferentiated block. This makes labels:
 *
 *  - a touch larger (15px) with relaxed line height, for easier reading at arm's length
 *  - the brand maroon, which is high-contrast on both the white and cream backgrounds the
 *    forms sit on, and visibly distinct from the grey text *inside* the inputs
 *  - sentence case — all-caps labels look tidy but are measurably slower to read
 *  - explicit about optional fields, so nobody has to guess what can be left blank
 *
 * `as="p"` is for labels that sit over a group of buttons (Yes/No, pill pickers) rather than
 * a single input, where a <label> element would have nothing to point at.
 */
export default function FieldLabel({ children, as: Tag = 'label', htmlFor, optional = false, hint, className = '' }) {
  return (
    <div className={className}>
      <Tag
        htmlFor={Tag === 'label' ? htmlFor : undefined}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold leading-snug text-primary"
      >
        {children}
        {optional && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary/70">Optional</span>
        )}
      </Tag>
      {hint && <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{hint}</p>}
    </div>
  )
}
