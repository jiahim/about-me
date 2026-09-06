'use client'

import type { EnvironmentReadiness, SiteConfiguration } from '@jiahim/site-schema'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'

import { ApiError, clearStoredSettingsSessionId, requestSettingsJson } from '@/lib/settings/client'
import { clearSettingsDraft, readSettingsDraft, writeSettingsDraft, type StoredSettingsDraft } from '@/lib/settings/drafts'
import { updateSettingsAtPath } from '@/lib/settings/form-model'
import { SettingsFormHost } from './SettingsFormHost'
import { SettingsInspector, type SettingsInspectorTab, type SettingsIssue } from './SettingsInspector'
import { SettingsSidebar, type SettingsGroupId } from './SettingsSidebar'
import { Button } from '@/components/ui/button'
import { WorkspaceResizeHandle } from './WorkspaceResizeHandle'
import { SettingsPublishDialog } from './git/SettingsPublishDialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EyeIcon, MenuIcon } from 'lucide-react'
import type { SettingsPublishGuidance } from '@/lib/git/client-state'

interface SettingsSessionStatus {
  id: string
  expiresAt: number
  publishablePaths: readonly string[]
  rejectedPaths: readonly { path: string; reason: string }[]
  blockReason?: string
}

interface SettingsDiffResult {
  text: string
  files: Array<{ path: string; kind: 'text' | 'binary'; status: 'added' | 'modified' | 'deleted' | 'renamed'; size?: number }>
  session?: SettingsSessionStatus
}

interface SettingsValidation {
  valid: boolean
  issues: SettingsIssue[]
}

interface SettingsSnapshot {
  config: SiteConfiguration
  baseHash: string
  normalizedJson: string
  validation: SettingsValidation
  session: SettingsSessionStatus
}

interface ValidationResponse {
  config?: SiteConfiguration
  normalizedJson?: string
  validation: SettingsValidation
}

interface SettingsWorkspaceProps {
  active: boolean
  defaultBranch?: string
  gitRemote?: string | null
  representativePath?: string
  siteUrl?: string
  publishGuidance?: SettingsPublishGuidance
  onGitStatusRefresh: () => void | Promise<void>
  onStateChange: (state: SettingsWorkspaceState) => void
}

export interface SettingsWorkspaceState {
  busy: boolean
  dirty: boolean
  loaded: boolean
  publishablePaths: readonly string[]
  publishBlockReason?: string
}

export interface SettingsWorkspaceHandle {
  save: () => Promise<void>
  showDiff: () => Promise<void>
  openPublish: () => void
}

function cloneConfig(config: SiteConfiguration): SiteConfiguration {
  return structuredClone(config)
}

function validationFromError(error: ApiError): SettingsValidation | null {
  const candidate = error.body.validation
  if (!candidate || typeof candidate !== 'object') return null
  const value = candidate as Partial<SettingsValidation>
  return Array.isArray(value.issues)
    ? { valid: false, issues: value.issues }
    : null
}

export const SettingsWorkspace = forwardRef<SettingsWorkspaceHandle, SettingsWorkspaceProps>(function SettingsWorkspace(
  { active, defaultBranch, gitRemote, representativePath, siteUrl = 'http://127.0.0.1:5173', publishGuidance, onGitStatusRefresh, onStateChange },
  ref
) {
  const [group, setGroup] = useState<SettingsGroupId>('basic')
  const [config, setConfig] = useState<SiteConfiguration | null>(null)
  const [baseHash, setBaseHash] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<SettingsIssue[]>([])
  const [diff, setDiff] = useState('')
  const [diffFiles, setDiffFiles] = useState<SettingsDiffResult['files']>([])
  const [session, setSession] = useState<SettingsSessionStatus | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState('')
  const [environmentRequirements, setEnvironmentRequirements] = useState<EnvironmentReadiness[]>([])
  const [inspectorTab, setInspectorTab] = useState<SettingsInspectorTab>('preview')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflictingDraft, setConflictingDraft] = useState<StoredSettingsDraft | null>(null)
  const [saveConflict, setSaveConflict] = useState(false)
  const loadStarted = useRef(false)
  const activeOperation = useRef<'load' | 'save' | 'diff' | null>(null)
  const settingsPanels = useRef<HTMLDivElement>(null)
  const [formPercent, setFormPercent] = useState(58)

  const load = useCallback(async () => {
    if (activeOperation.current) return
    activeOperation.current = 'load'
    setBusy(true)
    setError('')
    try {
      const snapshot = await requestSettingsJson<SettingsSnapshot>('/api/settings')
      setSession(snapshot.session)
      const recovered = readSettingsDraft(localStorage, snapshot.baseHash)
      setBaseHash(snapshot.baseHash)
      setIssues(snapshot.validation.issues)
      if (recovered.status === 'restored') {
        setConfig(cloneConfig(recovered.draft.config as SiteConfiguration))
        setDirty(true)
      } else {
        setConfig(cloneConfig(snapshot.config))
        setDirty(false)
      }
      setConflictingDraft(recovered.status === 'conflict' ? recovered.draft : null)
      setSaveConflict(false)
      setLoaded(true)
      const environment = await requestSettingsJson<{ requirements: EnvironmentReadiness[] }>('/api/settings/environment')
      setEnvironmentRequirements(environment.requirements)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '设置加载失败')
    } finally {
      activeOperation.current = null
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (active && !loaded && !loadStarted.current) {
      loadStarted.current = true
      void load()
    }
  }, [active, load, loaded])

  useEffect(() => {
    onStateChange({
      busy,
      dirty,
      loaded,
      publishablePaths: session?.publishablePaths ?? [],
      ...(session?.blockReason ? { publishBlockReason: session.blockReason } : {})
    })
  }, [busy, dirty, loaded, onStateChange, session])

  useEffect(() => {
    if (!config || !dirty || !baseHash) return
    const timer = window.setTimeout(() => {
      writeSettingsDraft(localStorage, { config, baseHash, savedAt: Date.now() })
    }, 650)
    return () => window.clearTimeout(timer)
  }, [baseHash, config, dirty])

  const showDiff = useCallback(async () => {
    if (activeOperation.current) return
    activeOperation.current = 'diff'
    setBusy(true)
    setError('')
    try {
      const result = await requestSettingsJson<SettingsDiffResult>('/api/settings/diff')
      setDiff(result.text)
      setDiffFiles(result.files)
      if (result.session) setSession(result.session)
      setInspectorTab('diff')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '设置 Diff 加载失败')
    } finally {
      activeOperation.current = null
      setBusy(false)
    }
  }, [])

  const save = useCallback(async () => {
    if (!config || !loaded || activeOperation.current || !dirty) return
    activeOperation.current = 'save'
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const validation = await requestSettingsJson<ValidationResponse>('/api/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })
      setIssues(validation.validation.issues)
      if (!validation.validation.valid || !validation.config) {
        setInspectorTab('issues')
        return
      }
      const snapshot = await requestSettingsJson<SettingsSnapshot>('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: validation.config, baseHash })
      })
      setConfig(cloneConfig(snapshot.config))
      setBaseHash(snapshot.baseHash)
      setIssues(snapshot.validation.issues)
      setSession(snapshot.session)
      setDirty(false)
      setConflictingDraft(null)
      clearSettingsDraft(localStorage)
      setNotice('设置已保存到本地。请查看差异，确认后可提交并推送。')
      try {
        const result = await requestSettingsJson<SettingsDiffResult>('/api/settings/diff')
        setDiff(result.text)
        setDiffFiles(result.files)
        if (result.session) setSession(result.session)
        setInspectorTab('diff')
      } catch (refreshError) {
        setError(`设置已保存，但 Diff 刷新失败：${refreshError instanceof Error ? refreshError.message : '请求失败'}`)
      }
      try {
        await onGitStatusRefresh()
      } catch (refreshError) {
        setError((currentError) => `${currentError ? `${currentError}；` : '设置已保存，但'} Git 状态刷新失败：${refreshError instanceof Error ? refreshError.message : '请求失败'}`)
      }
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        const validation = validationFromError(requestError)
        if (validation) {
          setIssues(validation.issues)
          setInspectorTab('issues')
        }
        setError(requestError.status === 409
          ? `${requestError.message}。当前编辑内容已保留，请重新加载服务器版本后人工合并。`
          : requestError.message)
        setSaveConflict(requestError.status === 409)
      } else {
        setError(requestError instanceof Error ? requestError.message : '设置保存失败')
      }
    } finally {
      activeOperation.current = null
      setBusy(false)
    }
  }, [baseHash, busy, config, dirty, loaded, onGitStatusRefresh])

  const publish = useCallback(async (message: string) => {
    if (!session?.publishablePaths.length || activeOperation.current) return
    activeOperation.current = 'save'
    setBusy(true)
    setError('')
    setNotice('')
    setPublishedUrl('')
    try {
      const result = await requestSettingsJson<{ url: string; message: string }>('/api/git/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'settings', message, date: new Date().toISOString().slice(0, 10) })
      })
      setPublishOpen(false)
      setPublishedUrl(result.url)
      setNotice(result.message)
      setSession((current) => current ? { ...current, publishablePaths: [] } : current)
      clearStoredSettingsSessionId()
      await onGitStatusRefresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '设置提交并推送失败')
    } finally {
      activeOperation.current = null
      setBusy(false)
    }
  }, [onGitStatusRefresh, session])

  const openPublish = useCallback(() => setPublishOpen(true), [])

  useImperativeHandle(ref, () => ({ save, showDiff, openPublish }), [openPublish, save, showDiff])

  function change(path: readonly (string | number)[], value: unknown) {
    setConfig((current) => current ? updateSettingsAtPath(current, path, value) : current)
    setDirty(true)
    setNotice('')
  }

  function inspectConflictingDraft() {
    if (!conflictingDraft) return
    setDiff(`${JSON.stringify(conflictingDraft.config, null, 2)}\n`)
    setInspectorTab('diff')
    setNotice('右侧显示的是旧基准草稿，只供逐字段人工对照；它不会覆盖当前服务器配置。')
  }

  function discardConflictingDraft() {
    clearSettingsDraft(localStorage)
    setConflictingDraft(null)
  }

  async function reloadAfterConflict() {
    if (config && dirty && baseHash) {
      writeSettingsDraft(localStorage, { config, baseHash, savedAt: Date.now() })
    }
    setSaveConflict(false)
    setLoaded(false)
    loadStarted.current = true
    await load()
  }

  async function retryInitialLoad() {
    loadStarted.current = true
    await load()
  }

  function applySectionResult(result: { config: SiteConfiguration; baseHash: string; changedPaths: string[]; articleCount?: number; session?: SettingsSessionStatus }) {
    setConfig(cloneConfig(result.config))
    setBaseHash(result.baseHash)
    setDirty(false)
    clearSettingsDraft(localStorage)
    if (result.session) setSession(result.session)
    setNotice(result.articleCount === undefined
      ? '栏目及栏目首页已创建。'
      : `栏目已归档，${result.articleCount} 篇文章保持原位。`)
    void onGitStatusRefresh()
  }

  return (
    <div id="settings-workspace" className="settings-workspace" hidden={!active} role="tabpanel" aria-labelledby="settings-mode-tab">
      {(error || notice || conflictingDraft || publishGuidance) && <div className="global-status" aria-live="polite">
        {error && <p className="alert alert--error">{error}{saveConflict && <Button size="sm" variant="outline" type="button" onClick={() => void reloadAfterConflict()}>重新加载服务器版本</Button>}</p>}
        {notice && <p className="alert alert--success">{notice}{publishedUrl && <> <a className="underline" href={publishedUrl} rel="noreferrer" target="_blank">查看 Pull Request</a></>}</p>}
        {conflictingDraft && <div className="recovery-banner"><span>发现基于旧配置的本地设置草稿，未自动覆盖服务器版本。</span><Button size="sm" variant="outline" type="button" onClick={inspectConflictingDraft}>查看旧草稿供人工对照</Button><Button size="sm" variant="ghost" type="button" onClick={discardConflictingDraft}>使用服务器版本</Button></div>}
        {publishGuidance && <p className="settings-publish-guidance" data-tone={publishGuidance.tone} role="status" aria-label="设置发布状态"><strong>发布状态</strong><span>{publishGuidance.message}</span></p>}
      </div>}
      {!config ? <section className="settings-loading">{error ? <div><p>设置暂不可用</p><Button variant="outline" type="button" disabled={busy} onClick={() => void retryInitialLoad()}>重试加载</Button></div> : '正在加载站点设置…'}</section> : <div className="settings-layout">
        <div className="settings-mobile-actions" aria-label="窄屏设置工具">
          <Button variant="outline" type="button" onClick={() => setMobileNavigationOpen(true)}><MenuIcon />设置分组</Button>
          <Button variant="outline" type="button" onClick={() => setMobilePreviewOpen(true)}><EyeIcon />预览当前模块</Button>
        </div>
        <SettingsSidebar activeGroup={group} onChange={setGroup} />
        <div ref={settingsPanels} className="settings-main-panels" style={{ '--settings-form-percent': `${formPercent}%` } as CSSProperties}>
          <div className="settings-form-panel"><SettingsFormHost baseHash={baseHash} busy={busy} config={config} environmentRequirements={environmentRequirements} group={group} normalizedJson={`${JSON.stringify(config, null, 2)}\n`} saveDisabled={busy || !dirty} sectionOperationsDisabled={dirty} onChange={change} onSave={() => void save()} onSectionApplied={applySectionResult} /></div>
          <WorkspaceResizeHandle className="settings-resize-handle" label="调整设置表单与预览宽度" max={72} min={38} value={formPercent} valueText={`${Math.round(formPercent)}%`} onReset={() => setFormPercent(58)} onResize={(clientX) => { const bounds = settingsPanels.current?.getBoundingClientRect(); if (bounds?.width) setFormPercent(Math.max(38, Math.min(72, ((clientX - bounds.left) / bounds.width) * 100))) }} onResizeEnd={() => undefined} onResizeStart={() => true} onStep={(delta) => setFormPercent((current) => Math.max(38, Math.min(72, current + delta / 4)))} />
          <div className="settings-preview-panel"><SettingsInspector config={config} diff={diff} diffFiles={diffFiles} group={group} issues={issues} readiness={environmentRequirements} representativePath={representativePath} siteUrl={siteUrl} tab={inspectorTab} onTabChange={setInspectorTab} /></div>
        </div>
      </div>}
      {config && <>
        <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
          <SheetContent className="settings-mobile-sheet settings-mobile-sheet--navigation" side="left">
            <SheetHeader><SheetTitle>站点设置分组</SheetTitle><SheetDescription>选择要编辑的公开配置模块。</SheetDescription></SheetHeader>
            <SettingsSidebar activeGroup={group} onChange={(nextGroup) => { setGroup(nextGroup); setMobileNavigationOpen(false) }} />
          </SheetContent>
        </Sheet>
        <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
          <SheetContent className="settings-mobile-sheet settings-mobile-sheet--preview" side="right">
            <SheetHeader><SheetTitle>预览当前模块</SheetTitle><SheetDescription>使用真实 VitePress 页面或对应构建产物检查当前草稿。</SheetDescription></SheetHeader>
            <SettingsInspector config={config} diff={diff} diffFiles={diffFiles} group={group} issues={issues} readiness={environmentRequirements} representativePath={representativePath} siteUrl={siteUrl} tab={inspectorTab} onTabChange={setInspectorTab} />
          </SheetContent>
        </Sheet>
      </>}
      <SettingsPublishDialog busy={busy} defaultBranch={defaultBranch} files={diffFiles} open={publishOpen} paths={session?.publishablePaths ?? []} remote={gitRemote} onClose={() => setPublishOpen(false)} onConfirm={(message) => void publish(message)} />
    </div>
  )
})
