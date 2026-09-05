/** The single definition of a shared order summary — the block of text pasted into Viber or
 * Messenger.
 *
 * There used to be two: one built from the guest order form, one built from an admin order
 * row. They listed the same order in a different sequence, disagreed on whether the customer
 * was a "Name" or a "Client", and only one of them carried notes. Anyone adding a field had
 * to remember both, and nothing failed when they didn't.
 *
 * Callers hand over plain values, so it works equally from live form state or a saved order.
 */

/** Yes/No exactly as the customer would say it. */
const yesNo = (value) => (value ? 'Yes' : 'No')

/** A mold type named "None" means no mold, so it isn't worth a line. Matches the rule the
 * on-screen review already applies to its selection chips. */
const isMeaningfulMold = (name) => Boolean(name) && name.trim().toLowerCase() !== 'none'

const peso = (value) => `₱${Number(value ?? 0).toLocaleString()}`

/** Joins the text blocks of a saved order's notes_blocks into one line.
 * Photo, drawing and selection blocks are skipped — they can't be pasted as text. */
export function notesTextFromBlocks(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .filter((block) => block?.type === 'text' && block.value?.trim())
    .map((block) => block.value.trim())
    .join(' / ')
}

export function buildOrderSummary({
  modelName,
  unitPrice,
  quantity,
  clientName,
  companyName,
  contactNumber,
  materialName,
  colorCode,
  moldTypeName,
  heelTypeName,
  withBuckle,
  withFlatform,
  withSlingback,
  size,
  heelSize,
  notes,
}) {
  const price = Number(unitPrice ?? 0)
  const qty = Number(quantity ?? 0)

  const lines = [
    `${modelName} - ${peso(price)} each`,
    // Who it's for comes first: whoever receives this needs to know that before the specs.
    `Client: ${clientName}`,
    companyName && `Company: ${companyName}`,
    contactNumber && `Contact #: ${contactNumber}`,
    materialName && `Material: ${materialName}`,
    colorCode && `Color/Code: ${colorCode}`,
    isMeaningfulMold(moldTypeName) && `Mold Type: ${moldTypeName}`,
    heelTypeName && `Heel Type: ${heelTypeName}`,
    // Always listed, including the No's — "no buckle" is a decision worth stating explicitly
    // to whoever makes the shoe, not an absence to be inferred.
    `Buckle: ${yesNo(withBuckle)}`,
    `Flatform: ${yesNo(withFlatform)}`,
    `Slingback: ${yesNo(withSlingback)}`,
    size && `Size: ${size}`,
    heelSize && `Heel Size: ${heelSize}`,
    `Quantity: ${qty}`,
    notes && `Notes: ${notes}`,
    `Total: ${peso(price * qty)}`,
  ]

  return lines.filter(Boolean).join('\n')
}
