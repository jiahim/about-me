export interface OutlineItem {
  level: number
  text: string
  line: number
  id: string
}

function plainHeading(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function headingId(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'section'
}

export function extractOutline(markdown: string): OutlineItem[] {
  const counts = new Map<string, number>()
  const outline: OutlineItem[] = []
  let fence: string | null = null

  markdown.split(/\r?\n/).forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)

    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      fence = fence === marker ? null : fence || marker
      return
    }

    if (fence) return

    const match = line.match(/^(#{2,6})\s+(.+?)\s*#*\s*$/)
    if (!match) return

    const text = plainHeading(match[2])
    if (!text) return

    const baseId = headingId(text)
    const count = (counts.get(baseId) || 0) + 1
    counts.set(baseId, count)
    outline.push({
      level: match[1].length,
      text,
      line: index + 1,
      id: count === 1 ? baseId : baseId + '-' + count
    })
  })

  return outline
}
