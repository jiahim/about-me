import {
  auditArticleContentSignals,
  type ContentSignalFinding,
  type NormalizedSiteConfiguration,
  type PublicArticleRecord,
} from '@jiahim/site-schema'

export interface PublicContentFinding extends ContentSignalFinding {
  relativePath: string
}

export function auditPublicArticles(
  config: NormalizedSiteConfiguration,
  articles: readonly PublicArticleRecord[]
): readonly PublicContentFinding[] {
  return articles.flatMap((article) =>
    auditArticleContentSignals(config.geo.contentSignals, {
      title: article.title,
      description: article.description,
      date: article.publishedAt,
      updatedAt: article.updatedAt,
      body: article.body
    }, {
      canonicalOrigin: config.site.canonicalUrl,
      route: article.route,
      author: article.author,
      canonicalGenerated: config.seo.canonical.enabled
    }).map((finding) => ({ ...finding, relativePath: article.relativePath }))
  )
}
