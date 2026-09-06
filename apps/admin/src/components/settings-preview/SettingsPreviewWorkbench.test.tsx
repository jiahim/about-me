import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { SettingsPreviewWorkbench } from './SettingsPreviewWorkbench'

describe('SettingsPreviewWorkbench', () => {
  beforeEach(() => localStorage.clear())

  it('renders a sandboxed real-site iframe with readable viewport and zoom controls', async () => {
    render(<SettingsPreviewWorkbench config={createDefaultSiteConfiguration()} group="footer-social" issues={[]} readiness={[]} siteUrl="http://192.168.5.21:5173" />)

    const frame = screen.getByTitle('页脚与社交网站预览')
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin')
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin')
    await userEvent.click(screen.getByRole('button', { name: '平板' }))
    expect(screen.getByTestId('settings-preview-device')).toHaveStyle({ width: '768px' })
    await userEvent.click(screen.getByRole('button', { name: '125%' }))
    expect(screen.getByTestId('settings-preview-device')).toHaveStyle({ transform: 'scale(1.25)' })
    await userEvent.click(screen.getByRole('button', { name: '完整页面' }))
    expect(screen.getByRole('button', { name: '聚焦模块' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '全屏预览' }))
    expect(screen.queryByTitle('页脚与社交网站预览')).not.toBeInTheDocument()
    expect(screen.getByTitle('页脚与社交全屏网站预览')).toHaveAttribute('src', frame.getAttribute('src'))
  })

  it('opens homepage-only module previews on the homepage', () => {
    render(<SettingsPreviewWorkbench config={createDefaultSiteConfiguration()} group="sections" issues={[]} readiness={[]} representativePath="/zh/essay/example" siteUrl="http://127.0.0.1:5173" />)

    expect(screen.getByTitle('栏目网站预览')).toHaveAttribute('src', expect.stringMatching(/^http:\/\/127\.0\.0\.1:5173\/?\?/))
  })

  it('opens footer previews on a page where the real VitePress footer is visible', () => {
    render(<SettingsPreviewWorkbench config={createDefaultSiteConfiguration()} group="footer-social" issues={[]} readiness={[]} representativePath="/zh/essay/example" siteUrl="http://127.0.0.1:5173" />)

    expect(screen.getByTitle('页脚与社交网站预览')).toHaveAttribute('src', expect.stringMatching(/^http:\/\/127\.0\.0\.1:5173\/?\?/))
  })

  it('shows generated artifacts for SEO/GEO without loading integrations', () => {
    render(<SettingsPreviewWorkbench config={createDefaultSiteConfiguration()} group="seo-geo" issues={[]} readiness={[]} siteUrl="https://jiahim.com" />)
    expect(screen.getByRole('tab', { name: 'robots.txt' })).toBeInTheDocument()
    expect(screen.getByText(/User-agent/)).toBeInTheDocument()
  })
})
