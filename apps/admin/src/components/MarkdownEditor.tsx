'use client'

import { useEffect, useMemo, useRef } from 'react'
import { markdown } from '@codemirror/lang-markdown'
import type { KeyBinding } from '@codemirror/view'
import { EditorView, keymap } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

import { useAdminTheme } from '@/components/theme-provider'
import { scrollRatio, scrollTopForRatio } from '@/lib/editor/scroll-sync'

export function createSaveKeyBinding(onSave: () => void): KeyBinding {
  return {
    key: 'Mod-s',
    preventDefault: true,
    run: () => {
      onSave()
      return true
    }
  }
}

interface MarkdownEditorProps {
  focusLine?: number
  remoteScrollRatio?: number
  remoteScrollRevision?: number
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onScrollRatio?: (ratio: number) => void
}

export function MarkdownEditor({
  focusLine,
  remoteScrollRatio,
  remoteScrollRevision,
  value,
  onChange,
  onSave,
  onScrollRatio
}: MarkdownEditorProps) {
  const { resolvedTheme } = useAdminTheme()
  const viewRef = useRef<EditorView | null>(null)
  const onScrollRatioRef = useRef(onScrollRatio)
  const removeScrollListenerRef = useRef<(() => void) | null>(null)
  const suppressScrollRef = useRef(false)
  const lastRemoteRevisionRef = useRef(0)
  const extensions = useMemo(
    () => [
      markdown({ completeHTMLTags: false }),
      EditorView.lineWrapping,
      keymap.of([createSaveKeyBinding(onSave)]),
      EditorView.theme({
        '&': {
          height: '100%',
          backgroundColor: 'transparent',
          fontSize: 'var(--editor-source-font-size)'
        },
        '.cm-scroller': {
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
          lineHeight: '1.8',
          padding: '12px 0 40px'
        },
        '.cm-content': {
          padding: '0 22px'
        },
        '.cm-gutters': {
          backgroundColor: 'transparent',
          border: '0',
          color: 'var(--muted-foreground)'
        },
        '.cm-activeLine, .cm-activeLineGutter': {
          backgroundColor: 'color-mix(in srgb, var(--forest) 10%, transparent)'
        },
        '&.cm-focused': {
          outline: 'none'
        }
      })
    ],
    [onSave]
  )

  useEffect(() => {
    onScrollRatioRef.current = onScrollRatio
  }, [onScrollRatio])

  useEffect(() => () => {
    removeScrollListenerRef.current?.()
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (
      !view ||
      remoteScrollRatio === undefined ||
      remoteScrollRevision === undefined ||
      remoteScrollRevision <= lastRemoteRevisionRef.current
    ) {
      return
    }

    lastRemoteRevisionRef.current = remoteScrollRevision
    suppressScrollRef.current = true
    view.scrollDOM.scrollTop = scrollTopForRatio(
      view.scrollDOM,
      remoteScrollRatio
    )
    window.requestAnimationFrame(() => {
      suppressScrollRef.current = false
    })
  }, [remoteScrollRatio, remoteScrollRevision])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !focusLine) return

    const line = view.state.doc.line(
      Math.min(Math.max(1, focusLine), view.state.doc.lines)
    )
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' })
    })
    view.focus()
  }, [focusLine])

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={resolvedTheme}
      basicSetup={{
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: false,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        history: true,
        lineNumbers: true,
        searchKeymap: true
      }}
      extensions={extensions}
      onChange={onChange}
      onCreateEditor={(view) => {
        removeScrollListenerRef.current?.()
        viewRef.current = view
        const publishScroll = () => {
          if (suppressScrollRef.current) return
          onScrollRatioRef.current?.(scrollRatio(view.scrollDOM))
        }
        view.scrollDOM.addEventListener('scroll', publishScroll, { passive: true })
        removeScrollListenerRef.current = () => {
          view.scrollDOM.removeEventListener('scroll', publishScroll)
        }
      }}
      aria-label="Markdown 正文"
    />
  )
}
