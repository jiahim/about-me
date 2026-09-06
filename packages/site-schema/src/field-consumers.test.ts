import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from './defaults.js'
import {
  findFieldConsumer,
  SITE_CONFIGURATION_FIELD_CONSUMERS
} from './field-consumers.js'

function leafPatterns(value: unknown, path: string[] = [], output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => leafPatterns(item, [...path, '*'], output))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      const normalizedKey = path.length === 1 && path[0] === 'locales'
        ? '*'
        : path.length === 2 && path[0] === 'geo' && path[1] === 'crawlers'
          ? '*'
          : key
      leafPatterns(item, [...path, normalizedKey], output)
    })
  } else {
    output.add(path.join('.'))
  }
  return output
}

describe('site configuration field consumers', () => {
  it('assigns every v2 leaf exactly one primary owner', () => {
    const expected = leafPatterns(createDefaultSiteConfiguration())
    ;[
      'sections.*.parentId',
      'navigation.*.href',
      'homepage.modules.*.items.*.href',
      'integrations.analytics.requiredEnvironmentVariables.*',
      'integrations.comments.requiredEnvironmentVariables.*'
    ].forEach((path) => expected.add(path))

    const paths = SITE_CONFIGURATION_FIELD_CONSUMERS.map((consumer) => consumer.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect([...paths].sort()).toEqual([...expected].sort())
  })

  it('normalizes concrete array and keyed-map paths', () => {
    expect(findFieldConsumer('sections.3.name')?.path).toBe('sections.*.name')
    expect(findFieldConsumer('locales.zh-CN.enabled')?.path).toBe('locales.*.enabled')
    expect(findFieldConsumer('geo.crawlers.Googlebot.allow')?.path).toBe('geo.crawlers.*.allow')
  })

  it('does not assign removed v1 fields', () => {
    for (const path of [
      'branding.favicon.alt',
      'author.avatar.alt',
      'seo.openGraph.image.src',
      'geo.crawlers.Googlebot.purpose',
      'footer.social.0.newTab'
    ]) expect(findFieldConsumer(path)).toBeUndefined()
  })
})
