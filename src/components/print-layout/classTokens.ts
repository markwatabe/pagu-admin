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

type TokenCategory = ReadonlyArray<string>

export function getActiveToken(classes: string, category: TokenCategory): string | undefined {
  return classes.split(' ').filter(Boolean).find(t => category.includes(t))
}

export function applyToken(classes: string, category: TokenCategory, newToken: string): string {
  const tokens = classes.split(' ').filter(Boolean)
  const filtered = tokens.filter(t => !category.includes(t))
  return [...filtered, newToken].join(' ')
}
