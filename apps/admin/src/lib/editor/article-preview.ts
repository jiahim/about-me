export function articlePreviewPath(articlePath: string): string {
  return `/${articlePath.replace(/^docs\//, '').replace(/\.md$/, '')}`
}
