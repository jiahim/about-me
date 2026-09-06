import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

interface WorkspaceResizeHandleProps {
  className: string
  label: string
  max: number
  min: number
  value: number
  valueText: string
  onReset: () => void
  onResize: (clientX: number) => void
  onResizeEnd: () => void
  onResizeStart: () => boolean
  onStep: (delta: number) => void
}

export function WorkspaceResizeHandle({
  className,
  label,
  max,
  min,
  value,
  valueText,
  onReset,
  onResize,
  onResizeEnd,
  onResizeStart,
  onStep
}: WorkspaceResizeHandleProps) {
  const activePointer = useRef<number | null>(null)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.isPrimary === false || activePointer.current !== null) return
    if (!onResizeStart()) return
    activePointer.current = event.pointerId
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    if (Number.isFinite(event.clientX)) onResize(event.clientX)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== event.pointerId) return
    if (Number.isFinite(event.clientX)) onResize(event.clientX)
  }

  function finishPointerResize(event: PointerEvent<HTMLDivElement>, releaseCapture = true) {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    const canRelease = event.currentTarget.hasPointerCapture
      ? event.currentTarget.hasPointerCapture(event.pointerId)
      : true
    if (releaseCapture && canRelease) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    onResizeEnd()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    onStep(event.key === 'ArrowLeft' ? -8 : 8)
  }

  return (
    <div
      className={'workspace-resize-handle ' + className}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={Math.round(max)}
      aria-valuemin={Math.round(min)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      tabIndex={0}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      onPointerCancel={finishPointerResize}
      onPointerDown={handlePointerDown}
      onLostPointerCapture={(event) => finishPointerResize(event, false)}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointerResize}
    />
  )
}
