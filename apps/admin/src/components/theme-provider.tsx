'use client'

import { ThemeProvider, useTheme } from 'next-themes'
import { useEffect, type ReactNode } from 'react'
import { Toaster } from 'sonner'

export const ADMIN_THEMES = ['system', 'light', 'dark'] as const

export type AdminTheme = (typeof ADMIN_THEMES)[number]

export function AdminThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      themes={[...ADMIN_THEMES]}
    >
      {children}
    </ThemeProvider>
  )
}

export function useAdminTheme() {
  const theme = useTheme()

  return {
    ...theme,
    theme: ADMIN_THEMES.includes(theme.theme as AdminTheme)
      ? theme.theme as AdminTheme
      : 'system',
    resolvedTheme: theme.resolvedTheme === 'dark' ? 'dark' as const : 'light' as const,
    setTheme: (value: AdminTheme) => theme.setTheme(value)
  }
}

export function AdminToaster() {
  const { resolvedTheme } = useAdminTheme()
  return <Toaster closeButton richColors theme={resolvedTheme} />
}

export function AdminThemeColor() {
  const { resolvedTheme } = useAdminTheme()
  const color = resolvedTheme === 'dark' ? '#151a17' : '#f3efe6'

  useEffect(() => {
    for (const meta of document.head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = color
    }
  }, [color])

  return null
}
