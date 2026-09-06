'use client'

import { Button } from '@/components/ui/button'
import type { FontSizePreference } from '@/lib/editor/font-size-preference'

interface FontSizeControlProps {
  label: string
  level: FontSizePreference
  valueLabel: string
  onDecrease: () => void
  onIncrease: () => void
}

export function FontSizeControl({
  label,
  level,
  valueLabel,
  onDecrease,
  onIncrease
}: FontSizeControlProps) {
  return (
    <div className="font-size-control" role="group" aria-label={label}>
      <Button
        aria-label={`减小${label}`}
        disabled={level === 'small'}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onDecrease}
      >
        A−
      </Button>
      <output aria-label={`${label}当前值`}>{valueLabel}</output>
      <Button
        aria-label={`增大${label}`}
        disabled={level === 'large'}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onIncrease}
      >
        A+
      </Button>
    </div>
  )
}
