import { useEffect, useRef, useState } from 'react'
import contactPage1 from '../../assets/images/contact-page1.jpg'
import contactBg from '../../assets/images/contact-bg.jpg'
import bdoLogo from '../../assets/images/bdo-logo-img.png'
import gcashLogo from '../../assets/images/gcash-logo-img.png'
import { isDemoMode } from '../../lib/demoMode.js'
import { OWNER_VIBER_DIGITS, openViberChat } from '../../lib/businessContact.js'

const VIBER_INSTALL_URL = 'https://www.viber.com/en/download/'

const STEPS = [
  {
    number: '1',
    title: 'CHOOSE A SHOE',
    description: 'View sample custom shoes in the collections page then click on the one that peaks your interest!',
  },
  {
    number: '2',
    title: 'SELECT YOUR PREFERENCES',
    description:
      "Pick your size, colors, and materials, then add any details to make the shoe truly yours! Don't forget to list your name and company as well!",
  },
  {
    number: '3',
    title: 'CONFIRM AND SEND YOUR ORDER',
    description: "Double-check your choices and info, then send it over and we'll take it from there!",
  },
  {
    number: '4',
    title: "LET'S STAY CONNECTED",
    description:
      "After you send your order, we'll contact you regarding the delivery date. Need anything in the meantime? Reach out to us anytime!",
  },
]

export default function Contact() {
  const viberCleanupRef = useRef(null)
  const [showDemoNotice, setShowDemoNotice] = useState(false)
  const [showInstallNotice, setShowInstallNotice] = useState(false)

  // If the user leaves right after tapping, drop the pending timer and listeners so the
  // "not installed" notice can't appear on whatever page they've moved to.
  useEffect(() => () => viberCleanupRef.current?.(), [])

  const openViberContact = () => {
    if (isDemoMode) {
      setShowDemoNotice(true)
      setTimeout(() => setShowDemoNotice(false), 2500)
      return
    }

    viberCleanupRef.current?.()
    setShowInstallNotice(false)

    // Whether the handoff worked is judged by the page going away: if the OS switches to
    // Viber this tab is hidden or unloaded. Still visible after the grace period means
    // nothing handled the link, so Viber almost certainly isn't installed.
    //
    // The grace period is generous because a cold app start is slow — the previous version
    // gave up after 1.5s and tore down the link mid-handoff, which is what made the first
    // tap bounce back to the site and only the second one work.
    const timer = setTimeout(() => setShowInstallNotice(true), 4000)
    const cancel = () => clearTimeout(timer)

    document.addEventListener('visibilitychange', cancel, { once: true })
    window.addEventListener('pagehide', cancel, { once: true })
    window.addEventListener('blur', cancel, { once: true })

    viberCleanupRef.current = () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', cancel)
      window.removeEventListener('pagehide', cancel)
      window.removeEventListener('blur', cancel)
    }

    openViberChat(OWNER_VIBER_DIGITS)
  }

  return (
    <>
      <section className="relative flex min-h-[560px] items-stretch justify-center overflow-hidden px-6 sm:px-10">
        <img src={contactBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative flex w-full max-w-xl flex-col justify-center bg-accent px-8 py-14 shadow-xl sm:px-10">
          <p className="text-sm text-gray-500">Let&apos;s Create your Signature Pair!</p>
          <h2 className="mt-1 font-serif-display text-2xl font-bold tracking-wide text-primary">
            STEP-BY-STEP GUIDE
          </h2>

          <ol className="mt-8 flex flex-col gap-6">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-4">
                <span className="font-lato text-6xl font-black leading-none text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-bold text-primary">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative overflow-hidden bg-neutral-700 px-6 py-20 text-center text-white">
        <img src={contactPage1} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-serif-display text-3xl font-bold leading-tight sm:text-4xl">
            WANT TO
            <br />
            CONTACT US?
          </h2>

          <button
            type="button"
            onClick={openViberContact}
            className="mt-8 rounded-md bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Contact Us in Viber
          </button>
          {showDemoNotice && (
            <p className="mt-3 text-sm font-semibold text-golden-brown">
              Not available on this demo — works on the live site.
            </p>
          )}
          {showInstallNotice && (
            <p className="mt-3 text-sm font-semibold text-golden-brown">
              Viber doesn&apos;t seem to be installed.{' '}
              <a
                href={VIBER_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Get Viber
              </a>
            </p>
          )}

          <div className="mt-10 flex items-center justify-center gap-4">
            <img src={bdoLogo} alt="BDO" className="h-7 w-auto" />
            <span className="text-white/40">|</span>
            <img src={gcashLogo} alt="GCash" className="h-7 w-auto" />
          </div>
          <p className="mt-3 text-sm text-white/70">*We accept cash and installment</p>

          <p className={`mt-6 font-bold ${isDemoMode ? 'select-none blur-sm' : ''}`}>Fernando F. Vergara</p>
          <p className={isDemoMode ? 'select-none blur-sm' : 'text-white/90'}>+63 9225978596</p>
          <p className="text-white/60">Based on Marikina City Metro Manila</p>
          {isDemoMode && (
            <p className="mt-2 text-xs italic text-white/40">Contact details are hidden on this demo.</p>
          )}
        </div>
      </section>
    </>
  )
}
