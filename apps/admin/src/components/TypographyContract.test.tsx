import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from 'vitest'

const stylesheet = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
const markdownEditor = readFileSync(resolve(process.cwd(), 'src/components/MarkdownEditor.tsx'), 'utf8')

it('keeps the browser root flexible while using a 14px rem-based admin default', () => {
  expect(stylesheet).toMatch(/html\s*\{[^}]*font-size:\s*100%/s)
  expect(stylesheet).toMatch(/--text-sm:\s*0\.875rem/)
  expect(stylesheet).toMatch(/body\s*\{[^}]*font-size:\s*var\(--text-md\)/s)
  expect(markdownEditor).toContain("fontSize: 'var(--editor-source-font-size)'")
  expect(markdownEditor).not.toContain("fontSize: '14px'")
})

it('uses semantic rem tokens for editor, preview, and settings typography', () => {
  expect(stylesheet).toMatch(/--editor-source-font-size:\s*0\.875rem/)
  expect(stylesheet).toMatch(/--preview-body-font-size:\s*1rem/)
  expect(stylesheet).toMatch(/\.settings-sidebar\s+\.pane-heading\s*>\s*span/)
  expect(stylesheet).toMatch(/\.settings-form-pane__toolbar h1\s*\{[^}]*font-size:\s*var\(--text-xl\)/s)
})
