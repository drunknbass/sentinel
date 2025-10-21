// Simple bridge to let any part of the app register a geolocation requester
// and to globally bind the first tap on mobile to trigger it (once per session).

declare global {
  interface Window { __gpsRequest?: () => void }
}

export function setGpsRequester(fn: () => void) {
  if (typeof window === 'undefined') return
  window.__gpsRequest = fn
}

function isMobileLike() {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024 } catch { return false }
}

function getPrompted(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (window.sessionStorage.getItem('gps:prompted') === '1') return true
    return document.cookie.includes('gps_prompted=1')
  } catch { return false }
}

function setPrompted() {
  try {
    window.sessionStorage.setItem('gps:prompted', '1')
    document.cookie = 'gps_prompted=1; path=/; SameSite=Lax'
  } catch {}
}

export function installGlobalFirstTapPrompt() {
  if (typeof window === 'undefined') return
  if (!isMobileLike()) return
  if (getPrompted()) return
  const handler = () => {
    if (getPrompted()) return cleanup()
    setPrompted()
    try { window.__gpsRequest && window.__gpsRequest() } catch {}
    cleanup()
  }
  const cleanup = () => {
    document.removeEventListener('pointerdown', handler, { capture: true } as any)
  }
  document.addEventListener('pointerdown', handler, { capture: true })
}

export function markGpsPrompted() {
  setPrompted()
}

