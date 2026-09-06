interface AssetConfiguration {
  readonly branding: {
    readonly logo: { readonly src: string }
    readonly favicon: { readonly src: string }
    readonly appleTouchIcon?: { readonly src: string }
    readonly shareImage: { readonly src: string }
  }
  readonly homepage: {
    readonly modules: ReadonlyArray<{
      readonly type: string
      readonly image?: { readonly src: string }
    }>
  }
}

function repositoryPath(publicPath: string): string | null {
  return publicPath.startsWith('/images/site/')
    ? `docs/public${publicPath}`
    : null
}

export function collectReferencedSiteAssetPaths(config: AssetConfiguration): ReadonlySet<string> {
  const paths = [
    config.branding.logo.src,
    config.branding.favicon.src,
    config.branding.appleTouchIcon?.src,
    config.branding.shareImage.src,
    ...config.homepage.modules.flatMap((module) => module.type === 'hero' && module.image ? [module.image.src] : [])
  ].flatMap((value) => value ? [repositoryPath(value)] : []).filter((value): value is string => Boolean(value))
  return new Set(paths)
}
