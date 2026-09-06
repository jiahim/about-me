import { createDefaultSiteConfiguration } from '@jiahim/site-schema'
import { describe, expect, it } from 'vitest'

import { collectReferencedSiteAssetPaths } from './publish-assets'

describe('collectReferencedSiteAssetPaths', () => {
  it('maps only public site asset URLs back to repository paths', () => {
    const config = createDefaultSiteConfiguration()
    config.branding.logo.src = '/images/site/logo.svg'
    config.branding.shareImage.src = 'https://cdn.example.com/share.png'
    expect([...collectReferencedSiteAssetPaths(config)]).toContain('docs/public/images/site/logo.svg')
    expect(JSON.stringify([...collectReferencedSiteAssetPaths(config)])).not.toContain('cdn.example.com')
  })
})
