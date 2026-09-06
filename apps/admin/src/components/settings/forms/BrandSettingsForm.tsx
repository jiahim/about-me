import type { SiteConfiguration } from '@jiahim/site-schema'

import { BrandAssetUpload } from '../BrandAssetUpload'
import { TextField, type SettingsFieldChange } from './shared'

export function BrandSettingsForm({ config, onChange }: { config: SiteConfiguration; onChange: SettingsFieldChange }) {
  return <>
    <TextField label="Logo 路径" value={config.branding.logo.src} onChange={(value) => onChange(['branding', 'logo', 'src'], value)} />
    <TextField label="Logo 替代文本" value={config.branding.logo.alt} onChange={(value) => onChange(['branding', 'logo', 'alt'], value)} />
    <TextField label="分享图路径" value={config.branding.shareImage.src} onChange={(value) => onChange(['branding', 'shareImage', 'src'], value)} />
    <TextField label="分享图替代文本" value={config.branding.shareImage.alt} onChange={(value) => onChange(['branding', 'shareImage', 'alt'], value)} />
    <TextField label="Favicon 路径" value={config.branding.favicon.src} onChange={(value) => onChange(['branding', 'favicon', 'src'], value)} />
    <TextField label="Favicon MIME 类型" value={config.branding.favicon.type} onChange={(value) => onChange(['branding', 'favicon', 'type'], value)} />
    <TextField label="Favicon 尺寸" value={config.branding.favicon.sizes} onChange={(value) => onChange(['branding', 'favicon', 'sizes'], value)} />
    {config.branding.appleTouchIcon && <>
      <TextField label="Apple Touch Icon 路径" value={config.branding.appleTouchIcon.src} onChange={(value) => onChange(['branding', 'appleTouchIcon', 'src'], value)} />
      <TextField label="Apple Touch Icon 尺寸" value={config.branding.appleTouchIcon.sizes} onChange={(value) => onChange(['branding', 'appleTouchIcon', 'sizes'], value)} />
    </>}
    <BrandAssetUpload kind="logo" label="上传 Logo" onUploaded={(result) => { onChange(['branding', 'logo', 'src'], result.publicUrl); onChange(['branding', 'logo', 'alt'], result.suggestedAlt) }} />
    <BrandAssetUpload kind="favicon" label="上传 Favicon" onUploaded={(result) => { onChange(['branding', 'favicon', 'src'], result.publicUrl); onChange(['branding', 'favicon', 'type'], result.mimeType) }} />
    {config.branding.appleTouchIcon && <BrandAssetUpload kind="appleTouchIcon" label="上传 Apple Touch Icon" onUploaded={(result) => onChange(['branding', 'appleTouchIcon', 'src'], result.publicUrl)} />}
    <BrandAssetUpload kind="shareImage" label="上传默认分享图" onUploaded={(result) => { onChange(['branding', 'shareImage', 'src'], result.publicUrl); onChange(['branding', 'shareImage', 'alt'], result.suggestedAlt) }} />
  </>
}
