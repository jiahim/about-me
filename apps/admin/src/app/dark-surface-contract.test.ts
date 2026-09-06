import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

function collectStyleRules(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule]
    const nested = (rule as CSSRule & { cssRules?: CSSRuleList }).cssRules
    return nested ? collectStyleRules(nested) : []
  })
}

function declarations(selector: string): CSSStyleDeclaration[] {
  const style = document.createElement('style')
  style.textContent = stylesheet
  document.head.append(style)
  const result = collectStyleRules(style.sheet?.cssRules ?? ([] as unknown as CSSRuleList))
    .filter((rule) => rule.selectorText.split(',').map((part) => part.trim()).includes(selector))
    .map((rule) => rule.style)
  style.remove()
  return result
}

function finalValue(selector: string, property: string): string {
  return declarations(selector)
    .map((style) => style.getPropertyValue(property))
    .filter(Boolean)
    .at(-1) ?? ''
}

function topLevelValues(selector: string, property: string): string[] {
  const style = document.createElement('style')
  style.textContent = stylesheet
  document.head.append(style)
  const result = Array.from(style.sheet?.cssRules ?? [])
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
    .filter((rule) => rule.selectorText.split(',').map((part) => part.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean)
  style.remove()
  return result
}

function token(scope: ':root' | '.dark', name: string): [number, number, number] {
  const block = stylesheet.match(new RegExp(`\\${scope}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  const hex = block.match(new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i'))?.[1]
  if (!hex) throw new Error(`Missing ${name} in ${scope}`)
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number]
}

function mix(foreground: number[], background: number[], ratio: number): [number, number, number] {
  return foreground.map((value, index) => Math.round(value * ratio + background[index] * (1 - ratio))) as [number, number, number]
}

function luminance(color: number[]): number {
  const [red, green, blue] = color.map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: number[], second: number[]): number {
  const lighter = Math.max(luminance(first), luminance(second))
  const darker = Math.min(luminance(first), luminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('Admin semantic surface contract', () => {
  it.each([
    ['.workspace-mode-tabs', 'var(--muted)'],
    ['.settings-sidebar', 'var(--sidebar)'],
    ['.sidebar', 'var(--sidebar)'],
    ['.article-sidebar', 'var(--sidebar)'],
    ['.settings-inspector', 'var(--paper-deep)'],
    ['.settings-preview-device', 'var(--surface)'],
    ['.global-status', 'var(--paper-deep)'],
    ['.commit-message-field input', 'var(--paper)']
  ])('uses a theme token for %s', (selector, expected) => {
    expect(finalValue(selector, 'background')).toBe(expected)
  })

  it('does not hard-code light canvas colors outside the theme token definitions', () => {
    expect(stylesheet).not.toMatch(
      /background:\s*(?:white|#ebe5d9|#f2ede3|#f6f2e8|rgba\(255,\s*255,\s*255|rgba\(251,\s*250,\s*246|rgba\(243,\s*239,\s*230)/i
    )
  })

  it('uses the warning color on a warning-tinted preview status surface', () => {
    expect(finalValue('.settings-preview-status--warning', 'background')).toContain('var(--warning)')
    expect(finalValue('.settings-preview-status--warning', 'color')).toBe('var(--warning-foreground)')
  })

  it.each([':root', '.dark'] as const)('keeps warning status text at WCAG AA contrast in %s', (scope) => {
    const background = mix(token(scope, 'warning'), token(scope, 'secondary'), 0.18)
    expect(contrast(background, token(scope, 'warning-foreground'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the only theme switcher available on phone-sized screens', () => {
    expect(finalValue('.theme-menu-trigger', 'display')).not.toBe('none')
  })

  it('does not let an unlayered global button reset override shadcn foreground utilities', () => {
    expect(topLevelValues('button', 'color')).not.toContain('inherit')
  })
})
