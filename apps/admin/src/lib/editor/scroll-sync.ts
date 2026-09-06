type ScrollMetrics = Pick<HTMLElement, 'scrollHeight' | 'clientHeight'>
type ScrollPosition = ScrollMetrics & Pick<HTMLElement, 'scrollTop'>

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function scrollRatio(element: ScrollPosition): number {
  const distance = element.scrollHeight - element.clientHeight
  if (distance <= 0) return 0
  return clampRatio(element.scrollTop / distance)
}

export function scrollTopForRatio(
  element: ScrollMetrics,
  ratio: number
): number {
  const distance = Math.max(0, element.scrollHeight - element.clientHeight)
  return distance * clampRatio(ratio)
}
