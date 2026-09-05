import { MessageCircle, Phone, Send, X } from 'lucide-react'
import { toViberDigits, viberChatUrl } from '../lib/businessContact.js'

/** Share an order summary.
 *
 * Two different Viber actions, because they do genuinely different things:
 *
 *  - "Message <client>" uses viber://chat?number=, which opens the conversation with that
 *    specific person. Only offered when the order actually carries a usable mobile number.
 *  - "Choose in Viber" uses viber://forward?text=, which opens Viber's recipient picker.
 *    That's the fallback for orders with no contact number, or for sending to someone else.
 *
 * The summary goes to the clipboard either way: viber://chat can carry a number but not a
 * message body, so the text has to be pasted once the chat is open.
 */
export default function ShareOrderOverlay({ isOpen, onClose, summaryText, clientName, contactNumber }) {
  if (!isOpen) return null

  const clientDigits = toViberDigits(contactNumber)

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
    } catch {
      // Clipboard access can fail (insecure context, permissions) — opening the app still helps.
    }
  }

  const messageClient = async () => {
    await copySummary()
    window.open(viberChatUrl(clientDigits), '_blank', 'noopener,noreferrer')
  }

  const forwardInViber = async () => {
    await copySummary()
    window.open(`viber://forward?text=${encodeURIComponent(summaryText)}`, '_blank', 'noopener,noreferrer')
  }

  const shareToMessenger = async () => {
    await copySummary()
    window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer')
  }

  const firstName = (clientName ?? '').trim().split(' ')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-accent p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-500 hover:text-black"
        >
          <X size={20} />
        </button>

        <h3 className="text-lg font-bold text-black">Share Order</h3>
        <p className="mt-1 text-sm text-gray-600">
          The summary is copied to your clipboard — paste it once the chat opens.
        </p>

        {clientDigits && (
          <button
            type="button"
            onClick={messageClient}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#7C6FE0] px-3 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Send size={18} />
            Message {firstName || 'client'} on Viber
          </button>
        )}

        {clientDigits && (
          <p className="mt-2 text-xs text-gray-500">Opens the chat with {contactNumber} directly.</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={forwardInViber}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#7C6FE0] px-3 py-3 text-sm font-semibold text-[#7C6FE0] transition-opacity hover:opacity-90"
          >
            <Phone size={18} />
            {clientDigits ? 'Someone else' : 'Viber'}
          </button>
          <button
            type="button"
            onClick={shareToMessenger}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#2196F3] px-3 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle size={18} />
            Messenger
          </button>
        </div>

        {!clientDigits && (
          <p className="mt-3 text-xs text-gray-500">
            This order has no mobile number saved, so Viber will ask who to send it to.
          </p>
        )}
      </div>
    </div>
  )
}
