# Theme Configuration

This directory contains theme configurations for the RSO Incidents application.

## Amber MDT Theme

The Amber MDT (Mobile Data Terminal) theme provides a retro law enforcement terminal aesthetic with amber monochrome CRT display effects.

### Usage

#### Importing the Theme

```typescript
import { amberMDTTheme, applyThemeVariables, crtEffectStyles } from '@/lib/themes/amber-mdt'
```

#### Using Class Names

The theme exports pre-configured Tailwind class combinations:

```tsx
// Buttons
<button className={amberMDTTheme.classNames.buttonPrimary}>
  SUBMIT
</button>

<button className={amberMDTTheme.classNames.buttonSecondary}>
  CANCEL
</button>

// Cards
<div className={amberMDTTheme.classNames.card}>
  <h2 className={amberMDTTheme.classNames.heading}>INCIDENT REPORT</h2>
  <p className={amberMDTTheme.classNames.text}>Details...</p>
</div>

// Input fields
<input className={amberMDTTheme.classNames.input} type="text" />
```

#### Applying CSS Variables

```typescript
import { applyThemeVariables } from '@/lib/themes/amber-mdt'

// Apply to document root
applyThemeVariables()

// Or apply to specific element
const container = document.getElementById('theme-container')
if (container) {
  applyThemeVariables(container)
}
```

#### Using CRT Effects

Add the CRT effect styles to your global CSS or use them dynamically:

```typescript
import { crtEffectStyles, scanlineKeyframes } from '@/lib/themes/amber-mdt'

// In your global CSS file:
// Add the crtEffectStyles and scanlineKeyframes

// In your components:
<div className="crt-scanlines crt-glow">
  <p className="crt-bloom-amber">Amber glowing text</p>
  <p className="crt-bloom-red">Critical alert text</p>
</div>
```

#### Direct Access to Theme Values

```typescript
// Colors
const primaryColor = amberMDTTheme.colors.primary // '#ffb000'
const criticalColor = amberMDTTheme.colors.critical // '#ff0066'

// Typography
const fontFamily = amberMDTTheme.typography.fontFamily // 'IBM Plex Mono'

// Effects
const hasBloom = amberMDTTheme.effects.bloom // true
const glowStyle = amberMDTTheme.effects.glow.standard
```

### Theme Features

- **Colors**: Pure amber (#ffb000) on pure black (#000000)
- **Typography**: IBM Plex Mono for authentic terminal aesthetic
- **Borders**: Square (0rem radius) with 2px/4px widths
- **Effects**:
  - CRT scanline animation
  - Bloom/glow effects for text and containers
  - Pulsing animations for alerts
  - ASCII art border decorations
- **No blur**: Sharp, crisp rendering for terminal look

### Design Philosophy

The Amber MDT theme is inspired by 1980s law enforcement terminal systems:
- Maximum contrast for readability in any lighting
- Monospaced font for data alignment and terminal feel
- Sharp, blocky design with no rounded corners
- CRT monitor effects for period authenticity
- Red accent color reserved for critical/emergency alerts
