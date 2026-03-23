import { describe, it, expect } from 'vitest'
import {
  FONT_SIZE_TOKENS,
  FONT_WEIGHT_TOKENS,
  TEXT_ALIGN_TOKENS,
  TEXT_COLOR_TOKENS,
  getActiveToken,
  applyToken,
} from '../components/print-layout/classTokens'

describe('getActiveToken', () => {
  it('returns matching token from class string', () => {
    expect(getActiveToken('font-bold text-center mb-4', FONT_WEIGHT_TOKENS)).toBe('font-bold')
  })

  it('returns undefined when no category token present', () => {
    expect(getActiveToken('mb-4 p-2', FONT_SIZE_TOKENS)).toBeUndefined()
  })

  it('returns first match when multiple category tokens present (malformed string)', () => {
    expect(getActiveToken('text-sm text-lg', FONT_SIZE_TOKENS)).toBe('text-sm')
  })

  it('does not match text-sm as a color token', () => {
    expect(getActiveToken('text-sm', TEXT_COLOR_TOKENS)).toBeUndefined()
  })

  it('does not match text-gray-500 as a size token', () => {
    expect(getActiveToken('text-gray-500', FONT_SIZE_TOKENS)).toBeUndefined()
  })
})

describe('applyToken', () => {
  it('appends token when category has no existing token', () => {
    expect(applyToken('mb-4', FONT_SIZE_TOKENS, 'text-lg')).toBe('mb-4 text-lg')
  })

  it('replaces existing category token', () => {
    expect(applyToken('text-sm font-bold', FONT_SIZE_TOKENS, 'text-xl')).toBe('font-bold text-xl')
  })

  it('preserves unknown tokens when replacing', () => {
    expect(applyToken('mb-4 text-sm p-2', FONT_SIZE_TOKENS, 'text-2xl')).toBe('mb-4 p-2 text-2xl')
  })

  it('handles empty class string', () => {
    expect(applyToken('', FONT_WEIGHT_TOKENS, 'font-bold')).toBe('font-bold')
  })

  it('does not accidentally remove text-gray-500 when changing size', () => {
    const result = applyToken('text-sm text-gray-500', FONT_SIZE_TOKENS, 'text-xl')
    expect(result).toContain('text-gray-500')
    expect(result).toContain('text-xl')
    expect(result).not.toContain('text-sm')
  })
})
