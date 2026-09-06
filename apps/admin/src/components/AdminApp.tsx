'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { articlePreviewPath } from '@/lib/editor/article-preview'
import {
  clearWorkspaceLayout,
  clampSidebarWidth,
  DEFAULT_EDITOR_RATIO,
  DEFAULT_WORKSPACE_LAYOUT,
  editorRatioAt,
  editorWidthForRatio,
  MAX_SIDEBAR_WIDTH,
  MIN_EDITOR_WIDTH,
  MIN_PREVIEW_WIDTH,
  MIN_SIDEBAR_WIDTH,
  readWorkspaceLayout,
  RESIZE_HANDLE_WIDTH,
  writeWorkspaceLayout,
  type WorkspaceLayout
} from '@/lib/editor/workspace-layout'
import {
  articleFingerprint,
  clearDraft,
  draftKey,
  readDraft,
  writeDraft
} from '@/lib/editor/drafts'
import type { DraftArticle, DraftSnapshot } from '@/lib/editor/drafts'
import type {
  Article,
  ArticleSummary,
  CategoryDefinition,
  CategoryId,
  MediaResult,
  SaveResult
} from '@/lib/types'
import type { GitStatus } from '@/lib/git/types'
import type {
  MergeWorkflowResult,
  PublishWorkflowResult,
  PullRequestSummary
} from '@/lib/git/types'
import { canPublishArticle, canPublishSettings, settingsPublishGuidance } from '@/lib/git/client-state'
import { ArticleSidebar } from './ArticleSidebar'
import { EditorPane } from './EditorPane'
import { GitPanel } from './GitPanel'
import { PreviewPane } from './PreviewPane'
import { PublishDialog } from './PublishDialog'
import {
  ResponsiveWorkspaceControls,
  type CompactPane
} from './ResponsiveWorkspaceControls'
import { SettingsWorkspace, type SettingsWorkspaceHandle, type SettingsWorkspaceState } from './SettingsWorkspace'
import { MergeDialog } from './git/MergeDialog'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceResizeHandle } from './WorkspaceResizeHandle'
import { Button } from '@/components/ui/button'
import { checkArticleSeoGeo } from '@/lib/seo/article-checks'
import type { WorkspaceMode } from './WorkspaceHeader'
import type { SiteConfiguration } from '@jiahim/site-schema'

interface AdminAppProps {
  categories: readonly CategoryDefinition[]
  siteUrl: string
  authorName?: string
  canonicalGenerated?: boolean
  contentSignals?: SiteConfiguration['geo']['contentSignals']
}

interface ArticlesResponse {
  articles: ArticleSummary[]
}

interface ArticleResponse {
  article: Article
}

interface SynchronizedScrollEvent {
  source: 'editor' | 'preview'
  ratio: number
  revision: number
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, cache: 'no-store' })
  const value = (await response.json().catch(() => ({}))) as { error?: string }

  if (!response.ok) {
    throw new Error(value.error || '请求失败，请稍后重试')
  }

  return value as T
}

function today(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function createEmptyArticle(category: CategoryId): DraftArticle {
  return {
    path: '',
    category,
    title: '',
    date: today(),
    description: '',
    body: '',
    draft: false,
    isNew: true,
    slug: ''
  }
}

function categoryLabel(
  categories: readonly CategoryDefinition[],
  categoryId: CategoryId
): string {
  return categories.find((category) => category.id === categoryId)?.label || categoryId
}

function editableArticle(article: Article): DraftArticle {
  return { ...article, isNew: false, slug: '' }
}

export function AdminApp({ authorName = 'Jia him', canonicalGenerated = true, categories, contentSignals, siteUrl }: AdminAppProps) {
  const workspaceElement = useRef<HTMLDivElement>(null)
  const workspaceLayoutRef = useRef<WorkspaceLayout>(DEFAULT_WORKSPACE_LAYOUT)
  const activeWorkspaceResize = useRef<'sidebar' | 'content' | null>(null)
  const [mode, setMode] = useState<WorkspaceMode>('articles')
  const [settingsState, setSettingsState] = useState<SettingsWorkspaceState>({ busy: false, dirty: false, loaded: false, publishablePaths: [] })
  const settingsWorkspace = useRef<SettingsWorkspaceHandle>(null)
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [current, setCurrent] = useState<DraftArticle | null>(null)
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [compactPane, setCompactPane] = useState<CompactPane>('source')
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false)
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>(DEFAULT_WORKSPACE_LAYOUT)
  const [workspaceWidth, setWorkspaceWidth] = useState(0)
  const [workspaceResizing, setWorkspaceResizing] = useState(false)
  const [sourceFingerprint, setSourceFingerprint] = useState('')
  const [pendingDraft, setPendingDraft] = useState<DraftSnapshot | null>(null)
  const [focusLine, setFocusLine] = useState<number>()
  const [syncScroll, setSyncScroll] = useState(true)
  const [scrollEvent, setScrollEvent] = useState<SynchronizedScrollEvent | null>(null)
  const scrollRevision = useRef(0)
  const [sessionMediaPaths, setSessionMediaPaths] = useState<string[]>([])
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [gitPanelOpen, setGitPanelOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [pullRequest, setPullRequest] = useState<PullRequestSummary | null>(null)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)

  const loadArticles = useCallback(async () => {
    setLoadingList(true)

    try {
      const result = await requestJson<ArticlesResponse>('/api/articles')
      setArticles(result.articles)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '文章列表加载失败')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadGitStatus = useCallback(async (throwOnError = false) => {
    try {
      const result = await requestJson<{ status: GitStatus }>('/api/git/status')
      setGitStatus(result.status)
      setPullRequest(result.status.pullRequest || null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Git 状态加载失败')
      if (throwOnError) throw requestError
    }
  }, [])

  const refreshSettingsGitStatus = useCallback(
    () => loadGitStatus(true),
    [loadGitStatus]
  )

  useEffect(() => {
    void loadArticles()
    void loadGitStatus()
  }, [loadArticles, loadGitStatus])

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem('jiahim:sidebar-collapsed') === 'true')
    const recoveredLayout = readWorkspaceLayout(localStorage)
    workspaceLayoutRef.current = recoveredLayout
    setWorkspaceLayout(recoveredLayout)
    setSyncScroll(localStorage.getItem('jiahim:sync-scroll') !== 'false')
  }, [])

  useEffect(() => {
    const updateWorkspaceWidth = () => {
      const measuredWidth = workspaceElement.current?.getBoundingClientRect().width
      setWorkspaceWidth(measuredWidth || window.innerWidth)
    }

    updateWorkspaceWidth()
    window.addEventListener('resize', updateWorkspaceWidth)
    return () => window.removeEventListener('resize', updateWorkspaceWidth)
  }, [])

  useEffect(() => {
    if (!sidebarDrawerOpen) return

    const closeDrawer = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarDrawerOpen(false)
    }

    window.addEventListener('keydown', closeDrawer)
    return () => window.removeEventListener('keydown', closeDrawer)
  }, [sidebarDrawerOpen])

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia?.('(min-width: 761px)')
    if (!desktopBreakpoint) return

    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setSidebarDrawerOpen(false)
    }

    desktopBreakpoint.addEventListener('change', closeDrawerOnDesktop)
    return () => desktopBreakpoint.removeEventListener('change', closeDrawerOnDesktop)
  }, [])

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (dirty || settingsState.dirty) event.preventDefault()
    }

    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [dirty, settingsState.dirty])

  useEffect(() => {
    if (!current || !dirty || !sourceFingerprint) return

    const key = draftKey(current.path || 'new')
    const timer = window.setTimeout(() => {
      writeDraft(localStorage, key, {
        article: current,
        sourceFingerprint,
        savedAt: Date.now()
      })
    }, 650)

    return () => window.clearTimeout(timer)
  }, [current, dirty, sourceFingerprint])

  const wordCount = useMemo(
    () => (current ? current.body.replace(/\s+/g, '').length : 0),
    [current]
  )
  const articleFindings = useMemo(() => current ? checkArticleSeoGeo({
    title: current.title,
    description: current.description,
    date: current.date,
    updatedAt: current.updatedAt,
    canonical: current.canonical,
    body: current.body
  }, {
    canonicalOrigin: siteUrl,
    route: current.path ? articlePreviewPath(current.path) : '/',
    author: current.author || authorName,
    canonicalGenerated
  }, contentSignals) : [], [authorName, canonicalGenerated, contentSignals, current, siteUrl])

  function updateSyncScroll(enabled: boolean) {
    setSyncScroll(enabled)
    localStorage.setItem('jiahim:sync-scroll', String(enabled))
  }

  function canDiscardChanges(): boolean {
    return !dirty || window.confirm('当前修改还没有保存，确定离开吗？')
  }

  function updateSidebarCollapsed(collapsed: boolean) {
    setSidebarCollapsed(collapsed)
    localStorage.setItem('jiahim:sidebar-collapsed', String(collapsed))
  }

  const resolvedSidebarWidth = workspaceLayout.sidebarWidth === null
    ? null
    : clampSidebarWidth(workspaceLayout.sidebarWidth, workspaceWidth)
  const defaultSidebarWidth = workspaceWidth === 0
    ? 260
    : workspaceWidth <= 1180
    ? Math.min(260, Math.max(220, workspaceWidth * 0.22))
    : 300
  const layoutSidebarWidth = sidebarCollapsed ? 6 : resolvedSidebarWidth ?? defaultSidebarWidth
  const layoutSidebarHandleWidth = sidebarCollapsed ? 0 : RESIZE_HANDLE_WIDTH
  const layoutContentWidth = Math.max(
    MIN_EDITOR_WIDTH + MIN_PREVIEW_WIDTH,
    workspaceWidth
    - layoutSidebarWidth
    - layoutSidebarHandleWidth
    - RESIZE_HANDLE_WIDTH
  )
  const resolvedEditorWidth = workspaceLayout.editorRatio === null
    ? null
    : editorWidthForRatio(workspaceLayout.editorRatio, layoutContentWidth)
  const displayedEditorWidth = resolvedEditorWidth ??
    editorWidthForRatio(DEFAULT_EDITOR_RATIO, layoutContentWidth)
  const sidebarMaximum = workspaceWidth === 0
    ? MAX_SIDEBAR_WIDTH
    : clampSidebarWidth(MAX_SIDEBAR_WIDTH, workspaceWidth)
  const editorMinimumPercent = MIN_EDITOR_WIDTH / layoutContentWidth * 100
  const editorMaximumPercent = (layoutContentWidth - MIN_PREVIEW_WIDTH) /
    layoutContentWidth * 100
  const editorPercent = displayedEditorWidth / layoutContentWidth * 100

  function currentWorkspaceGeometry() {
    const workspace = workspaceElement.current
    if (!workspace) return null
    const rect = workspace.getBoundingClientRect()
    const measuredSidebar = workspace.querySelector<HTMLElement>('.article-sidebar')
      ?.getBoundingClientRect().width
    const defaultSidebar = rect.width <= 1180 ? 260 : 300
    const sidebarWidth = sidebarCollapsed
      ? 6
      : resolvedSidebarWidth ?? (measuredSidebar || defaultSidebar)
    const sidebarHandleWidth = sidebarCollapsed ? 0 : RESIZE_HANDLE_WIDTH
    const contentLeft = rect.left + sidebarWidth + sidebarHandleWidth
    const contentWidth = rect.width - sidebarWidth - sidebarHandleWidth - RESIZE_HANDLE_WIDTH

    return { rect, sidebarWidth, contentLeft, contentWidth }
  }

  function updateWorkspaceLayout(
    patch: Partial<WorkspaceLayout>,
    persist: boolean
  ) {
    const next = { ...workspaceLayoutRef.current, ...patch }
    workspaceLayoutRef.current = next
    setWorkspaceLayout(next)
    if (persist) writeWorkspaceLayout(localStorage, next)
  }

  function resizeSidebar(clientX: number) {
    const geometry = currentWorkspaceGeometry()
    if (!geometry) return
    updateWorkspaceLayout({
      sidebarWidth: clampSidebarWidth(clientX - geometry.rect.left, geometry.rect.width)
    }, false)
  }

  function stepSidebar(delta: number) {
    const geometry = currentWorkspaceGeometry()
    if (!geometry) return
    updateWorkspaceLayout({
      sidebarWidth: clampSidebarWidth(geometry.sidebarWidth + delta, geometry.rect.width)
    }, true)
  }

  function resizeContent(clientX: number, persist = false) {
    const geometry = currentWorkspaceGeometry()
    if (!geometry) return
    updateWorkspaceLayout({
      editorRatio: editorRatioAt(clientX, geometry.contentLeft, geometry.contentWidth)
    }, persist)
  }

  function stepContent(delta: number) {
    const geometry = currentWorkspaceGeometry()
    if (!geometry) return
    const measuredEditorWidth = workspaceElement.current
      ?.querySelector<HTMLElement>('.source-pane')
      ?.getBoundingClientRect().width
    const currentEditorWidth = measuredEditorWidth || resolvedEditorWidth ||
      editorWidthForRatio(DEFAULT_EDITOR_RATIO, geometry.contentWidth)
    resizeContent(geometry.contentLeft + currentEditorWidth + delta, true)
  }

  function beginWorkspaceResize(handle: 'sidebar' | 'content'): boolean {
    if (activeWorkspaceResize.current !== null) return false
    activeWorkspaceResize.current = handle
    setWorkspaceResizing(true)
    return true
  }

  function finishWorkspaceResize(handle: 'sidebar' | 'content') {
    if (activeWorkspaceResize.current !== handle) return
    activeWorkspaceResize.current = null
    setWorkspaceResizing(false)
    writeWorkspaceLayout(localStorage, workspaceLayoutRef.current)
  }

  function resetWorkspaceLayout() {
    workspaceLayoutRef.current = DEFAULT_WORKSPACE_LAYOUT
    setWorkspaceLayout(DEFAULT_WORKSPACE_LAYOUT)
    clearWorkspaceLayout(localStorage)
  }

  async function openArticle(articlePath: string): Promise<boolean> {
    if (!canDiscardChanges()) return false
    setBusy(true)
    setError('')
    setNotice('')
    setPendingDraft(null)

    try {
      const result = await requestJson<ArticleResponse>(
        '/api/article?path=' + encodeURIComponent(articlePath)
      )
      const nextArticle = editableArticle(result.article)
      const fingerprint = articleFingerprint(result.article)
      const recovered = readDraft(localStorage, draftKey(articlePath), fingerprint)

      setCurrent(nextArticle)
      setSourceFingerprint(fingerprint)
      setPendingDraft(recovered)
      setSessionMediaPaths([])
      setFocusLine(undefined)
      setDirty(false)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '文章加载失败')
      return false
    } finally {
      setBusy(false)
    }
  }

  function beginNewArticle(): boolean {
    if (!canDiscardChanges()) return false
    if (!categories.length) {
      setError('当前没有可新建文章的栏目，请先在站点设置中新增或启用栏目。')
      return false
    }
    const category = filter === 'all' ? categories[0].id : filter
    const nextArticle = createEmptyArticle(category)
    const fingerprint = articleFingerprint(nextArticle)
    const recovered = readDraft(localStorage, draftKey('new'), fingerprint)

    setCurrent(nextArticle)
    setSourceFingerprint(fingerprint)
    setPendingDraft(recovered)
    setSessionMediaPaths([])
    setDirty(false)
    setNotice('')
    setError('')
    setFocusLine(undefined)
    return true
  }

  function closeDrawerAndShowSource() {
    setSidebarDrawerOpen(false)
    setCompactPane('source')
  }

  async function openArticleFromSidebar(articlePath: string) {
    if (await openArticle(articlePath)) closeDrawerAndShowSource()
  }

  function beginNewArticleFromSidebar() {
    if (beginNewArticle()) closeDrawerAndShowSource()
  }

  function updateCurrent<K extends keyof DraftArticle>(key: K, value: DraftArticle[K]) {
    setCurrent((article) => (article ? { ...article, [key]: value } : article))
    setDirty(true)
    setNotice('')
  }

  async function saveArticle() {
    if (!current || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    const previousDraftKey = draftKey(current.path || 'new')

    try {
      const result = await requestJson<SaveResult>('/api/article', {
        method: current.isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          current.isNew
            ? {
                category: current.category,
                slug: current.slug,
                title: current.title,
                date: current.date,
                description: current.description,
                body: current.body
              }
            : {
                path: current.path,
                title: current.title,
                date: current.date,
                description: current.description,
                body: current.body,
                baseHash: sourceFingerprint
              }
        )
      })
      const nextArticle = editableArticle(result.article)
      clearDraft(localStorage, previousDraftKey)
      clearDraft(localStorage, draftKey(nextArticle.path))
      setCurrent(nextArticle)
      setSourceFingerprint(articleFingerprint(result.article))
      setPendingDraft(null)
      setDirty(false)
      setNotice(result.message)
      await Promise.all([loadArticles(), loadGitStatus()])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function uploadImage(file: File) {
    if (!current?.path) {
      setError('请先保存新文章，再上传图片。')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const formData = new FormData()
      formData.set('path', current.path)
      formData.set('file', file)
      const result = await requestJson<MediaResult>('/api/media', {
        method: 'POST',
        body: formData
      })
      const alt = file.name.replace(/\.[^.]+$/, '')
      const insertion = '\n\n![' + alt + '](' + result.publicUrl + ')\n'
      setCurrent({
        ...current,
        body: (current.body.trimEnd() + insertion).trimStart()
      })
      setSessionMediaPaths((paths) =>
        paths.includes(result.path) ? paths : [...paths, result.path]
      )
      setDirty(true)
      setNotice(result.message + ' 图片语法已插入正文，请保存文章。')
      await loadGitStatus()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '图片上传失败')
    } finally {
      setBusy(false)
    }
  }

  function restorePendingDraft() {
    if (!pendingDraft) return
    setCurrent(pendingDraft.article)
    setPendingDraft(null)
    setDirty(true)
    setNotice('已恢复本地编辑副本。')
  }

  function discardPendingDraft() {
    if (!current) return
    clearDraft(localStorage, draftKey(current.path || 'new'))
    setPendingDraft(null)
    setNotice('已放弃本地恢复副本。')
  }

  async function publishArticle(message: string) {
    if (!current?.path || dirty) return
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const result = await requestJson<PublishWorkflowResult>('/api/git/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articlePath: current.path,
          mediaPaths: sessionMediaPaths,
          message,
          date: current.date || today()
        })
      })
      setPullRequest(result)
      setPublishDialogOpen(false)
      setSessionMediaPaths([])
      setNotice(result.message)
      await loadGitStatus()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '提交并推送失败')
    } finally {
      setBusy(false)
    }
  }

  async function mergeAndPublish(expectedHeadOid: string) {
    if (!pullRequest) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const result = await requestJson<MergeWorkflowResult>('/api/git/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pullRequestNumber: pullRequest.number,
          expectedHeadOid,
          confirmed: true
        })
      })
      setPullRequest(null)
      setMergeDialogOpen(false)
      setNotice(result.message)
      await loadGitStatus()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '合并发布失败')
    } finally {
      setBusy(false)
    }
  }

  const previewUrl = current?.path
    ? siteUrl.replace(/\/$/, '') + encodeURI(articlePreviewPath(current.path))
    : siteUrl

  function changeMode(nextMode: WorkspaceMode) {
    if (nextMode === mode) return
    const activeDirty = mode === 'articles' ? dirty : settingsState.dirty
    if (activeDirty && !window.confirm('当前模式的修改还没有保存。切换后修改会保留在本地草稿中，确定继续吗？')) {
      return
    }
    setMode(nextMode)
  }

  const activeBusy = mode === 'settings' ? settingsState.busy : busy
  const activeDirty = mode === 'settings' ? settingsState.dirty : dirty
  const settingsPublishStatus = settingsState.loaded
    ? settingsPublishGuidance(
        gitStatus,
        settingsState.dirty,
        settingsState.publishablePaths.length,
        settingsState.publishBlockReason
      )
    : undefined

  function publishScroll(source: SynchronizedScrollEvent['source'], ratio: number) {
    if (!syncScroll) return
    scrollRevision.current += 1
    setScrollEvent({ source, ratio, revision: scrollRevision.current })
  }

  return (
    <main className="admin-shell">
      <WorkspaceHeader
        busy={activeBusy}
        dirty={activeDirty}
        gitStatus={gitStatus}
        hasArticle={Boolean(current)}
        mergeEnabled={Boolean(pullRequest?.headRefOid) && !busy && !dirty}
        mode={mode}
        previewUrl={current?.path ? previewUrl : undefined}
        publishEnabled={mode === 'settings'
          ? !settingsState.busy && canPublishSettings(gitStatus, settingsState.dirty, settingsState.publishablePaths.length, settingsState.publishBlockReason)
          : !busy && canPublishArticle(gitStatus, current?.path, dirty, sessionMediaPaths.length)}
        settingsLoaded={settingsState.loaded}
        settingsPublishReason={settingsPublishStatus?.message}
        onDiff={() => mode === 'settings' ? void settingsWorkspace.current?.showDiff() : setGitPanelOpen(true)}
        onMerge={() => setMergeDialogOpen(true)}
        onModeChange={changeMode}
        onPublish={() => mode === 'settings' ? settingsWorkspace.current?.openPublish() : setPublishDialogOpen(true)}
        onSave={() => mode === 'settings' ? void settingsWorkspace.current?.save() : void saveArticle()}
      />

      {mode === 'articles' && (error || notice || pendingDraft) && (
        <div className="global-status" aria-live="polite">
          {error && <p className="alert alert--error">{error}</p>}
          {notice && <p className="alert alert--success">{notice}</p>}
          {pendingDraft && (
            <div className="recovery-banner">
              <span>发现比文件更新的本地编辑副本。</span>
              <Button size="sm" variant="outline" type="button" onClick={restorePendingDraft}>恢复</Button>
              <Button size="sm" variant="ghost" type="button" onClick={discardPendingDraft}>放弃</Button>
            </div>
          )}
        </div>
      )}

      <div
        ref={workspaceElement}
        id="articles-workspace"
        role="tabpanel"
        aria-labelledby="articles-mode-tab"
        hidden={mode !== 'articles'}
        className={[
          'workspace',
          sidebarCollapsed ? 'workspace--sidebar-collapsed' : '',
          `workspace--compact-${compactPane}`,
          sidebarDrawerOpen ? 'workspace--drawer-open' : '',
          workspaceResizing ? 'workspace--resizing' : ''
        ].filter(Boolean).join(' ')}
        style={resolvedSidebarWidth === null && resolvedEditorWidth === null
          ? undefined
          : {
              ...(resolvedSidebarWidth === null
                ? {}
                : { '--sidebar-width': resolvedSidebarWidth + 'px' }),
              ...(resolvedEditorWidth === null
                ? {}
                : {
                    '--editor-width': resolvedEditorWidth + 'px',
                    '--preview-flex': '1fr'
                  })
            } as CSSProperties}
      >
        <ResponsiveWorkspaceControls
          drawerOpen={sidebarDrawerOpen}
          pane={compactPane}
          onDrawerOpenChange={setSidebarDrawerOpen}
          onPaneChange={setCompactPane}
        />
        <Button
          className="article-drawer-backdrop"
          variant="ghost"
          type="button"
          aria-label="关闭文章列表"
          onClick={() => setSidebarDrawerOpen(false)}
        />
        <ArticleSidebar
          articles={articles}
          categories={categories}
          collapsed={sidebarCollapsed && !sidebarDrawerOpen}
          currentPath={current?.path}
          filter={filter}
          loading={loadingList}
          query={query}
          onCollapsedChange={updateSidebarCollapsed}
          onFilterChange={setFilter}
          onNew={beginNewArticleFromSidebar}
          onOpen={(path) => void openArticleFromSidebar(path)}
          onQueryChange={setQuery}
        />
        <WorkspaceResizeHandle
          className="workspace-resize-handle--sidebar"
          label="调整文章列表宽度"
          max={sidebarMaximum}
          min={MIN_SIDEBAR_WIDTH}
          value={resolvedSidebarWidth ?? defaultSidebarWidth}
          valueText={Math.round(resolvedSidebarWidth ?? defaultSidebarWidth) + ' 像素'}
          onReset={resetWorkspaceLayout}
          onResize={resizeSidebar}
          onResizeEnd={() => finishWorkspaceResize('sidebar')}
          onResizeStart={() => beginWorkspaceResize('sidebar')}
          onStep={stepSidebar}
        />
        <WorkspaceResizeHandle
          className="workspace-resize-handle--content"
          label="调整编辑与预览比例"
          max={editorMaximumPercent}
          min={editorMinimumPercent}
          value={editorPercent}
          valueText={'编辑区 ' + Math.round(editorPercent) + '%'}
          onReset={resetWorkspaceLayout}
          onResize={resizeContent}
          onResizeEnd={() => finishWorkspaceResize('content')}
          onResizeStart={() => beginWorkspaceResize('content')}
          onStep={stepContent}
        />

        {current ? (
          <>
            <EditorPane
              article={current}
              busy={busy}
              categories={categories}
              focusLine={focusLine}
              remoteScrollRatio={scrollEvent?.source === 'preview' ? scrollEvent.ratio : undefined}
              remoteScrollRevision={scrollEvent?.source === 'preview' ? scrollEvent.revision : undefined}
              wordCount={wordCount}
              onChange={updateCurrent}
              onSave={() => void saveArticle()}
              onScrollRatio={(ratio) => publishScroll('editor', ratio)}
              onUpload={(file) => void uploadImage(file)}
            />
            <PreviewPane
              body={current.body}
              categoryLabel={categoryLabel(categories, current.category)}
              date={current.date}
              description={current.description}
              findings={articleFindings}
              siteUrl={siteUrl}
              syncScroll={syncScroll}
              title={current.title}
              remoteScrollRatio={scrollEvent?.source === 'editor' ? scrollEvent.ratio : undefined}
              remoteScrollRevision={scrollEvent?.source === 'editor' ? scrollEvent.revision : undefined}
              onScrollRatio={(ratio) => publishScroll('preview', ratio)}
              onSelectLine={setFocusLine}
              onSyncScrollChange={updateSyncScroll}
            />
          </>
        ) : (
          <>
            <section className="source-pane source-pane--empty">
              <div className="empty-editor">
                <span className="empty-editor__mark" aria-hidden="true">✦</span>
                <h1>选择一篇文章，或者从空白开始</h1>
                <p>保存到本地文件，再用 Git 检查、提交和发布。</p>
                <Button type="button" onClick={beginNewArticle}>
                  新建文章
                </Button>
              </div>
            </section>
            <aside className="preview-pane preview-pane--empty" aria-label="文章预览与大纲">
              <p>选择文章后，这里会实时显示预览与大纲。</p>
            </aside>
          </>
        )}
      </div>

      <SettingsWorkspace
        active={mode === 'settings'}
        defaultBranch={gitStatus?.defaultBranch}
        gitRemote={gitStatus?.remote}
        ref={settingsWorkspace}
        representativePath={articles.find((article) => !article.draft)?.path ? articlePreviewPath(articles.find((article) => !article.draft)!.path) : '/zh/'}
        siteUrl={siteUrl}
        publishGuidance={settingsPublishStatus}
        onGitStatusRefresh={refreshSettingsGitStatus}
        onStateChange={setSettingsState}
      />

      <GitPanel
        open={gitPanelOpen}
        articlePath={current?.path}
        onClose={() => setGitPanelOpen(false)}
      />

      <MergeDialog busy={busy} open={mergeDialogOpen} pullRequest={pullRequest} onClose={() => setMergeDialogOpen(false)} onConfirm={(expectedHeadOid) => void mergeAndPublish(expectedHeadOid)} />

      {current?.path && (
        <PublishDialog
          open={publishDialogOpen}
          articlePath={current.path}
          busy={busy}
          mediaPaths={sessionMediaPaths}
          title={current.title}
          onClose={() => setPublishDialogOpen(false)}
          onConfirm={(message) => void publishArticle(message)}
        />
      )}
    </main>
  )
}
