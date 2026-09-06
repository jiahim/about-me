import { describe, expect, it } from 'vitest'

import { createDefaultSiteConfiguration } from './defaults.js'
import { evaluateEnvironmentReadiness } from './readiness.js'

describe('environment readiness', () => {
  it('reports only names, existence, and deterministic owners', () => {
    const config = createDefaultSiteConfiguration()
    config.integrations.analytics.requiredEnvironmentVariables = ['PUBLIC_ANALYTICS_ID', 'SHARED_ID']
    config.integrations.comments.requiredEnvironmentVariables = ['SHARED_ID', 'COMMENTS_ID']

    expect(evaluateEnvironmentReadiness(config, (name) => name === 'PUBLIC_ANALYTICS_ID')).toEqual([
      { name: 'COMMENTS_ID', exists: false, requiredBy: ['comments'] },
      { name: 'PUBLIC_ANALYTICS_ID', exists: true, requiredBy: ['analytics'] },
      { name: 'SHARED_ID', exists: false, requiredBy: ['analytics', 'comments'] }
    ])
  })
})
