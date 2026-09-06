import { describe, expect, it } from 'vitest'

import { hashContent } from './hash'

describe('设置内容哈希', () => {
  it('返回稳定的小写 SHA-256 hex', () => {
    expect(hashContent('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
})
