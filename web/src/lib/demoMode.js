/** True when this build is the public showcase deploy (VITE_DEMO_MODE=true set in Vercel).
 * Gates things that shouldn't be exposed/usable by random public visitors: real owner
 * contact info, and the real Viber deep link. */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
