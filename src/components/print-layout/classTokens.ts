// ── Typography ──────────────────────────────────────────────

export const FONT_SIZE_TOKENS = [
  'text-xs', 'text-sm', 'text-base', 'text-lg',
  'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
] as const

export const FONT_WEIGHT_TOKENS = [
  'font-normal', 'font-semibold', 'font-bold',
] as const

export const TEXT_ALIGN_TOKENS = [
  'text-left', 'text-center', 'text-right',
] as const

export const TEXT_COLOR_TOKENS = [
  'text-black', 'text-white',
  'text-gray-500', 'text-gray-700',
  'text-indigo-600', 'text-red-600',
] as const

export const TEXT_TRANSFORM_TOKENS = [
  'normal-case', 'uppercase', 'lowercase', 'capitalize',
] as const

export const LETTER_SPACING_TOKENS = [
  'tracking-tighter', 'tracking-tight', 'tracking-normal',
  'tracking-wide', 'tracking-wider', 'tracking-widest',
] as const

export const LINE_HEIGHT_TOKENS = [
  'leading-none', 'leading-tight', 'leading-snug',
  'leading-normal', 'leading-relaxed', 'leading-loose',
] as const

// ── Backgrounds ─────────────────────────────────────────────

export const BG_COLOR_TOKENS = [
  'bg-transparent', 'bg-white', 'bg-black',
  'bg-gray-50', 'bg-gray-100', 'bg-gray-200',
] as const

// ── Spacing ─────────────────────────────────────────────────

export const PADDING_TOKENS = [
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8',
] as const

// ── Borders ─────────────────────────────────────────────────

export const BORDER_BOTTOM_TOKENS = [
  'border-b-0', 'border-b', 'border-b-2',
] as const

export const BORDER_COLOR_TOKENS = [
  'border-transparent', 'border-gray-200', 'border-gray-300', 'border-black',
] as const

// ── Helpers ─────────────────────────────────────────────────

type TokenCategory = ReadonlyArray<string>

export function getActiveToken(classes: string, category: TokenCategory): string | undefined {
  return classes.split(' ').filter(Boolean).find(t => category.includes(t))
}

export function applyToken(classes: string, category: TokenCategory, newToken: string): string {
  const tokens = classes.split(' ').filter(Boolean)
  const filtered = tokens.filter(t => !category.includes(t))
  return newToken ? [...filtered, newToken].join(' ') : filtered.join(' ')
}

/** Every token across all categories — used for @source inline generation */
export const ALL_TOKENS = [
  ...FONT_SIZE_TOKENS, ...FONT_WEIGHT_TOKENS, ...TEXT_ALIGN_TOKENS,
  ...TEXT_COLOR_TOKENS, ...TEXT_TRANSFORM_TOKENS, ...LETTER_SPACING_TOKENS,
  ...LINE_HEIGHT_TOKENS, ...BG_COLOR_TOKENS, ...PADDING_TOKENS,
  ...BORDER_BOTTOM_TOKENS, ...BORDER_COLOR_TOKENS,
] as const
