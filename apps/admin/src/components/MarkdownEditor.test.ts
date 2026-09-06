import { createElement } from 'react'
import { fireEvent, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { createSaveKeyBinding, MarkdownEditor } from './MarkdownEditor'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    setTheme: vi.fn(),
    theme: 'dark'
  })
}))

it('maps Mod-s to the workbench save action', () => {
  const onSave = vi.fn()
  const binding = createSaveKeyBinding(onSave)

  expect(binding.key).toBe('Mod-s')
  expect(binding.preventDefault).toBe(true)
  expect(binding.run?.({} as never)).toBe(true)
  expect(onSave).toHaveBeenCalledOnce()
})

it('publishes user scroll ratios and applies a newer remote ratio without echoing it', () => {
  const onScrollRatio = vi.fn()
  const props = {
    value: Array.from({ length: 80 }, (_, index) => `line ${index}`).join('\n'),
    onChange: vi.fn(),
    onSave: vi.fn(),
    onScrollRatio
  }
  const { container, rerender } = render(createElement(MarkdownEditor, props))
  const scroller = container.querySelector('.cm-scroller') as HTMLElement

  Object.defineProperties(scroller, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 400 }
  })
  scroller.scrollTop = 300
  fireEvent.scroll(scroller)

  expect(onScrollRatio).toHaveBeenLastCalledWith(0.5)

  rerender(createElement(MarkdownEditor, {
    ...props,
    remoteScrollRatio: 0.25,
    remoteScrollRevision: 1
  }))

  expect(scroller.scrollTop).toBe(150)
  fireEvent.scroll(scroller)
  expect(onScrollRatio).toHaveBeenCalledTimes(1)
})

it('uses the resolved admin theme instead of CodeMirror defaulting to a white canvas', () => {
  const { container } = render(createElement(MarkdownEditor, {
    value: '# 夜间编辑',
    onChange: vi.fn(),
    onSave: vi.fn()
  }))

  const editor = container.querySelector('.cm-editor') as HTMLElement
  expect(getComputedStyle(editor).backgroundColor).not.toBe('rgb(255, 255, 255)')
  expect(getComputedStyle(editor).color).not.toBe('rgb(0, 0, 0)')
})
