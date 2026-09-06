import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AdminThemeColor, AdminThemeProvider, AdminToaster, useAdminTheme } from './theme-provider'

interface MockThemeProviderProps {
  children?: React.ReactNode
  [key: string]: unknown
}

const themeProvider = vi.fn(({ children }: MockThemeProviderProps) => (
  <div data-testid="next-theme-provider">{children}</div>
))

vi.mock('next-themes', () => ({
  ThemeProvider: (props: MockThemeProviderProps) => themeProvider(props),
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
    systemTheme: 'light'
  })
}))

vi.mock('sonner', () => ({
  Toaster: ({ theme }: { theme?: string }) => (
    <div data-testid="admin-toaster" data-theme={theme} />
  )
}))

function ThemeConsumer() {
  const { theme, resolvedTheme } = useAdminTheme()
  return <p>{theme}:{resolvedTheme}</p>
}

describe('AdminThemeProvider', () => {
  it('owns the supported theme contract and delegates hydration-safe class handling', () => {
    render(
      <AdminThemeProvider>
        <ThemeConsumer />
      </AdminThemeProvider>
    )

    expect(screen.getByText('system:light')).toBeInTheDocument()
    expect(themeProvider).toHaveBeenCalledWith(expect.objectContaining({
      attribute: 'class',
      defaultTheme: 'system',
      enableSystem: true,
      disableTransitionOnChange: true,
      themes: ['system', 'light', 'dark']
    }))
  })

  it('is wired once at the document root with hydration suppression and the global toaster', () => {
    const layout = readFileSync(resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8')

    expect(layout).toContain('<html lang="zh-CN" suppressHydrationWarning>')
    expect(layout).toContain('<AdminThemeProvider>')
    expect(layout).toContain('<AdminThemeColor')
    expect(layout).toContain('<AdminToaster')
    expect(layout).toContain("media: '(prefers-color-scheme: dark)'")
  })

  it('passes the resolved theme to global toast surfaces', () => {
    render(<AdminToaster />)
    expect(screen.getByTestId('admin-toaster')).toHaveAttribute('data-theme', 'light')
  })

  it('keeps browser chrome synchronized with a manually resolved theme', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)

    render(<AdminThemeColor />)

    expect(meta).toHaveAttribute('content', '#f3efe6')
    meta.remove()
  })
})
