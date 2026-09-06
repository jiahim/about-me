import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { AdminThemeColor, AdminThemeProvider, AdminToaster } from '@/components/theme-provider'

import './globals.css'

export const metadata: Metadata = {
  title: 'Jia him · 内容管理',
  description: 'Jia him 的私有文章编辑与发布服务',
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3efe6' },
    { media: '(prefers-color-scheme: dark)', color: '#151a17' }
  ]
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AdminThemeProvider>
          <AdminThemeColor />
          {children}
          <AdminToaster />
        </AdminThemeProvider>
      </body>
    </html>
  )
}
