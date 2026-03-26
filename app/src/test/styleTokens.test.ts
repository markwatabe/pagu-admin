import { describe, it, expect } from 'vitest'
import { getStyleValue, applyStyle, FONT_SIZE_OPTIONS, TEXT_ALIGN_OPTIONS } from '../components/print-layout/styleTokens'

describe('getStyleValue', () => {
  it('returns value for existing property', () => {
    expect(getStyleValue({ fontSize: '15px' }, 'fontSize')).toBe('15px')
  })

  it('returns undefined for missing property', () => {
    expect(getStyleValue({}, 'fontSize')).toBeUndefined()
  })
})

describe('applyStyle', () => {
  it('sets a property on empty style', () => {
    expect(applyStyle({}, 'fontSize', '15px')).toEqual({ fontSize: '15px' })
  })

  it('overwrites an existing property', () => {
    expect(applyStyle({ fontSize: '15px' }, 'fontSize', '24px')).toEqual({ fontSize: '24px' })
  })

  it('removes a property when value is empty string', () => {
    expect(applyStyle({ fontSize: '15px', color: 'red' }, 'fontSize', '')).toEqual({ color: 'red' })
  })

  it('preserves other properties', () => {
    expect(applyStyle({ fontSize: '15px', fontWeight: '700' }, 'fontSize', '24px'))
      .toEqual({ fontSize: '24px', fontWeight: '700' })
  })
})

describe('option arrays', () => {
  it('FONT_SIZE_OPTIONS includes design token vars', () => {
    const labels = FONT_SIZE_OPTIONS.map(o => o.value)
    expect(labels).toContain('var(--menu-header-size)')
    expect(labels).toContain('var(--menu-item-size)')
  })

  it('TEXT_ALIGN_OPTIONS has left, center, right', () => {
    expect(TEXT_ALIGN_OPTIONS.map(o => o.value)).toEqual(['left', 'center', 'right'])
  })
})
