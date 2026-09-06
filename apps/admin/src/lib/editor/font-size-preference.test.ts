import { expect, it } from 'vitest'

import { readFontSizePreference, stepFontSizePreference, writeFontSizePreference } from './font-size-preference'

it('reads only supported font-size levels and falls back safely', () => {
  localStorage.clear()
  expect(readFontSizePreference(localStorage, 'font-size', 'medium')).toBe('medium')
  localStorage.setItem('font-size', 'huge')
  expect(readFontSizePreference(localStorage, 'font-size', 'medium')).toBe('medium')
  localStorage.setItem('font-size', 'small')
  expect(readFontSizePreference(localStorage, 'font-size', 'medium')).toBe('small')
})

it('steps within bounded levels and persists the selected value', () => {
  expect(stepFontSizePreference('small', -1)).toBe('small')
  expect(stepFontSizePreference('small', 1)).toBe('medium')
  expect(stepFontSizePreference('medium', 1)).toBe('large')
  expect(stepFontSizePreference('large', 1)).toBe('large')
  writeFontSizePreference(localStorage, 'font-size', 'large')
  expect(localStorage.getItem('font-size')).toBe('large')
})
