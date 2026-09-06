'use client'

import { useState } from 'react'

import { requestSettingsJson } from '@/lib/settings/client'
import type { BrandAssetKind } from '@/lib/settings/assets'

interface BrandAssetUploadProps {
  kind: BrandAssetKind
  label: string
  fetcher?: typeof fetch
  onUploaded: (result: BrandAssetUploadResult) => void
}

export interface BrandAssetUploadResult {
  publicUrl: string
  mimeType: string
  suggestedAlt: string
}

export function BrandAssetUpload({ kind, label, fetcher = fetch, onUploaded }: BrandAssetUploadProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('kind', kind)
      formData.set('file', file)
      const result = await requestSettingsJson<BrandAssetUploadResult>('/api/settings/assets', {
        method: 'POST',
        body: formData
      }, fetcher)
      onUploaded(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '资源上传失败')
    } finally {
      setBusy(false)
    }
  }

  return <div className="settings-asset-upload">
    <label className="settings-field"><span>{label}</span><input aria-label={label} accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml" disabled={busy} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} /></label>
    {error && <p className="alert alert--error">{error}</p>}
  </div>
}
