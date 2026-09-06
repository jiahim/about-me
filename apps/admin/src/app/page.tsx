import { AdminApp } from '@/components/AdminApp'
import { categoryDefinitions } from '@/lib/content-config'
import { getSiteUrl } from '@/lib/env'
import { loadSiteConfiguration } from '@/lib/site-configuration'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const config = loadSiteConfiguration()
  return (
    <AdminApp
      authorName={config.author.name}
      categories={categoryDefinitions()}
      contentSignals={config.geo.contentSignals}
      canonicalGenerated={config.seo.canonical.enabled}
      siteUrl={getSiteUrl()}
    />
  )
}
