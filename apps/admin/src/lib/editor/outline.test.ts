import { describe, expect, it } from 'vitest'

import { extractOutline } from './outline'

describe('extractOutline', () => {
  it('extracts level two to six headings with source lines', () => {
    expect(extractOutline('# Title\n\n## Install\n### Verify')).toEqual([
      { level: 2, text: 'Install', line: 3, id: 'install' },
      { level: 3, text: 'Verify', line: 4, id: 'verify' }
    ])
  })

  it('ignores headings inside fenced code and de-duplicates anchors', () => {
    expect(extractOutline('## Usage\n\`\`\`md\n## Hidden\n\`\`\`\n## Usage')).toEqual([
      { level: 2, text: 'Usage', line: 1, id: 'usage' },
      { level: 2, text: 'Usage', line: 5, id: 'usage-2' }
    ])
  })

  it('strips common inline markdown from labels', () => {
    expect(extractOutline("## **Bold** and \`code\` [link](https://example.com)")).toEqual([
      { level: 2, text: 'Bold and code link', line: 1, id: 'bold-and-code-link' }
    ])
  })
})
