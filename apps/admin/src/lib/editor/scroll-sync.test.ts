import { describe, expect, it } from 'vitest'

import { scrollRatio, scrollTopForRatio } from './scroll-sync'

describe('scroll sync ratio helpers', () => {
  it('calculates a proportional scroll position from the scrollable distance', () => {
    expect(
      scrollRatio({ scrollTop: 300, scrollHeight: 1000, clientHeight: 400 })
    ).toBe(0.5)
  })

  it('returns zero when the element cannot scroll', () => {
    expect(
      scrollRatio({ scrollTop: 100, scrollHeight: 400, clientHeight: 400 })
    ).toBe(0)
  })

  it('clamps ratios before converting them to scrollTop', () => {
    expect(
      scrollTopForRatio({ scrollHeight: 1400, clientHeight: 400 }, 0.25)
    ).toBe(250)
    expect(
      scrollTopForRatio({ scrollHeight: 1400, clientHeight: 400 }, 2)
    ).toBe(1000)
  })
})
