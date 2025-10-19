import * as React from 'react'

const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mqlWidth = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlCoarse = window.matchMedia('(pointer: coarse)')
    const compute = () => setIsMobile(mqlCoarse.matches || window.innerWidth < MOBILE_BREAKPOINT)
    mqlWidth.addEventListener('change', compute)
    mqlCoarse.addEventListener('change', compute)
    compute()
    return () => {
      mqlWidth.removeEventListener('change', compute)
      mqlCoarse.removeEventListener('change', compute)
    }
  }, [])

  return !!isMobile
}
