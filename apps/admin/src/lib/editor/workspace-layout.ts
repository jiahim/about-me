export const WORKSPACE_LAYOUT_STORAGE_KEY = 'jiahim:workspace-layout:v1'
export const MIN_SIDEBAR_WIDTH = 220
export const MAX_SIDEBAR_WIDTH = 420
export const MIN_EDITOR_WIDTH = 420
export const MIN_PREVIEW_WIDTH = 320
export const RESIZE_HANDLE_WIDTH = 6
export const DEFAULT_EDITOR_RATIO = 0.6

export interface WorkspaceLayout {
  sidebarWidth: number | null
  editorRatio: number | null
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = {
  sidebarWidth: null,
  editorRatio: null
}

export function readWorkspaceLayout(storage: Storage): WorkspaceLayout {
  const serialized = storage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)
  if (!serialized) return DEFAULT_WORKSPACE_LAYOUT

  try {
    const value = JSON.parse(serialized) as Partial<WorkspaceLayout>
    const sidebarWidth = typeof value.sidebarWidth === 'number' &&
      Number.isFinite(value.sidebarWidth) &&
      value.sidebarWidth >= MIN_SIDEBAR_WIDTH &&
      value.sidebarWidth <= MAX_SIDEBAR_WIDTH
      ? value.sidebarWidth
      : null
    const editorRatio = typeof value.editorRatio === 'number' &&
      Number.isFinite(value.editorRatio) &&
      value.editorRatio > 0 &&
      value.editorRatio < 1
      ? value.editorRatio
      : null

    return { sidebarWidth, editorRatio }
  } catch {
    return DEFAULT_WORKSPACE_LAYOUT
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function clampSidebarWidth(width: number, workspaceWidth: number): number {
  const availableMaximum = workspaceWidth
    - MIN_EDITOR_WIDTH
    - MIN_PREVIEW_WIDTH
    - RESIZE_HANDLE_WIDTH * 2
  const maximum = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, availableMaximum))
  return Math.round(clamp(width, MIN_SIDEBAR_WIDTH, maximum))
}

export function editorRatioAt(
  clientX: number,
  contentLeft: number,
  contentWidth: number
): number {
  const editorWidth = clamp(
    clientX - contentLeft,
    MIN_EDITOR_WIDTH,
    contentWidth - MIN_PREVIEW_WIDTH
  )
  return editorWidth / contentWidth
}

export function editorWidthForRatio(ratio: number, contentWidth: number): number {
  return Math.round(clamp(
    ratio * contentWidth,
    MIN_EDITOR_WIDTH,
    contentWidth - MIN_PREVIEW_WIDTH
  ))
}

export function writeWorkspaceLayout(storage: Storage, layout: WorkspaceLayout): void {
  storage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(layout))
}

export function clearWorkspaceLayout(storage: Storage): void {
  storage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY)
}
