export interface StyleOption {
  label: string
  value: string
}

// ── Typography ──────────────────────────────────────────────

export const FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: '--menu-header-size', value: 'var(--menu-header-size)' },
  { label: '--menu-section-title-size', value: 'var(--menu-section-title-size)' },
  { label: '--menu-item-size', value: 'var(--menu-item-size)' },
  { label: '--menu-price-size', value: 'var(--menu-price-size)' },
  { label: '--menu-desc-size', value: 'var(--menu-desc-size)' },
  { label: '10px', value: '10px' },
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
  { label: '48px', value: '48px' },
]

export const FONT_WEIGHT_OPTIONS: StyleOption[] = [
  { label: 'Normal', value: '400' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
]

export const TEXT_ALIGN_OPTIONS: StyleOption[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

export const TEXT_COLOR_OPTIONS: StyleOption[] = [
  { label: '--menu-fg', value: 'var(--menu-fg)' },
  { label: '--menu-muted', value: 'var(--menu-muted)' },
  { label: '--menu-accent', value: 'var(--menu-accent)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
]

export const TEXT_TRANSFORM_OPTIONS: StyleOption[] = [
  { label: 'None', value: 'none' },
  { label: 'Uppercase', value: 'uppercase' },
  { label: 'Lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
]

export const LETTER_SPACING_OPTIONS: StyleOption[] = [
  { label: 'Tight', value: '-0.025em' },
  { label: 'Normal', value: 'normal' },
  { label: 'Wide', value: '0.05em' },
  { label: 'Wider', value: '0.1em' },
  { label: 'Widest', value: '0.2em' },
]

export const LINE_HEIGHT_OPTIONS: StyleOption[] = [
  { label: '1', value: '1' },
  { label: '1.25', value: '1.25' },
  { label: '1.375', value: '1.375' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2', value: '2' },
]

// ── Backgrounds ─────────────────────────────────────────────

export const BG_COLOR_OPTIONS: StyleOption[] = [
  { label: 'Transparent', value: 'transparent' },
  { label: '--menu-bg', value: 'var(--menu-bg)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
]

export const GRADIENT_DIRECTION_OPTIONS: StyleOption[] = [
  { label: '↓', value: 'to bottom' },
  { label: '→', value: 'to right' },
  { label: '↘', value: 'to bottom right' },
  { label: '↗', value: 'to top right' },
  { label: '↑', value: 'to top' },
  { label: '←', value: 'to left' },
]

export const GRADIENT_COLOR_OPTIONS: StyleOption[] = [
  { label: 'Transparent', value: 'transparent' },
  { label: '--menu-bg', value: 'var(--menu-bg)' },
  { label: '--menu-accent', value: 'var(--menu-accent)' },
  { label: 'White', value: '#ffffff' },
  { label: 'Black', value: '#000000' },
  { label: 'Custom', value: '__custom__' },
]

// ── Spacing ─────────────────────────────────────────────────

export const PADDING_OPTIONS: StyleOption[] = [
  { label: '0', value: '0' },
  { label: '4px', value: '4px' },
  { label: '8px', value: '8px' },
  { label: '12px', value: '12px' },
  { label: '16px', value: '16px' },
  { label: '24px', value: '24px' },
  { label: '32px', value: '32px' },
]

// ── Borders ─────────────────────────────────────────────────

export const BORDER_BOTTOM_OPTIONS: StyleOption[] = [
  { label: 'None', value: 'none' },
  { label: '1px solid', value: '1px solid var(--menu-border)' },
  { label: '2px solid', value: '2px solid currentColor' },
]

// ── Helpers ─────────────────────────────────────────────────

export function getStyleValue(style: Record<string, string>, prop: string): string | undefined {
  return style[prop]
}

export function applyStyle(style: Record<string, string>, prop: string, value: string): Record<string, string> {
  if (!value) {
    const next = { ...style }
    delete next[prop]
    return next
  }
  return { ...style, [prop]: value }
}
