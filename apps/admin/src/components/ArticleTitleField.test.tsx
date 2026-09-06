import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { ArticleTitleField } from './ArticleTitleField'

it('uses a multiline control so long article titles can wrap', () => {
  render(
    <ArticleTitleField
      value="A very long article title"
      onChange={vi.fn()}
    />
  )

  expect(screen.getByRole('textbox', { name: '文章标题' }).tagName).toBe('TEXTAREA')
})
