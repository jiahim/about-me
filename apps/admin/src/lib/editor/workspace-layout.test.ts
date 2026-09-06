import { beforeEach, describe, expect, it } from 'vitest'

import {
  clampSidebarWidth,
  editorRatioAt,
  readWorkspaceLayout,
  WORKSPACE_LAYOUT_STORAGE_KEY
} from './workspace-layout'

beforeEach(() => localStorage.clear())

describe('workspace layout', () => {
  it('ignores corrupted and out-of-range persisted dimensions', () => {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, '{not json')
    expect(readWorkspaceLayout(localStorage)).toEqual({
      sidebarWidth: null,
      editorRatio: null
    })

    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify({
      sidebarWidth: 80,
      editorRatio: 1.4
    }))
    expect(readWorkspaceLayout(localStorage)).toEqual({
      sidebarWidth: null,
      editorRatio: null
    })
  })

  it('reserves the editor and preview minimum widths when clamping the sidebar', () => {
    expect(clampSidebarWidth(500, 1098)).toBe(346)
    expect(clampSidebarWidth(100, 1400)).toBe(220)
    expect(clampSidebarWidth(500, 1400)).toBe(420)
  })

  it('clamps the editor divider against both content minimums', () => {
    expect(editorRatioAt(100, 0, 976)).toBeCloseTo(420 / 976)
    expect(editorRatioAt(900, 0, 976)).toBeCloseTo(656 / 976)
  })
})
