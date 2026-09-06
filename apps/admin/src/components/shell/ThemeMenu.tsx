'use client'

import { LaptopIcon, MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { type AdminTheme, useAdminTheme } from '@/components/theme-provider'

const themeLabels: Record<AdminTheme, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色'
}

export function ThemeMenu() {
  const { theme, setTheme } = useAdminTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="切换主题" className="theme-menu-trigger" size="icon" variant="ghost">
          <SunIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>界面主题</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as AdminTheme)}>
          <DropdownMenuRadioItem value="system"><LaptopIcon />{themeLabels.system}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light"><SunIcon />{themeLabels.light}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><MoonIcon />{themeLabels.dark}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
